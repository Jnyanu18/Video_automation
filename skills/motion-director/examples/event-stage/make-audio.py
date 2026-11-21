#!/usr/bin/env python3
"""EVENT STUDIO: original deterministic 120-BPM electronic motion score.

All oscillators/noise are synthesized here. No reference soundtrack, samples,
licensed media, provider requests, or narration. Visual cues come from project.json.
Requires NumPy and FFmpeg/ffprobe. Writes only the score and its measurement report.
"""
from pathlib import Path
import hashlib, json, math, re, subprocess, wave
import numpy as np
from audio_timing import resolve_event_cues

ROOT = Path(__file__).resolve().parent
PROJECT = json.loads((ROOT / 'project.json').read_text())
SR = 48000
FPS = PROJECT['fps']
SECONDS = PROJECT['durationInFrames'] / FPS
BPM = PROJECT['audio']['bpm']
PHASE = PROJECT['audio']['beatPhaseFrame'] / FPS
BEAT = 60 / BPM
N = round(SECONDS * SR)
SEED = 6821973
RNG = np.random.default_rng(SEED)
MUSIC, FX = np.zeros((N, 2)), np.zeros((N, 2))
COUNTS, CUES = {}, []

def hz(m): return 440 * 2 ** ((m - 69) / 12)
def db(x): return 20 * math.log10(max(float(x), 1e-15))

def env(n, attack=.003, release=.03):
    a, r = min(n, max(1, round(attack*SR))), min(n, max(1, round(release*SR)))
    e = np.ones(n)
    e[:a] *= np.sin(np.linspace(0, math.pi/2, a))**2
    e[-r:] *= np.cos(np.linspace(0, math.pi/2, r))**2
    return e

def noise(seconds, low=500, high=9000):
    n = round(seconds*SR)
    freqs = np.fft.rfftfreq(n, 1/SR)
    curve = (1-np.exp(-(freqs/max(low, 1))**4)) * np.exp(-(freqs/high)**4)
    x = np.fft.irfft(np.fft.rfft(RNG.standard_normal(n))*curve, n)
    return x/max(1e-12, float(np.sqrt(np.mean(x*x))))

def add(bus, x, seconds, gain, pan=0, name=None):
    start = round(seconds*SR)
    if start < 0: raise ValueError('Negative cue start, resolve against event ledger')
    count = min(len(x), N-start)
    if count <= 0: return
    if x.ndim == 1:
        angle = (pan+1)*math.pi/4
        x = x[:,None]*np.array([math.cos(angle), math.sin(angle)])
    bus[start:start+count] += gain*x[:count]
    if name: COUNTS[name] = COUNTS.get(name,0)+1

def kick():
    t = np.arange(round(.31*SR))/SR
    freq = 48+125*np.exp(-t/.014)
    body = np.sin(2*math.pi*np.cumsum(freq)/SR)*np.exp(-t/.073)
    contact = .055*noise(.31, 1700, 6300)*np.exp(-t/.003)
    return (body+contact)*env(len(t), .0007, .03)

def clap():
    t = np.arange(round(.20*SR))/SR
    p = np.exp(-t/.019)
    p += np.where(t>.010, .65*np.exp(-np.maximum(0,t-.010)/.025),0)
    p += np.where(t>.021, .45*np.exp(-np.maximum(0,t-.021)/.033),0)
    x = noise(.20,1100,7400)*p
    x += .11*np.sin(2*math.pi*185*t)*np.exp(-t/.023)
    return x*env(len(t),.0007,.025)

def hat(opened=False):
    duration=.17 if opened else .065
    t=np.arange(round(duration*SR))/SR
    return noise(duration,6500,13500)*np.exp(-t/(.048 if opened else .009))*env(len(t),.0005,.02)

def bass(midi, duration=.26):
    t=np.arange(round(duration*SR))/SR; f=hz(midi)
    x=np.sin(2*math.pi*f*t)
    for harmonic, gain in [(2,.34),(3,.15),(4,.055)]:
        x += gain*np.sin(2*math.pi*f*harmonic*t)*np.exp(-t/.10)
    return np.tanh(x*1.2)/1.2*np.exp(-t/.22)*env(len(t),.004,.05)

def pluck(midi, duration=.8):
    t=np.arange(round(duration*SR))/SR; f=hz(midi)
    x=np.sin(2*math.pi*f*t+.7*np.sin(2*math.pi*f*2*t)*np.exp(-t/.045))
    x += .15*np.sin(2*math.pi*f*2.003*t)*np.exp(-t/.12)
    return x*np.exp(-t/.19)*env(len(t),.004,.14)

def chord(notes, duration=1.5, attack=.012):
    t=np.arange(round(duration*SR))/SR; x=np.zeros((len(t),2))
    for j,note in enumerate(notes):
        f=hz(note); phase=RNG.uniform(0,2*math.pi)
        for ch,detune in enumerate([.9992,1.0008]):
            voice=np.zeros(len(t))
            for h in range(1,7):
                voice += np.sin(2*math.pi*f*detune*h*t+phase)/h*np.exp(-t*h/.62)
            x[:,ch] += voice/len(notes)
    return np.tanh(x)*env(len(t),attack,.25)[:,None]

def impact():
    t=np.arange(round(.30*SR))/SR
    freq=58+130*np.exp(-t/.016)
    x=.7*np.sin(2*math.pi*np.cumsum(freq)/SR)*np.exp(-t/.06)
    x += .27*noise(.30,600,9000)*np.exp(-t/.014)
    x += .13*np.sin(2*math.pi*970*t)*np.exp(-t/.008)
    return x*env(len(t),.0007,.05)

def tick():
    t=np.arange(round(.085*SR))/SR
    x=.65*np.sin(2*math.pi*(390*t+90*.007*(1-np.exp(-t/.007))))*np.exp(-t/.010)
    x += .20*noise(.085,2800,10000)*np.exp(-t/.004)
    return x*env(len(t),.0006,.02)

def whoosh():
    # Crest lands exactly 18 visual frames after start (0.3s at60FPS).
    lead, tail = 18/FPS, 12/FPS
    n, a = round((lead+tail)*SR), round(lead*SR)
    e=np.concatenate([np.sin(np.linspace(0,math.pi/2,a,endpoint=False))**2,
                      np.cos(np.linspace(0,math.pi/2,n-a))**2])
    t=np.arange(n)/SR
    x=noise(lead+tail,700,8500)*e*(.87+.13*np.sin(2*math.pi*16*t))
    return x,lead

def write_pcm24(path,x):
    if np.max(np.abs(x))>=1: raise ValueError('Master would clip')
    values=np.rint(x*(2**23-1)).astype(np.int32).astype(np.uint32).reshape(-1)
    bytes24=np.column_stack([values&255,(values>>8)&255,(values>>16)&255]).astype(np.uint8)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2);w.setsampwidth(3);w.setframerate(SR);w.writeframes(bytes24.tobytes())

def measure(path):
    p=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True,check=True)
    s=p.stderr.rsplit('Summary:',1)[-1]
    return {'integratedLufs':float(re.search(r'I:\s*([-\d.]+) LUFS',s).group(1)),
            'truePeakDbtp':float(re.search(r'Peak:\s*([-\d.]+) dBFS',s).group(1))}

def main():
    # Original Dorian/minor9 progression and offbeat pluck figure, no song quote.
    harmonic_states=[(33,[57,60,64,67,71],[76,79,83,79]),
                     (29,[57,60,64,67],[76,72,79,76]),
                     (26,[57,60,64,69],[77,76,72,69]),
                     (31,[55,59,62,69],[74,79,81,79]),
                     (33,[57,60,64,71],[76,79,83,84]),
                     (33,[57,60,64,71],[83,79,76,71])]
    sections=[(scene['from']/FPS,(scene['from']+scene['durationInFrames'])/FPS,*harmony)
              for scene,harmony in zip(PROJECT['scenes'],harmonic_states)]
    markers={event['id']:event['frame']/FPS for event in PROJECT['events']}
    logo_time=markers['logo-arrival']
    for sec,(start,end,root,notes,melody) in enumerate(sections):
        closing=sec==5
        add(MUSIC,chord(notes,2.3 if closing else min(1.55,end-start+.2),.045 if closing else .012),start,.13 if closing else .095,0,'wide-chord')
        # Syncopated bass offers weight without swallowing the picture accents.
        for index,offset in enumerate([0,.375,.75,1.25,1.5,1.875,2.25,2.625]):
            at=start+offset
            if at>=end-.12 or (closing and index>0):continue
            midi=root+(12 if index in [2,5] else 7 if index==6 else 0)
            add(MUSIC,bass(midi,.40 if closing else .25),at,.28 if index==0 else .18,0,'bass')
        offsets=[.25,.875,1.25,1.75,2.125,2.625]
        if sec==0:offsets=[.25,1.25]
        if closing:offsets=[.25,.75]
        for i,offset in enumerate(offsets):
            at=start+offset
            if at>=end-.2:continue
            x=pluck(melody[i%4],1 if closing else .8)
            pan=(-.46,.40,-.22,.28)[i%4]
            add(MUSIC,x,at,.063 if not closing else .052,pan,'pluck')
            # Dotted eighth stereo echo (tempo-derived, decaying) stays sparse.
            add(MUSIC,x,at+BEAT*.75,.011,-pan)
            add(MUSIC,x,at+BEAT*1.5,.004,pan)
        # Interior chord stabs drive the body while the initial idea breathes.
        if 0<sec<5:
            for off in [.75,1.75,2.25]:
                if start+off<end-.2:add(MUSIC,chord(notes,.65),start+off,.045,0,'offbeat-chord')

    # Authored beat phase=0. Peak body uses four-on-floor with light syncopation.
    for i in range(math.ceil(SECONDS/BEAT)):
        at=PHASE+i*BEAT
        if at>=logo_time:break
        gain=.26 if at<markers['stage-unfold'] else .31
        add(MUSIC,kick(),at,gain,0,'kick')
        if i%2==1:add(MUSIC,clap(),at,.065 if at<markers['lights'] else .085,.03,'clap')
        if at>=1.5 and at+BEAT*.5<logo_time:
            add(MUSIC,hat(opened=i%4==3),at+BEAT*.5,.020 if at<markers['detail-burst'] else .028,.25 if i%2 else -.25,'hat')
        if markers['detail-burst']<=at<logo_time-BEAT:
            add(MUSIC,hat(),at+BEAT*.75,.008,-.45,'ghost-hat')
    # Logo contact resolves on the authored half-second downbeat; no drums after.
    add(MUSIC,kick(),logo_time,.22,0,'logo-kick')
    add(MUSIC,pluck(88,1.6),logo_time,.035,.2,'closing-tone')

    # Actual synthesis and the retime test use the same pure event resolver.
    CUES.extend(resolve_event_cues(PROJECT))
    for index,cue in enumerate(CUES):
        pan=-.12 if index%2 else .12
        kind=cue['kind'];start=cue['cueStartSeconds']
        if kind=='whoosh':
            x,_=whoosh();add(FX,x,start,.032,pan,'event-whoosh')
        elif kind=='impact':
            add(FX,impact(),start,.17 if cue['eventId']=='logo-arrival' else .13,pan,'event-impact')
        elif kind=='tick':
            add(FX,tick(),start,.085,pan,'event-tick')
    # Small event-linked music duck for focal heavy attacks.
    for event in PROJECT['events']:
        if 'impact' not in event['sound']:continue
        first=max(0,round((event['frame']/FPS-.02)*SR));last=min(N,round((event['frame']/FPS+.11)*SR))
        u=np.linspace(-1,1,last-first)
        MUSIC[first:last]*=(1-.17*np.cos(u*math.pi/2)**2)[:,None]

    mix=MUSIC+FX
    freqs=np.fft.rfftfreq(N,1/SR)
    hp=np.zeros_like(freqs);hp[1:]=1/np.sqrt(1+(27/freqs[1:])**8)
    mix=np.fft.irfft(np.fft.rfft(mix,axis=0)*hp[:,None],n=N,axis=0)
    # Gentle zero-memory saturation rounds combined synth/drum crests.
    mix=np.tanh(mix*5.5)/5.5
    master=np.ones(N);a=round(.008*SR);r=round(.65*SR)
    master[:a]=np.sin(np.linspace(0,math.pi/2,a))**2
    master[-r:]=np.cos(np.linspace(0,math.pi/2,r))**2
    mix*=master[:,None];mix[0]=0;mix[-1]=0
    gain=min(10**(-18/20)/np.sqrt(np.mean(mix*mix)),10**(-1.5/20)/np.abs(mix).max())
    mix*=gain
    path=ROOT/'public'/'event-stage-score.wav'
    path.parent.mkdir(exist_ok=True)
    write_pcm24(path,mix)
    initial=measure(path)
    additional=min(-14.5-initial['integratedLufs'],-1.2-initial['truePeakDbtp'])
    mix*=10**(additional/20)
    write_pcm24(path,mix)
    measured=measure(path)
    # Re-read actual PCM24 bytes before claiming bounds and exact sample count.
    with wave.open(str(path),'rb') as w:
        header={'sampleRate':w.getframerate(),'channels':w.getnchannels(),'sampleWidthBytes':w.getsampwidth(),'samplesPerChannel':w.getnframes()}
        b=np.frombuffer(w.readframes(w.getnframes()),dtype=np.uint8).reshape(-1,3).astype(np.int32)
    v=b[:,0]|b[:,1]<<8|b[:,2]<<16
    v=np.where(v&0x800000,v-0x1000000,v)
    decoded=v.reshape(-1,2)/(2**23)
    assert header=={'sampleRate':SR,'channels':2,'sampleWidthBytes':3,'samplesPerChannel':N}
    assert np.isfinite(decoded).all() and np.all(decoded[0]==0) and np.all(decoded[-1]==0)
    assert measured['truePeakDbtp']<=-1.0 and np.max(np.abs(decoded))<1
    assert len({e['id'] for e in PROJECT['events']})==len(PROJECT['events'])
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_name,sample_rate,channels,bits_per_sample,duration:format=duration','-of','json',str(path)],capture_output=True,text=True,check=True).stdout)
    report={'projectId':PROJECT['id'],'revision':PROJECT['revision'],'skillVersion':PROJECT['skillVersion'],
            'file':'public/event-stage-score.wav','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'origin':'Original deterministic oscillator/noise composition, synthesis and mix',
            'seed':SEED,'downloadedMedia':False,'providerCalls':False,'voiceover':False,
            'style':'Original tight electronic house groove; rounded kick/bass, crisp claps, offbeat chords, spacious plucks and event-linked movement accents',
            'durationSeconds':SECONDS,'sampleRate':SR,'channels':2,'encoding':'PCM signed24 little-endian WAV','samplesPerChannel':N,
            'bpm':BPM,'beatPhaseFrame':PROJECT['audio']['beatPhaseFrame'],'visualFps':FPS,
            'sceneBoundaryFrames':[s['from'] for s in PROJECT['scenes']]+[PROJECT['durationInFrames']],
            'events':CUES,'soundCounts':COUNTS,'measuredIntegratedLufs':measured['integratedLufs'],
            'measuredTruePeakDbtp':measured['truePeakDbtp'],'decodedSamplePeakDbfs':db(np.max(np.abs(decoded))),
            'decodedRmsDbfs':db(np.sqrt(np.mean(decoded*decoded))),'channelPeakDbfs':[db(np.max(np.abs(decoded[:,i]))) for i in range(2)],
            'firstAndLastSamplesAreZero':True,'endingFadeSeconds':.65,'initialMeasurement':initial,'masterGainDb':db(gain)+additional,
            'masterProcessing':['27Hz infrasonic cleanup','Gentle tanh crest rounding','Measured final gain with -1.2dBTP ceiling','8ms entrance and650ms ending fades'],
            'ffprobe':probe,'verification':['Script executed','Read back PCM24 duration/channel/sample count','Finite samples with first/last zero','FFmpeg ebur128 integrated LUFS and oversampled true peak','Cues dynamically read from canonical project event ledger'],
            'limitations':['No human listening review performed','Authored cue/beat arithmetic is not a perceptual playback assessment','Event onset and whoosh envelope markers differ from noisy waveform sample peaks']}
    (ROOT/'audio-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['file','durationSeconds','sampleRate','channels','measuredIntegratedLufs','measuredTruePeakDbtp','decodedSamplePeakDbfs']}))

if __name__=='__main__':main()

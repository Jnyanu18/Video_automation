from pathlib import Path
import numpy as np
from scipy.signal import butter,sosfilt
from PIL import Image
import wave,subprocess

base=Path(__file__).parent/'public';sr=48000;duration=15.;beat=60/128
rng=np.random.default_rng(2056);out=np.zeros((int(sr*duration),2),dtype=np.float64)
def add(sound,at,gain=1,pan=0):
    k=round(at*sr);n=min(len(sound),len(out)-k)
    if n<=0:return
    out[k:k+n,0]+=sound[:n]*gain*(1-max(0,pan)*.5)
    out[k:k+n,1]+=sound[:n]*gain*(1+min(0,pan)*.5)

for i in range(32):
    at=i*beat
    if at>=duration:break
    t=np.arange(int(.38*sr))/sr
    phase=2*np.pi*(46*t+54*.026*(1-np.exp(-t/.026)))
    kick=np.sin(phase)*np.exp(-t*13)+rng.normal(0,.11,len(t))*np.exp(-t*130)
    add(kick,at,.63 if i<28 else .48)
    if i%4 in [1,3]:
        t=np.arange(int(.21*sr))/sr;n=rng.normal(0,1,len(t));n=sosfilt(butter(2,1300,fs=sr,btype='high',output='sos'),n)
        snare=(n*.42+np.sin(2*np.pi*182*t)*.16)*np.exp(-t*26)
        add(snare,at,.34)
    if i%4==0:
        t=np.arange(int(.34*sr))/sr;freq=[55,55,65.406,49][(i//4)%4]
        bass=(np.sin(2*np.pi*freq*t)+.22*np.sin(2*np.pi*freq*2*t))*np.exp(-t*9)*(1-np.exp(-t*35))
        add(bass,at+.10,.22)
    for off in [0,.5]:
        t=np.arange(int(.065*sr))/sr;n=rng.normal(0,1,len(t));n=sosfilt(butter(2,6500,fs=sr,btype='high',output='sos'),n)
        hat=n*np.exp(-t*75);add(hat,at+off*beat,.055 if off else .035,(-1 if i%2 else 1)*.35)

for at in [1.72,3.59,5.47,7.34,9.22,11.09,12.97]:
    t=np.arange(int(.19*sr))/sr;n=rng.normal(0,1,len(t));n=sosfilt(butter(2,[1000,9000],fs=sr,btype='band',output='sos'),n)
    add(n*np.sin(np.pi*t/.19)**2,at,.13)
for at in [.44,.95,1.20]:
    t=np.arange(int(.16*sr))/sr;hit=np.sin(2*np.pi*(120*t-190*t*t))*np.exp(-t*38);add(hit,at,.24)
out=np.tanh(out*1.5);out*=np.minimum(1,np.arange(len(out))/(sr*.008))[:,None]
out*=np.minimum(1,(len(out)-np.arange(len(out)))/(sr*.35))[:,None]
out*=.88/np.max(np.abs(out))
wav=base/'percussion-source.wav'
with wave.open(str(wav),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-v','error','-i',str(wav),'-af','loudnorm=I=-15:TP=-1.5:LRA=7','-ar','48000','-b:a','192k','-y',str(base/'percussion.mp3')],check=True)
wav.unlink()
grain=rng.integers(0,256,(320,320),dtype=np.uint8);Image.fromarray(grain).save(base/'grain.png')
print('Original 128 BPM percussion and seeded grain generated.')

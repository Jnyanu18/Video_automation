/** Server-side adapter example. Calling this script consumes the user's provider quota. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [input,output]=process.argv.slice(2);
const apiKey=process.env.ELEVENLABS_API_KEY;
const voiceId=process.env.ELEVENLABS_VOICE_ID;
if(!input||!output||!apiKey||!voiceId)throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID; use: node scripts/elevenlabs-voiceover.mjs pending.json updated.json');
const project=JSON.parse(await readFile(input,'utf8'));
if(project.audio?.voiceover?.status!=='pending'||!project.audio.voiceover.text.trim())throw new Error('Project must have a pending voiceover script.');
const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,{
  method:'POST',headers:{'xi-api-key':apiKey,'content-type':'application/json'},
  body:JSON.stringify({text:project.audio.voiceover.text,model_id:process.env.ELEVENLABS_MODEL_ID??'eleven_multilingual_v2'}),
  signal:AbortSignal.timeout(180000),
});
if(!res.ok)throw new Error(`ElevenLabs failed: HTTP ${res.status}; handle rate limits/billing in the host. No automatic paid retry was attempted.`);
const data=await res.json();
if(typeof data.audio_base64!=='string'||!data.audio_base64)throw new Error('No audio returned.');
const alignment=data.normalized_alignment??data.alignment;
if(!alignment||!Array.isArray(alignment.characters)||!Array.isArray(alignment.character_start_times_seconds)||!Array.isArray(alignment.character_end_times_seconds))throw new Error('Expected character-level alignment.');
const chars=alignment.characters,starts=alignment.character_start_times_seconds,ends=alignment.character_end_times_seconds;
if(chars.length!==starts.length||chars.length!==ends.length||starts.some((s,i)=>!Number.isFinite(s)||s<0||!Number.isFinite(ends[i])||ends[i]<s||(i>0&&s<starts[i-1])))throw new Error('Invalid alignment arrays.');
const bytes=Buffer.from(data.audio_base64,'base64');
const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
const id=`vo-${hash}`;
const dir=fileURLToPath(new URL('../starter/public/assets/',import.meta.url));
await mkdir(dir,{recursive:true});
const audioFile=join(dir,`${id}.mp3`),alignmentFile=join(dir,`${id}.alignment.json`);
await writeFile(audioFile,bytes);await writeFile(alignmentFile,JSON.stringify(alignment,null,2)+'\n');
const durationSeconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',audioFile],{encoding:'utf8'}).trim());
if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw new Error('Could not probe generated voiceover.');
const durationInFrames=Math.ceil(durationSeconds*project.canvas.fps);
const old=project.audio.voiceover.assetId;
project.assets=project.assets.filter(a=>a.id!==old&&a.id!==id);
project.assets.push({id,kind:'audio',src:`assets/${id}.mp3`,durationInFrames});
project.audio.voiceover={...project.audio.voiceover,status:'ready',voiceId,assetId:id,durationInFrames,alignmentAsset:`assets/${id}.alignment.json`};
project.revision+=1;
await writeFile(resolve(output),JSON.stringify(project,null,2)+'\n');
console.log(`Saved revision ${project.revision}; voiceover ${durationSeconds.toFixed(3)}s (${durationInFrames} frames). Retiming, validation and a new preview are required before export.`);

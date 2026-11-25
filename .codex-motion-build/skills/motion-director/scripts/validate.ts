import {readFileSync} from 'node:fs';
import {validateProject} from '../starter/src/schema';
const file=process.argv[2];
if(!file)throw new Error('Usage: npm run validate -- ../examples/mixed-launch.json [--final]');
const p=validateProject(JSON.parse(readFileSync(file,'utf8')),{final:process.argv.includes('--final')});
console.log(`Valid: ${p.id} revision ${p.revision}; ${p.scenes.length} scenes; ${p.canvas.durationInFrames/p.canvas.fps}s; voiceover ${p.audio.voiceover.status}`);

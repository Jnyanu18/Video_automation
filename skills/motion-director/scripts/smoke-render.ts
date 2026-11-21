/** Developer verification, not final export. Uses synthetic/sample content only. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {validateProject,type Project} from '../starter/src/schema';
const require=createRequire(new URL('../starter/package.json',import.meta.url));
const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill,openBrowser}=require('@remotion/renderer');
const root=fileURLToPath(new URL('../starter/',import.meta.url));
const out=resolve(process.argv[2]??'smoke-output');mkdirSync(out,{recursive:true});
const browserExecutable=process.argv[3];
const p=validateProject(JSON.parse(readFileSync(new URL('../examples/mixed-launch.json',import.meta.url),'utf8')));
const serveUrl=await bundle({entryPoint:resolve(root,'src/index.ts'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle-smoke')});
const puppeteerInstance=await openBrowser('chrome',{browserExecutable});
const files:string[]=[];
async function still(project:Project,frame:number,name:string){
  const inputProps={project};const composition=await selectComposition({serveUrl,id:'ReferenceMotion',inputProps,browserExecutable,puppeteerInstance});
  const output=resolve(out,`${name}.png`);
  await renderStill({serveUrl,composition,inputProps,browserExecutable,puppeteerInstance,output,frame,imageFormat:'png',scale:.4});
  files.push(output);return createHash('sha256').update(readFileSync(output)).digest('hex');
}
// Out-of-order rendering, including repeat of a seeded procedural frame.
const first=await still(p,780,'landscape-orbit-a');
for(const s of p.scenes)await still(p,Math.min(s.from+Math.round(s.durationInFrames*.65),s.from+s.durationInFrames-1),`landscape-${s.id}`);
const repeat=await still(p,780,'landscape-orbit-b');
if(first!==repeat)throw new Error('Repeated frame differs; rendering is not deterministic');
for(const s of p.scenes.slice(1)){
  await still(p,s.from-1,`boundary-${s.id}-before`);
  await still(p,s.from,`boundary-${s.id}-at`);
  await still(p,s.from+Math.max(1,s.transitionIn.durationInFrames),`boundary-${s.id}-after`);
}
await still(p,p.canvas.durationInFrames-1,'landscape-last');
for(const format of ['portrait','square']){
  const q=structuredClone(p);q.canvas.width=format==='portrait'?1080:1440;q.canvas.height=format==='portrait'?1920:1440;
  for(const s of q.scenes)await still(q,s.from+Math.round(s.durationInFrames*.65),`${format}-${s.id}`);
}
for(const diagram of ['growth','workflow'] as const){
  const q=structuredClone(p);q.id=`diagram-${diagram}`;q.canvas.durationInFrames=180;q.audio.cues=[];
  q.scenes=[{id:'explain',from:0,durationInFrames:180,refs:['R08'],headline:'Build the story, step by step.',entryFrames:24,transitionIn:{type:'cut',durationInFrames:0},kind:'illustration',diagram}];
  await still(validateProject(q),120,`illustration-${diagram}`);
}
writeFileSync(resolve(out,'report.json'),JSON.stringify({files,repeatFrameHash:first,deterministic:true},null,2));
await puppeteerInstance.close({silent:true});
console.log(`Rendered ${files.length} smoke frames; repeated particle frame hashes match.`);

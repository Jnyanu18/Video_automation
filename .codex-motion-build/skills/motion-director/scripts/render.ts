import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {validateProject} from '../starter/src/schema';

const require=createRequire(new URL('../starter/package.json',import.meta.url));
const {bundle}=require('@remotion/bundler');
const {selectComposition,renderMedia,renderStill}=require('@remotion/renderer');
const [file,out,...flags]=process.argv.slice(2);
if(!file||!out)throw new Error('Usage: npm run render -- project.json output.mp4 --preview | --approved-revision N [--browser /path] [--still FRAME]');
const preview=flags.includes('--preview');
const get=(key:string)=>{const i=flags.indexOf(key);return i<0?undefined:flags[i+1];};
const approved=Number(get('--approved-revision'));
const p=validateProject(JSON.parse(readFileSync(file,'utf8')),{final:!preview});
if(!preview&&approved!==p.revision)throw new Error('Final export requires approval of this exact revision. The app must enforce authorization server-side.');
const starter=fileURLToPath(new URL('../starter/',import.meta.url));
for(const a of p.assets){
  if(a.src.startsWith('https://'))throw new Error('CLI requires staged local assets. Download approved assets into public/assets and rewrite the manifest first.');
  if(!existsSync(resolve(starter,'public',a.src)))throw new Error(`Asset missing: ${a.src}`);
}
mkdirSync(dirname(resolve(out)),{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(starter,'src/index.ts'),publicDir:resolve(starter,'public'),outDir:resolve(starter,'.bundle')});
const browserExecutable=get('--browser');
const inputProps={project:p};
const composition=await selectComposition({serveUrl,id:'ReferenceMotion',inputProps,browserExecutable});
if(get('--still')!==undefined){
  const frame=Number(get('--still'));
  if(!Number.isInteger(frame)||frame<0||frame>=p.canvas.durationInFrames)throw new Error('Still frame outside composition');
  await renderStill({serveUrl,composition,inputProps,browserExecutable,frame,output:resolve(out),imageFormat:'png',scale:preview?.5:1});
}else{
  await renderMedia({serveUrl,composition,inputProps,browserExecutable,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',outputLocation:resolve(out),scale:preview?.5:1,concurrency:2,crf:preview?24:18});
}
console.log(`${preview?'Preview':'Approved export'} saved: ${out}`);

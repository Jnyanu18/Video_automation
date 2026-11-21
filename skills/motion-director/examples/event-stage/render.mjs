import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,existsSync,readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url)),out=resolve(root,'output');mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'index.tsx'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.CHROME_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)});
try{
 const composition=await selectComposition({serveUrl,id:'EventStageReel',puppeteerInstance:browser});
 if(process.argv.includes('--stills')){
  const project=JSON.parse(readFileSync(resolve(root,'project.json'),'utf8'));
  const requested=process.env.REVIEW_FRAMES?process.env.REVIEW_FRAMES.split(',').map(Number):[0,899,...project.scenes.flatMap(s=>[s.from,Math.min(899,s.from+s.durationInFrames-1)]),...project.events.flatMap(e=>[e.frame-1,e.frame,e.frame+1,e.frame+12])];
  const frames=[...new Set(requested.filter(frame=>Number.isSafeInteger(frame)&&frame>=0&&frame<900))].sort((a,b)=>a-b);
  for(const frame of frames)await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:resolve(out,`frame-${String(frame).padStart(3,'0')}.png`),scale:.5,imageFormat:'png'});
 }else{
  let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:17,concurrency:2,outputLocation:resolve(out,'event-stage.mp4'),onProgress:({progress})=>{const n=Math.floor(progress*10);if(n!==last){last=n;process.stdout.write(n*10+'%\n');}}});
 }
}finally{await browser.close({silent:true});}
console.log('Saved EVENT STUDIO '+(process.argv.includes('--stills')?'review frames':'MP4'));

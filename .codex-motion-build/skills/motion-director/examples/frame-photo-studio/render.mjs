import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,existsSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url)),out=resolve(root,'output');mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'PhotoStudio.tsx'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.CHROME_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)});
try{
 const composition=await selectComposition({serveUrl,id:'FramePhotoStudio',puppeteerInstance:browser});
 if(process.argv.includes('--stills')){
  const frames=process.env.REVIEW_FRAMES?process.env.REVIEW_FRAMES.split(',').map(Number):[0,35,95,119,120,132,150,210,270,282,300,360,420,432,446,470,520,570,615,660,719,735,762,800,899];
  for(const frame of frames)await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:resolve(out,`frame-${String(frame).padStart(3,'0')}.png`),scale:.5,imageFormat:'png'});
 }else{
  let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:17,concurrency:2,outputLocation:resolve(out,'frame-photo-studio.mp4'),onProgress:({progress})=>{const n=Math.floor(progress*10);if(n!==last){last=n;process.stdout.write(n*10+'%\n');}}});
 }
}finally{await browser.close({silent:true});}
console.log('Saved photo-studio '+(process.argv.includes('--stills')?'review frames':'MP4'));

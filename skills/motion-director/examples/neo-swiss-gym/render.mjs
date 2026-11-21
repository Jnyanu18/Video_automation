import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,existsSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url)),out=process.env.GYM_OUTPUT_DIR??resolve(root,'output');mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'GymAd.tsx'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.CHROME_PATH??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)});
const composition=await selectComposition({serveUrl,id:'FormGymAd',puppeteerInstance:browser});
if(process.argv.includes('--stills')){
 for(const t of [.32,.53,1.18,2.63,4.42,6.23,8.25,10.15,12.15,13.65,14.8])await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:Math.round(t*60),output:resolve(out,`frame-${t}.png`),scale:.5,imageFormat:'png'});
}else{
 let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:18,concurrency:2,outputLocation:resolve(out,'form-gym-ad.mp4'),onProgress:({progress})=>{const p=Math.floor(progress*10);if(p!==last){last=p;process.stdout.write(p*10+'%\n');}}});
}
await browser.close({silent:true});console.log('Saved FORM gym ad');

import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url));
const out=process.env.FLOW_OUTPUT_DIR??resolve(root,'output');mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'Study.tsx'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle')});
const browser=await openBrowser('chrome',{browserExecutable:'/usr/bin/chromium'});
const composition=await selectComposition({serveUrl,id:'FlowStudy',puppeteerInstance:browser});
if(process.argv.includes('--stills')){
 for(const t of (process.argv.includes('--quick')?[.16,.30,.64,.79,1.43,1.85,2.36,3.52,4.99,5.82,6.15,7.6,8.64,9.2]:[.4,1,1.6,2.6,3.9,4.95,5.75,6.8,7.6,9.2]))await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:Math.round(t*60),output:resolve(out,`frame-${t}.png`),scale:.5,imageFormat:'png'});
}else await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',colorSpace:'bt709',imageFormat:'png',crf:18,concurrency:2,outputLocation:resolve(out,'flux-flow-study.mp4'),onProgress:({progress})=>{if(Math.round(progress*100)%20===0)process.stdout.write(Math.round(progress*100)+'%\n');}});
await browser.close({silent:true});
console.log('Saved custom flow study');

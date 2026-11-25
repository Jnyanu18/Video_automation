import {bundle} from '@remotion/bundler';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{tsImport}=require('tsx/esm/api');
const {sourceFingerprint}=await tsImport(new URL('./source-fingerprint.ts',import.meta.url).href,import.meta.url);
const root=fileURLToPath(new URL('.',import.meta.url)),sourceHash=sourceFingerprint(root);
mkdirSync(resolve(root,'output'),{recursive:true});
const serveUrl=await bundle({entryPoint:resolve(root,'index.tsx'),publicDir:resolve(root,'public'),outDir:resolve(root,'.bundle')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.CHROME_PATH??'/usr/bin/chromium'});
try{
 const composition=await selectComposition({serveUrl,id:'EventStageReel',puppeteerInstance:browser}),hashes=[];
 for(const frame of [132,6,330,719,780,899,132]){
  const r=await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,scale:.5,imageFormat:'png'});
  if(!r.buffer)throw new Error('No frame buffer');hashes.push({frame,sha256:createHash('sha256').update(r.buffer).digest('hex')});writeFileSync(resolve('output',`verified-frame-${frame}.png`),r.buffer);
 }
 if(hashes[0].sha256!==hashes.at(-1).sha256)throw new Error('Repeated random-access frame changed');
 if(sourceFingerprint(root)!==sourceHash)throw Error('Source changed during frame verification');
 writeFileSync('random-frame-check.json',JSON.stringify({passed:true,sourceHash,frameOrder:hashes.map(h=>h.frame),hashes},null,2)+'\n');console.log('Random-access frame check passed.');
}finally{await browser.close({silent:true});}

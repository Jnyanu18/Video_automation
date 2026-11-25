import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
/** Hash runtime/configuration and ALL public assets, including JPG/SVG logo bytes. */
export function sourceFingerprint(root=fileURLToPath(new URL('.',import.meta.url))){
 const generated=new Set(['execution-evidence.json','execution-review.json','audio-report.json','random-frame-check.json','source-manifest.json']);
 function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(['node_modules','.bundle','output','__pycache__','.git'].includes(e.name))return[];const path=join(dir,e.name);return e.isDirectory()?files(path):[path];});}
 const hash=createHash('sha256');
 for(const path of files(root).filter(path=>{const rel=relative(root,path);return rel.startsWith('public/')||(!generated.has(rel)&&/\.(tsx?|py|mjs|js|json)$/.test(rel));}).sort())hash.update(relative(root,path)).update('\0').update(readFileSync(path));
 return hash.digest('hex');
}

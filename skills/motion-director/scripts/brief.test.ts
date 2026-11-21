import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveBrief,validateAgainstBrief} from '../starter/src/brief';
const sample=JSON.parse(readFileSync(new URL('../examples/mixed-launch.json',import.meta.url),'utf8'));
const baseKit=()=>({id:'flux',revision:1,name:'Flux',visual:sample.brand,tone:'Clear and confident',language:'en',website:'your-domain.example',cta:'Create your story',strategy:{message:'Create an editable branded video'},defaults:{durationSeconds:18,narration:false,primaryRef:'R08',secondaryRefs:['R03','R01']},rules:{lockedFields:[],approvedMetricValues:[12840]}});
const empty=()=>({fields:{},moods:[],exactCopy:[],ambiguities:[]});
const run=(prompt:string,intent:any=empty(),kit:any=baseKit(),extra:any={})=>resolveBrief({prompt,intent,brandKit:kit,assetManifest:sample.assets,...extra});
test('premium is a motion mood, not an unrequested black-and-gold rebrand',()=>{
 const b=run('Make it premium',{...empty(),moods:[{term:'premium',evidence:'premium'}]});
 assert.equal(b.expected.brand.primary,sample.brand.primary);assert.equal(b.expected.brand.fontAssetId,'demo-font');assert.deepEqual(b.moods,['premium']);
});
test('Neo-Swiss custom execution profile persists through narrow revisions',()=>{
 const b=run('Use Neo-Swiss kinetic motion',{...empty(),executionProfile:'neo-swiss-kinetic'});
 assert.equal(b.executionProfile,'neo-swiss-kinetic');
 assert.equal(run('Keep the same style',empty(),baseKit(),{previous:b}).executionProfile,'neo-swiss-kinetic');
});
test('advanced UI and SaaS profiles remain explicit and survive narrow revisions',()=>{
 for(const profile of ['shared-container-ui','saas-launch']){
  const b=run('Use the advanced archetype',{...empty(),executionProfile:profile});
  assert.equal(b.executionProfile,profile);
  assert.equal(run('Change only the wording',empty(),baseKit(),{previous:b}).executionProfile,profile);
 }
 assert.equal(run('A simple demo').executionProfile,'standard');
});
test('explicit project color override preserves saved kit and records evidence',()=>{
 const kit=baseKit(),b=run('Use #FF0066',{...empty(),fields:{primary:{value:'#FF0066',evidence:'#FF0066'}}},kit);
 assert.equal(b.expected.brand.primary,'#FF0066');assert.equal(kit.visual.primary,sample.brand.primary);assert.equal(b.decisions.primary.source,'prompt');
});
test('versioned locks preserve identity and report requested/applied conflict',()=>{
 const kit:any=baseKit();kit.rules.lockedFields=['primary'];
 const b=run('Use #FF0066',{...empty(),fields:{primary:{value:'#FF0066',evidence:'#FF0066'}}},kit);
 assert.equal(b.expected.brand.primary,sample.brand.primary);assert.equal(b.conflicts[0].requested,'#FF0066');
});
test('output languages stay independent of instruction language; explicit form edits win',()=>{
 const b=run('15 segundos. Narración en inglés; título en español.',{...empty(),fields:{durationSeconds:{value:15,evidence:'15 segundos'},spokenLanguage:{value:'en',evidence:'Narración en inglés'},onScreenLanguage:{value:'es',evidence:'título en español'}}},baseKit(),{formOverrides:{durationSeconds:20}});
 assert.equal(b.expected.canvas.durationInFrames,1200);assert.equal(b.expected.spokenLanguage,'en');assert.equal(b.expected.onScreenLanguage,'es');
});
test('made-up prompt evidence is rejected',()=>assert.throws(()=>run('Keep it clean',{...empty(),fields:{primary:{value:'#000000',evidence:'use black'}}}),/evidence absent/));
test('newer kits do not silently restyle prior work, and explicit choices survive rebase',()=>{
 const first=run('12 seconds, en español',{...empty(),fields:{durationSeconds:{value:12,evidence:'12 seconds'},onScreenLanguage:{value:'es',evidence:'en español'}}});
 const next=baseKit();next.revision=2;next.visual={...next.visual,primary:'#00AA77'};
 const kept=run('Change nothing',empty(),next,{previous:first});
 assert.equal(kept.expected.brand.primary,sample.brand.primary);assert.equal(kept.expected.canvas.durationInFrames,720);
 const rebased=run('Update our brand',empty(),next,{previous:kept,rebaseBrandKit:true});
 assert.equal(rebased.expected.brand.primary,'#00AA77');assert.equal(rebased.expected.onScreenLanguage,'es');assert.equal(rebased.expected.canvas.durationInFrames,720);
});
test('exact copy merges, can be explicitly cleared, and does not retain an old CTA',()=>{
 const first=run('Say "Hello"',{...empty(),exactCopy:[{text:'Hello',placement:'screen',evidence:'"Hello"'}]});
 const merged=run('Add "Welcome"',{...empty(),exactCopy:[{text:'Welcome',placement:'screen',evidence:'"Welcome"'}]},baseKit(),{previous:first});
 assert.equal(merged.exactCopy.length,2);
 const cleared=run('Remove prior exact copy',{...empty(),exactCopyResetEvidence:'Remove prior exact copy'},baseKit(),{previous:merged});assert.equal(cleared.exactCopy.length,0);
 const ctaFirst=run('Say "Create your story"',{...empty(),exactCopy:[{text:'Create your story',placement:'screen',evidence:'"Create your story"'}]});
 const ctaNext=run('Change CTA to Book a demo',{...empty(),fields:{cta:{value:'Book a demo',evidence:'Book a demo'}}},baseKit(),{previous:ctaFirst});assert.equal(ctaNext.exactCopy.length,0);
});
test('automatic logo adapts to background on revisions and missing assets are detected',()=>{
 const kit:any=baseKit();kit.logoVariants=[{assetId:'dark-ink',forBackground:'light'},{assetId:'light-ink',forBackground:'dark'}];
 const assets=[...sample.assets,{id:'dark-ink',kind:'image',src:'assets/dark.png'},{id:'light-ink',kind:'image',src:'assets/light.png'}];
 const first=run('Use our kit',empty(),kit,{assetManifest:assets});assert.equal(first.expected.brand.logoAssetId,'dark-ink');
 const next=run('Background #000000',{...empty(),fields:{background:{value:'#000000',evidence:'#000000'}}},kit,{previous:first,assetManifest:assets});assert.equal(next.expected.brand.logoAssetId,'light-ink');
 const missing=run('Use our kit',empty(),kit);assert.equal(missing.status,'needs_input');
});
test('missing product message produces a focused question instead of invented copy',()=>{
 const kit:any=baseKit();delete kit.strategy;
 assert.equal(run('Make an ad',empty(),kit).status,'needs_input');
});
test('scene-specific revision directions survive structured interpretation',()=>{
 const b=run('Make the opening faster',{...empty(),creativeRequests:[{instruction:'Shorten the opening entrance while keeping its text readable',evidence:'Make the opening faster',targetSceneId:'hook'}]});
 assert.equal(b.creativeRequests[0].targetSceneId,'hook');
});
test('post-generation checks catch brand drift, invented assets and unsupported metrics',()=>{
 const b=run('Use our kit');assert.doesNotThrow(()=>validateAgainstBrief(sample,b,sample.assets));
 const wrong=structuredClone(sample);wrong.brand.primary='#000000';assert.throws(()=>validateAgainstBrief(wrong,b,sample.assets),/Brand mismatch/);
 const wrongAsset=structuredClone(sample);wrongAsset.assets[0].src='audio/invented.wav';assert.throws(()=>validateAgainstBrief(wrongAsset,b,sample.assets),/modified asset/);
 const metric=structuredClone(sample);metric.scenes.find((s:any)=>s.kind==='metric').value=999;assert.throws(()=>validateAgainstBrief(metric,b,sample.assets),/approved data/);
});

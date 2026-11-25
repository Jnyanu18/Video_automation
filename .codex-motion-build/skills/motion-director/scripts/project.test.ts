import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../starter/src/schema';
const sample=JSON.parse(readFileSync(new URL('../examples/mixed-launch.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(sample);
test('sample has contiguous editable scenes and resolved SFX',()=>assert.equal(validateProject(clone(),{final:true}).canvas.durationInFrames,1080));
test('rejects a gap and an overlap instead of rendering missing frames',()=>{
  for(const delta of [-1,1]){const p=clone();p.scenes[1].from+=delta;assert.throws(()=>validateProject(p),/no gaps or overlaps/);}
});
test('rejects frame budget changed without retiming scenes',()=>{const p=clone();p.canvas.durationInFrames++;assert.throws(()=>validateProject(p),/Timeline ends/);});
test('does not export pending narration or truncate longer narration',()=>{
  const p=clone();p.audio.voiceover={status:'pending',text:'Speak this',from:0,durationInFrames:0};
  assert.doesNotThrow(()=>validateProject(p));assert.throws(()=>validateProject(p,{final:true}),/pending/);
  p.assets.push({id:'vo',kind:'audio',src:'audio/vo.wav',durationInFrames:1200});
  p.audio.voiceover={status:'ready',text:'Speak this',assetId:'vo',from:0,durationInFrames:1200};
  assert.throws(()=>validateProject(p,{final:true}),/retime scenes/);
});
test('rejects missing assets, path traversal, and invalid fade budgets',()=>{
  const p=clone();p.audio.cues[0].assetId='unknown';assert.throws(()=>validateProject(p),/missing audio/);
  const q=clone();q.assets[0].src='audio/../../secret';assert.throws(()=>validateProject(q));
  const r=clone();r.audio.cues[0].fadeInFrames=90;assert.throws(()=>validateProject(r),/fades exceed/);
});
test('rejects transitions that consume a whole scene',()=>{const p=clone();p.scenes[1].transitionIn.durationInFrames=150;assert.throws(()=>validateProject(p),/one third/);});
test('rejects odd H.264 dimensions and duplicate identifiers',()=>{
  const p=clone();p.canvas.width=1919;assert.throws(()=>validateProject(p),/even/);
  const q=clone();q.scenes[1].id=q.scenes[0].id;assert.throws(()=>validateProject(q),/Duplicate scene/);
});

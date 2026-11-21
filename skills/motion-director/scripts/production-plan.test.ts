import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../starter/src/schema';
import {validateProductionPlan,validatePlanForProject,resolveCueTiming,buildReviewFrames,inspectAssetResolution,visibleCenterOffset,storyboardHtml} from '../starter/src/production-plan';
import {reviewSync} from '../starter/src/sync-review';
const project=()=>validateProject(JSON.parse(readFileSync(new URL('../examples/mixed-launch.json',import.meta.url),'utf8')));
const plan=()=>JSON.parse(readFileSync(new URL('../examples/production-plan.json',import.meta.url),'utf8'));

test('production plan resolves existing cue placements without changing project data',()=>{
  const p=project(),before=structuredClone(p);
  assert.deepEqual(resolveCueTiming(plan(),p),p.audio.cues);assert.deepEqual(p,before);
  validatePlanForProject(plan(),p);
});
test('bound sidecars cannot claim a cue schedule different from the actual preview',()=>{
  const p=project(),v=plan();v.audioCues[0].offsetFrames=1;
  assert.throws(()=>validatePlanForProject(v,p),/differs from project.audio.cues/);
});
test('sync review compares the cue source marker and intentional offset with planned and observed frames',()=>{
  const p=project(),v=plan(),cue=p.audio.cues[0];
  const report=reviewSync(p,v,{
    projectId:p.id,projectRevision:p.revision,fps:p.canvas.fps,
    checks:[{
      eventId:v.audioCues[0].eventId,cueId:cue.id,sourceSeconds:2/p.canvas.fps,
      audioOffsetFrames:2,toleranceFrames:1,observedVisualFrame:cue.from+3,evidence:'Synthetic test marker',
    }],
  });
  assert.equal(report.checks[0].audioFrame,cue.from+2);
  assert.equal(report.checks[0].expectedVisualFrame,cue.from);
  assert.equal(report.checks[0].plannedDeltaFrames,0);
  assert.equal(report.checks[0].observedDeltaFrames,3);
  assert.equal(report.observedCount,1);
  assert.equal(report.withinTolerance,false);
  assert(report.reviewFrames.includes(cue.from+3));
});
test('sync reports planned-only checks and rejects stale or out-of-cue evidence',()=>{
  const p=project(),v=plan(),cue=p.audio.cues[0];
  const input={
    projectId:p.id,projectRevision:p.revision,fps:p.canvas.fps,
    checks:[{eventId:v.audioCues[0].eventId,cueId:cue.id,sourceSeconds:0,evidence:'Synthetic test marker'}],
  };
  const report=reviewSync(p,v,input);
  assert.equal(report.withinTolerance,true);
  assert.equal(report.observedCount,0);
  assert.equal(report.checks[0].observedDeltaFrames,null);
  assert.throws(()=>reviewSync(p,v,{...input,projectRevision:p.revision+1}),/revision and FPS/);
  input.checks[0].sourceSeconds=cue.durationInFrames/p.canvas.fps;
  assert.throws(()=>reviewSync(p,v,input),/outside its played source span/);
});
test('retiming earlier scenes recomputes linked cues; stale revisions and FPS fail',()=>{
  const p=project(),v=plan();
  p.revision++;p.scenes[0].durationInFrames+=60;p.canvas.durationInFrames+=60;
  for(const s of p.scenes.slice(1))s.from+=60;
  assert.throws(()=>validateProductionPlan(v,p),/revision/);
  v.projectRevision=p.revision;
  assert.equal(resolveCueTiming(v,p)[1].from,175);
  assert.equal(resolveCueTiming(v,p)[0].from,12);
  v.fps=30;assert.throws(()=>validateProductionPlan(v,p),/FPS/);
});
test('plans reject reordered shots, missing events, unknown assets and out-of-scene events',()=>{
  const p=project();
  const a=plan();a.shots.reverse();assert.throws(()=>validateProductionPlan(a,p),/timeline order/);
  const b=plan();b.audioCues[0].eventId='absent';assert.throws(()=>validateProductionPlan(b,p),/unresolved motion event/);
  const c=plan();c.audioCues[0].assetId='absent';assert.throws(()=>validateProductionPlan(c,p),/approved audio/);
  const d=plan();d.events[0].localFrame=120;assert.throws(()=>validateProductionPlan(d,p),/outside its scene/);
});
test('invalid fades, source anchors and cue bounds fail rather than silently clip',()=>{
  const p=project();
  const a=plan();a.audioCues[0].fadeInFrames=100;assert.throws(()=>validateProductionPlan(a,p),/fades/);
  const b=plan();b.audioCues[0].alignment.sourceFrame=11;assert.throws(()=>validateProductionPlan(b,p),/source alignment/);
  const c=plan();c.audioCues[0].offsetFrames=-100;assert.throws(()=>validateProductionPlan(c,p),/outside project/);
  const d=plan();d.audioCues[0].gain=NaN;assert.throws(()=>validateProductionPlan(d,p));
});
test('onset can exclude leading silence and riser end can use the exclusive end',()=>{
  const p=project(),v=plan();v.audioCues[0].alignment.sourceFrame=2;
  assert.equal(resolveCueTiming(v,p)[0].from,10);
  v.audioCues[0].alignment={kind:'riser-end',sourceFrame:10,evidence:'Synthetic boundary test, not a measured waveform'};
  assert.equal(resolveCueTiming(v,p)[0].from,2);
});
test('ending entry and transition overlap; later child settlement is declared separately',()=>{
  const p=project(),v=plan();v.ending.settledFromLocalFrame=24;v.ending.holdFrames=216;
  validateProductionPlan(v,p);
  v.ending.settledFromLocalFrame=23;assert.throws(()=>validateProductionPlan(v,p),/settled time/);
});
test('review frame requests include cut neighbors and intermediate transition states',()=>{
  const p=project(),frames=buildReviewFrames(plan(),p);
  for(const f of [0,119,120,124,129,133,137,1079])assert(frames.includes(f),String(f));
  assert(frames.every(f=>Number.isInteger(f)&&f>=0&&f<1080));
  assert.deepEqual(frames,[...new Set(frames)].sort((a,b)=>a-b));
});
test('asset resolution uses fit and maximum framing, reports absent probes',()=>{
  const p=project(),v=plan();p.assets.push({id:'product',kind:'image',src:'assets/product.png'});
  const use={assetId:'product',maxDisplayWidthPx:1000,maxDisplayHeightPx:1000,fit:'cover',reason:'Maximum camera close-up'};
  v.shots[0].assetUses=[use];
  assert.equal(inspectAssetResolution(v,p,[])[0].status,'unmeasured');
  const metadata=[{assetId:'product',format:'raster' as const,width:2000,height:500}];
  assert.equal(inspectAssetResolution(v,p,metadata)[0].status,'upscaled');
  v.shots[0].assetUses[0].fit='contain';
  assert.equal(inspectAssetResolution(v,p,metadata)[0].status,'adequate');
  assert.equal(inspectAssetResolution(v,p,[{assetId:'product',format:'vector'}])[0].status,'vector');
});
test('visible logo centering rejects invalid bounds and compensates alpha padding',()=>{
  assert.deepEqual(visibleCenterOffset(1000,1000,{x:100,y:200,width:400,height:400}),{x:200,y:100});
  assert.throws(()=>visibleCenterOffset(100,100,{x:90,y:0,width:50,height:10}));
});
test('text storyboard escapes untrusted content and includes no executable asset URLs',()=>{
  const p=project(),v=plan();v.shots[0].purpose='<script>alert("x")</script>';
  v.shots[0].camera.path='<img src=x onerror=alert(1)>';
  const html=storyboardHtml(v,p);
  assert(!html.includes('<script>'));assert(!html.includes('<img'));
  assert(html.includes('&lt;script&gt;'));assert(html.includes("default-src 'none'"));
  assert(html.includes('Text planning board only'));
});

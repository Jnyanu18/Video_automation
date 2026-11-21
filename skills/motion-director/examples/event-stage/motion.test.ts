import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {renderToStaticMarkup} from 'react-dom/server';
import data from './project.json';
import {validateEventStage,type EventStageProject} from './config';
import {BeatWord} from './EventStage';
import {baselineDisplacement} from './lib/depth-motion';
import {beatWordState,camera,detailPose,event,foregroundOpacity,heroCoversViewport,heroInternalOpacity,heroPolygon,heroPose,heroStrain,identityState,projectHeroPoint,sparkContactGeometry,track,worldPoint} from './motion';
const p=validateEventStage(data);
const copy=()=>structuredClone(p);
function retime(p:EventStageProject,id:EventStageProject['events'][number]['id'],frame:number){p.events.find(e=>e.id===id)!.frame=frame;return validateEventStage(p);}

test('supported recipe is exactly900 frames and reserves a settled identity hold',()=>{
 assert.equal(p.scenes[0].from,0);assert.equal(p.scenes.at(-1)!.from+p.scenes.at(-1)!.durationInFrames,900);
 const settle=event(p,'final-settle');assert(900-settle>=90);
 const state=identityState(settle,p);assert.equal(state.opacity,1);assert.equal(state.ctaOpacity,1);assert.equal(state.rule,1);assert(Math.abs(state.scale-1)<.002);
 const invalid=copy();invalid.durationInFrames=901 as 900;assert.throws(()=>validateEventStage(invalid));
});

test('actual transformed ball bottom touches actual shared floor at the named contact',()=>{
 for(const project of [p,retime({...copy(),geometry:{...p.geometry,floorY:1360,ballDiameter:110}},'spark-contact',42)]){
  const hit=event(project,'spark-contact'),contact=sparkContactGeometry(hit,project),before=sparkContactGeometry(hit-1,project);
  assert(contact.gapPx<1e-8,`Rendered contact gap is${contact.gapPx}px`);assert.equal(contact.worldGapPx,0);
  assert(before.worldGapPx>0,'Ball must approach the floor from above');
  assert.equal(baselineDisplacement(project.geometry.contactX,hit,60,{startX:60,endX:1020,contactX:project.geometry.contactX,impactFrame:hit,amplitudePx:40,widthPx:340,durationSeconds:.45}),0);
 }
});

test('landing strain expands horizontally, compresses vertically and preserves local area',()=>{
 const response=heroStrain(event(p,'spark-contact')+6,p);
 assert(response.scaleX>1);assert(response.scaleY<1);assert(Math.abs(response.scaleX*response.scaleY-1)<1e-12);
 assert.deepEqual(heroStrain(event(p,'spark-contact'),p),{scaleX:1,scaleY:1});
});

test('whole words, not first letters, are visible on each named beat',()=>{
 for(const [i,id] of (['lights','energy','action'] as const).entries()){
  const at=event(p,id),state=beatWordState(at,p),html=renderToStaticMarkup(React.createElement(BeatWord,{state,color:p.palette.black}));
  assert.equal(state.index,i);assert.equal(state.word,p.scenes[2].headline[i]);assert.equal(state.firstReadableFrame,at);assert.equal(state.opacity,1);
  assert(html.includes(`>${state.word}</div>`));assert(html.includes('opacity:1'));assert(!html.includes('<span'),'Beat words must not inherit delayed letter staggering');assert(!html.includes('clip-path'));
  if(i>0)assert.equal(beatWordState(at-1,p).index,i-1);
 }
});

test('retiming energy300→312 moves actual component state and canonical score cue together',()=>{
 const shifted=retime(copy(),'energy',312);
 assert.equal(beatWordState(311,shifted).word,shifted.scenes[2].headline[0]);
 assert.equal(beatWordState(312,shifted).word,shifted.scenes[2].headline[1]);
 assert.equal(beatWordState(312,shifted).firstReadableFrame,shifted.events.find(e=>e.id==='energy')!.frame);
 const result=spawnSync('python',['-c','import sys,json;from audio_timing import resolve_event_cues;print(json.dumps(resolve_event_cues(json.load(sys.stdin))))'],{cwd:fileURLToPath(new URL('.',import.meta.url)),input:JSON.stringify(shifted),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const cue=JSON.parse(result.stdout).find((cue:{eventId:string})=>cue.eventId==='energy');
 assert.equal(cue.targetFrame,312);assert.equal(cue.cueStartSeconds,5.2);
 assert.equal(Math.round((cue.cueStartSeconds+cue.sourceMarkerSeconds)*shifted.fps),beatWordState(312,shifted).firstReadableFrame);
});

test('all outgoing foreground yields before the cover grows and opaque plane covers cut boundary',()=>{
 const cover=event(p,'brand-cover'),cut=event(p,'logo-arrival');
 assert.equal(foregroundOpacity(cover-4,p),0);assert.equal(foregroundOpacity(cover,p),0);
 for(let f=cover;f<cut;f++)assert.equal(foregroundOpacity(f,p),0);
 for(let f=cut-4;f<cut;f++){assert.equal(heroInternalOpacity(f,p),0);assert(heroCoversViewport(f,p),`Viewport not covered at${f}`);}
});

test('all actual panel corners stay beyond the perspective near plane',()=>{
 for(let f=0;f<900;f++){
  const poses=[heroPose(f,p),...[0,1,2].map(i=>detailPose(f,i,p))];
  for(const pose of poses)for(const x of [-pose.w/2,pose.w/2])for(const y of [-pose.h/2,pose.h/2]){
   const world=worldPoint(pose,{x,y,z:0});assert(1600-world.z>=180);
   const projected=projectHeroPoint(pose,{x,y,z:0},f,p);assert(Number.isFinite(projected.x)&&Number.isFinite(projected.y));
  }
 }
});

test('supporting panel corners stay behind the hero depth envelope during their visible burst',()=>{
 for(let f=event(p,'detail-burst');f<event(p,'moment-pullback');f++){
  const hero=heroPose(f,p),nearHero=Math.min(...[-1,1].flatMap(x=>[-1,1].map(y=>worldPoint(hero,{x:x*hero.w/2,y:y*hero.h/2,z:0}).z)));
  for(let i=0;i<3;i++){const detail=detailPose(f,i,p),nearDetail=Math.max(...[-1,1].flatMap(x=>[-1,1].map(y=>worldPoint(detail,{x:x*detail.w/2,y:y*detail.h/2,z:0}).z)));assert(nearDetail<nearHero,`Depth intersection at${f}/${i}`);}
 }
});

test('staging changes from wide to macro to asymmetric supporting view',()=>{
 const width=(f:number)=>{const poly=heroPolygon(f,p);return Math.max(...poly.map(q=>q.x))-Math.min(...poly.map(q=>q.x));};
 assert(width(event(p,'lights')+90)>1.5*width(event(p,'stage-unfold')+90));
 assert(width(event(p,'detail-burst')+90)<.8*width(event(p,'stage-unfold')+90));
 assert(heroPose(event(p,'detail-burst')+90,p).x<400);
});

test('spring retarget preserves position; frame state is independent of evaluation order',()=>{
 assert.equal(track(15,0,[[0,100]]),track(15,0,[[0,100],[15,50]]));
 const pose=heroPose(432,p),cam=camera(432,p);[899,6,300,132,780].forEach(f=>heroPose(f,p));assert.deepEqual(heroPose(432,p),pose);assert.deepEqual(camera(432,p),cam);
});

test('missing logo uses explicit null; no reconstructed logo is bundled',()=>{
 assert.equal(p.assets.logo,null);assert.equal(p.brand,'EVENT STUDIO');assert.equal(p.fictionalBrand,true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {impactWindow,helixPoint,shockwaveImpulse,ribbonToLogoPoint} from '../src/kit/mixed-media.ts';
test('impact flashes use an explicit frame or duration contract',()=>{
  assert.equal(impactWindow(10,30,{atFrame:10}).durationInFrames,2);
  assert.equal(impactWindow(10,30,{atFrame:10,timingMode:'duration'}).durationInFrames,1);
  assert.equal(impactWindow(10,24,{atFrame:10,referenceFrames:3,timingMode:'duration'}).durationInFrames,1);
  assert(impactWindow(11,60,{atFrame:10}).active);assert(!impactWindow(12,60,{atFrame:10}).active);
  assert(!impactWindow(9,60,{atFrame:10}).active);assert.throws(()=>impactWindow(.5,60,{atFrame:10}));
});
test('helix preserves radius and its declared pitch in one world space',()=>{
  const origin={x:10,y:20,z:30},a=helixPoint(.25,origin,100,80),b=helixPoint(1,origin,100,80);
  assert(Math.abs(Math.hypot(a.x-10,a.y-20)-100)<1e-10);assert.equal(a.z,50);
  assert(Math.abs(b.x-110)<1e-10);assert(Math.abs(b.y-20)<1e-10);assert.equal(b.z,110);
  assert.throws(()=>helixPoint(0,origin,-1,80));
});
test('shockwave has no pre-event motion and supports pure ballistic travel',()=>{
  const o={x:10,y:20,z:30},v={x:100,y:-50,z:200};
  assert.deepEqual(shockwaveImpulse(-.1,o,v).position,o);
  assert.deepEqual(shockwaveImpulse(.5,o,v,{dragPerSimulatedSecond:0}),{position:{x:60,y:-5,z:130},velocityPerVideoSecond:v});
});
test('slow-motion drag uses a shared simulation clock and returns video-time velocity',()=>{
  const o={x:0,y:0,z:0},v={x:100,y:0,z:0};
  const slow=shockwaveImpulse(1,o,v,{timeScale:.5}),normal=shockwaveImpulse(.5,o,v);
  assert.deepEqual(slow.position,normal.position);assert.equal(slow.velocityPerVideoSecond.x,normal.velocityPerVideoSecond.x*.5);
  assert.deepEqual(shockwaveImpulse(10,o,v,{timeScale:0}).position,o);
  const far=shockwaveImpulse(100,o,v);assert(Math.abs(far.position.x-50)<1e-10);
  assert.throws(()=>shockwaveImpulse(1,o,v,{timeScale:2}));
});
test('point-mapped logo resolve has exact approved endpoints and no residual Z',()=>{
  const from={x:1e10,y:-200,z:100},target={x:.1,y:20};
  assert.deepEqual(ribbonToLogoPoint(from,target,1),{x:.1,y:20,z:0});assert.deepEqual(ribbonToLogoPoint(from,target,0),from);
  assert.equal(ribbonToLogoPoint(from,target,.5).z,50);
  assert.deepEqual(ribbonToLogoPoint(from,target,2),{x:.1,y:20,z:0});
});

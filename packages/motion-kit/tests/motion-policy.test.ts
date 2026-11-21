import {test} from 'node:test';
import assert from 'node:assert/strict';
import {motionPresets,bezierProgress,predictedOvershoot,millisecondsToFrames,alignmentToFrame,radialDelayFrames,cubicPathPoint,frameTimecode,truthfulProgress} from '../src/kit/motion-policy.ts';
test('snap curve is measured correctly rather than labeled 90% at 20%',()=>{
  assert(Math.abs(bezierProgress(.2,motionPresets.easing.snap)-.752126)<.00001);
  const faster=bezierProgress(.2,motionPresets.easing.fastSnap);assert(faster>.85&&faster<.9);
});
test('bezier endpoints and time mapping remain well formed',()=>{
  assert.equal(bezierProgress(0,motionPresets.easing.snap),0);assert.equal(bezierProgress(1,motionPresets.easing.snap),1);
  assert.throws(()=>bezierProgress(.5,[-1,1,.3,1]));assert.throws(()=>bezierProgress(NaN,motionPresets.easing.snap));
});
test('expressive and stable presets have deliberately different overshoot',()=>{
  const value=predictedOvershoot(motionPresets.springs.expressive);assert(value>.06&&value<.07);
  assert(predictedOvershoot(motionPresets.springs.stableUi)<.001);assert.equal(predictedOvershoot(motionPresets.springs.camera),0);
});
test('press and narration timestamps are quantized to actual video frames',()=>{
  assert.equal(millisecondsToFrames(120,60),7);assert.equal(millisecondsToFrames(120,30),4);
  assert.equal(alignmentToFrame(.125,60,10),18);assert.throws(()=>alignmentToFrame(-1,60));
});
test('radial delay uses normalized cell distances and a bounded budget',()=>{
  assert.equal(radialDelayFrames({x:0,y:0},{x:0,y:0},{spacingPx:120,fps:60}),0);
  assert.equal(radialDelayFrames({x:120,y:0},{x:0,y:0},{spacingPx:120,fps:60}),2);
  assert.equal(radialDelayFrames({x:100000,y:0},{x:0,y:0},{spacingPx:120,fps:60}),27);
  assert.throws(()=>radialDelayFrames({x:1,y:0},{x:0,y:0},{spacingPx:0,fps:60}));
});
test('cursor path follows its specified endpoints and curvature',()=>{
  const a={x:0,y:0},b={x:0,y:100},c={x:100,y:100},d={x:100,y:0};
  assert.deepEqual(cubicPathPoint(0,a,b,c,d),a);assert.deepEqual(cubicPathPoint(1,a,b,c,d),d);assert.deepEqual(cubicPathPoint(.5,a,b,c,d),{x:50,y:75});
});
test('HUD timecode and progress represent actual frames',()=>{
  assert.equal(frameTimecode(899,60),'TC 00:00:14:59');assert.equal(frameTimecode(3661*60+7,60),'TC 01:01:01:07');
  assert.equal(truthfulProgress(0,900),0);assert.equal(truthfulProgress(899,900),1);assert.equal(truthfulProgress(900,900),1);
});

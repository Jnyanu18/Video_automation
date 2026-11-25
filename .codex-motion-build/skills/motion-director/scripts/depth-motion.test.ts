import {test} from 'node:test';
import assert from 'node:assert/strict';
import {depthPresets,elevationShadows,focusLayer,burstPosition,directionalBlurState,areaPreservingScales,baselineDisplacement} from '../starter/src/depth-motion';
import {radialDelayFrames,predictedOvershoot} from '../starter/src/motion-policy';
test('shadow elevation is bounded, nonnegative and scales to delivery pixels',()=>{
  assert.deepEqual(elevationShadows(0),[{x:0,y:30,blur:60,alpha:.2},{x:0,y:4,blur:12,alpha:.1}]);
  assert.deepEqual(elevationShadows(-200),elevationShadows(0));
  assert.deepEqual(elevationShadows(1e6),elevationShadows(400));
  assert.equal(elevationShadows(400,2)[0].blur,300);
  assert.equal(elevationShadows(100,2)[0].y,82.5);
  assert.equal(elevationShadows(100,2)[0].y,elevationShadows(100,1)[0].y*2);
  assert.throws(()=>elevationShadows(NaN));assert.throws(()=>elevationShadows(0,0));
});
test('focus endpoints preserve a crisp hero and bounded inactive styling',()=>{
  assert.deepEqual(focusLayer(1),{scale:1.1,opacity:1,blurPx:0});
  assert.deepEqual(focusLayer(0),{scale:.8,opacity:.35,blurPx:12});
  assert.deepEqual(focusLayer(4),focusLayer(1));assert.equal(focusLayer(0,2).blurPx,24);
});
test('burst preset is normalized by cell spacing and keeps its larger physical overshoot',()=>{
  const p=predictedOvershoot(depthPresets.explosionSpring);assert(p>.108&&p<.109);
  assert.equal(radialDelayFrames({x:100,y:0},{x:0,y:0},{spacingPx:100,fps:60,...depthPresets.burst}),1);
  assert.equal(radialDelayFrames({x:10000,y:0},{x:0,y:0},{spacingPx:100,fps:60,...depthPresets.burst}),18);
});
test('3D burst follows the vector, delays contact, overshoots and settles deterministically',()=>{
  const a={x:10,y:20,z:0},b={x:110,y:220,z:300};
  assert.deepEqual(burstPosition(9,60,a,b,10),a);
  const peak=burstPosition(23,60,a,b,10);assert(peak.x>b.x);assert(Math.abs((peak.y-a.y)/(peak.x-a.x)-2)<1e-10);
  const end=burstPosition(250,60,a,b,10);assert(Math.abs(end.z-b.z)<.001);
  assert.deepEqual(burstPosition(23,60,a,b,10),peak);
  assert.throws(()=>burstPosition(1,60,a,b,-1));assert.throws(()=>burstPosition(1,0,a,b));
});
test('directional blur uses projected speed and the same duration across FPS',()=>{
  assert.equal(directionalBlurState({x:0,y:0},1,60).radiusPx,0);
  assert.equal(directionalBlurState({x:1800,y:0},8,60).radiusPx,0);
  assert.deepEqual(directionalBlurState({x:0,y:1800},2,60),directionalBlurState({x:0,y:1800},1,30));
  assert.equal(directionalBlurState({x:0,y:1800},1,60).angleRadians,Math.PI/2);
  assert(directionalBlurState({x:1800,y:0},1,60).radiusPx<=15);
});
test('bounded reciprocal deformation preserves local 2D area',()=>{
  for(const s of [-100,-.15,0,.15,100]){const p=areaPreservingScales(s);assert(Math.abs(p.scaleX*p.scaleY-1)<1e-12);assert(p.scaleX>=.8&&p.scaleX<=1.2);}
  assert.throws(()=>areaPreservingScales(.1,1));
});
test('contact ripple starts on the shared event, propagates, pins ends and settles at .2s',()=>{
  const o={startX:0,endX:1000,contactX:500,impactFrame:60};
  assert.equal(baselineDisplacement(500,59,60,o),0);assert.equal(baselineDisplacement(500,60,60,o),0);
  assert(baselineDisplacement(500,61,60,o)>0);
  assert.equal(baselineDisplacement(660,61,60,o),0);
  assert.equal(baselineDisplacement(0,62,60,o),0);assert.equal(baselineDisplacement(1000,62,60,o),0);
  assert.equal(baselineDisplacement(500,72,60,o),0);assert.equal(baselineDisplacement(500,200,60,o),0);
  assert.equal(baselineDisplacement(500,66,60,o),baselineDisplacement(500,33,30,{...o,impactFrame:30}));
  assert.throws(()=>baselineDisplacement(500,61,60,{...o,contactX:2000}));
});

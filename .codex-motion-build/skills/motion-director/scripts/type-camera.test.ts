import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lineEntrance,textFocus,zoomScale,anchoredCamera,projectPoint,unprojectPoint,cameraRecoil,internalRevealSchedule} from '../starter/src/type-camera';
test('line stagger rounds absolute timing without accumulating per-line rounding error',()=>{
  assert.equal(lineEntrance(0,60,4).from,10);assert.equal(lineEntrance(0,60,4).visibility,'hidden');
  assert.equal(lineEntrance(10,60,4).visibility,'visible');assert.equal(lineEntrance(10,60,4).translateY,32);
  assert.equal(lineEntrance(100,60,4).translateY,0);assert.equal(lineEntrance(0,60,0,{designScale:2}).translateY,64);
  assert.throws(()=>lineEntrance(0,60,-1));
});
test('text focus keeps active text crisp and inactive styling bounded',()=>{
  assert.deepEqual(textFocus(1),{blurPx:0,opacity:1});assert.deepEqual(textFocus(0),{blurPx:10,opacity:.25});
  assert.deepEqual(textFocus(-2),textFocus(0));assert.equal(textFocus(0,2).blurPx,20);
});
test('camera push reaches the target after 15 elapsed frames at 60fps',()=>{
  assert.equal(zoomScale(20,60,{startFrame:20}),1);assert.equal(zoomScale(35,60,{startFrame:20}),1.35);
  assert.equal(zoomScale(26,60,{startFrame:20,durationSeconds:.3}),zoomScale(13,30,{startFrame:10,durationSeconds:.3}));
  assert.throws(()=>zoomScale(0,60,{startFrame:0,toScale:0}));
});
test('anchored zoom and rotation keep the interaction target at its chosen screen anchor',()=>{
  const world={x:800,y:350},screen={x:540,y:960};
  const m=anchoredCamera(world,screen,1.35,{rotationDegrees:12});
  const at=projectPoint(world,m);assert(Math.hypot(at.x-screen.x,at.y-screen.y)<1e-9);
  const p={x:100,y:700},roundtrip=unprojectPoint(projectPoint(p,m),m);
  assert(Math.hypot(roundtrip.x-p.x,roundtrip.y-p.y)<1e-9);
});
test('recoil shares the complete camera matrix and does not silently move the cursor target',()=>{
  const r=cameraRecoil(102,60,{eventFrame:100}),anchor={x:600,y:400};
  const m=anchoredCamera(anchor,anchor,1.35,r),actual=projectPoint(anchor,m);
  assert(Math.abs(actual.x-anchor.x-r.offsetDeliveryPx.x)<1e-9);assert(Math.abs(actual.y-anchor.y-r.offsetDeliveryPx.y)<1e-9);
  assert.throws(()=>unprojectPoint(anchor,{a:0,b:0,c:0,d:0,e:0,f:0}));
});
test('impact recoil is deterministic, bounded and quiet outside its event window',()=>{
  const o={eventFrame:60};
  assert.deepEqual(cameraRecoil(59,60,o),{offsetDeliveryPx:{x:0,y:0},rotationDegrees:0});
  for(let f=60;f<81;f++){
    const r=cameraRecoil(f,60,o);assert(Math.hypot(r.offsetDeliveryPx.x,r.offsetDeliveryPx.y)<=4);assert(Math.abs(r.rotationDegrees)<=.2);
    assert.deepEqual(cameraRecoil(f,60,o),r);
  }
  assert.deepEqual(cameraRecoil(81,60,o),cameraRecoil(100,60,o));
  assert.deepEqual(cameraRecoil(66,60,o),cameraRecoil(33,30,{eventFrame:30}));
});
test('internal reveals start after declared settlement and preserve their sequence',()=>{
  assert.deepEqual(internalRevealSchedule(40,60),{materialFrom:40,chartFrom:47,digitsFrom:68,settledFrame:86});
  assert.equal(internalRevealSchedule(40,60,{materialSeconds:0}).chartFrom,40);
  assert.throws(()=>internalRevealSchedule(-1,60));assert.throws(()=>internalRevealSchedule(40,60,{chartSeconds:-1}));
});

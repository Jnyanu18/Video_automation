import {test} from 'node:test';
import assert from 'node:assert/strict';
import {variableTypeState,subdivisionFrames,beatSwapIndex,gooAlpha} from '../src/kit/high-kinetic-ui.ts';
test('variable type maps scale, approved weight and em tracking through one eased state',()=>{
  const axis={min:100,max:900};
  assert.deepEqual(variableTypeState(0,axis),{scale:1,weight:400,letterSpacingEm:0});
  assert.deepEqual(variableTypeState(1,axis),{scale:4,weight:900,letterSpacingEm:-.03});
  assert.deepEqual(variableTypeState(.5,axis),{scale:2.5,weight:650,letterSpacingEm:-.015});
  assert.throws(()=>variableTypeState(.5,{min:300,max:700}),/approved font axis/);
  assert.equal(variableTypeState(1,{min:300,max:700},{weightTo:700}).weight,700);
});
test('sixteenth notes round absolute timestamps without cumulative drift',()=>{
  const markers=subdivisionFrames([0,.5,1],60);
  assert.deepEqual(markers,[0,8,15,23,30,38,45,53,60]);
  assert.deepEqual(subdivisionFrames([0,.5,1],60,{offsetFrames:12}),markers.map(f=>f+12));
});
test('beat intervals can follow measured tempo changes and reject unrenderable collisions',()=>{
  assert.deepEqual(subdivisionFrames([0,.5,1.1],60),[0,8,15,23,30,39,48,57,66]);
  assert.throws(()=>subdivisionFrames([0,.01],30),/collide/);
  assert.throws(()=>subdivisionFrames([.5,.4],60));
  assert.throws(()=>subdivisionFrames([0,.5],60,{offsetFrames:-1}));
});
test('word and palette use the same state index at the exact quantized beat',()=>{
  const m=[10,18,25,33,40];
  assert.equal(beatSwapIndex(9,m,4),null);assert.equal(beatSwapIndex(17,m,4),0);
  assert.equal(beatSwapIndex(18,m,4),1);assert.equal(beatSwapIndex(40,m,4),0);
  assert.throws(()=>beatSwapIndex(20,[10,10],4));
});
test('goo alpha has a finite transition band, not a guaranteed geometric merge radius',()=>{
  assert.equal(gooAlpha(0),0);assert.equal(gooAlpha(.473),0);assert.equal(gooAlpha(.5),.5);
  assert.equal(gooAlpha(.527),1);assert.equal(gooAlpha(1),1);
  assert.throws(()=>gooAlpha(-.1));assert.throws(()=>gooAlpha(.5,0));
});

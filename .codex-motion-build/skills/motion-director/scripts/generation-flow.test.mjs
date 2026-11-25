import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
function run(productionPlan,bad=false,overrides={},options={}){
  const dir=mkdtempSync(join(tmpdir(),'motion-planning-test-'));
  const request=JSON.parse(readFileSync(new URL('examples/generation-request.json',root),'utf8'));
  request.productionPlan=productionPlan;
  Object.assign(request,overrides);
  const requestPath=join(dir,'request.json'),output=join(dir,'project.json'),trace=join(dir,'calls.txt'),contextTrace=join(dir,'contexts.jsonl');
  writeFileSync(requestPath,JSON.stringify(request));
  const fixture=options.reusableExecution?'scripts/fixtures/mock-reusable-provider.mjs':'scripts/fixtures/mock-planning-provider.mjs';
  const result=spawnSync(process.execPath,['--import',new URL(fixture,root).href,fileURLToPath(new URL('integration/generate-project.mjs',root)),requestPath,output],{encoding:'utf8',timeout:30000,env:{...process.env,ANTHROPIC_API_KEY:'offline-fixture',CLAUDE_MODEL:'offline-fixture',MOCK_TRACE_FILE:trace,MOCK_BAD_PLAN:bad?'1':'0',MOCK_CONTEXT_FILE:contextTrace,MOCK_INFER_CUSTOM:options.inferredCustom?'1':'0'}});
  return {dir,output,result,calls:existsSync(trace)?readFileSync(trace,'utf8').trim().split('\n'):[],contexts:existsSync(contextTrace)?readFileSync(contextTrace,'utf8').trim().split('\n').map(line=>JSON.parse(line)):[]};
}
test('optional API plan stage validates and saves text metadata with no media work',()=>{
  const r=run(true);
  try{
    assert.equal(r.result.status,0,r.result.stderr);
    assert.deepEqual(r.calls,['interpret_prompt','propose_project','propose_production_plan']);
    assert(existsSync(r.output+'.plan.json'));assert(existsSync(r.output+'.storyboard.html'));
    assert.equal(JSON.parse(readFileSync(r.output+'.plan-report.json','utf8')).cueScheduleMatchesProject,true);
  }finally{rmSync(r.dir,{recursive:true,force:true});}
});
test('ordinary API flow retains two-stage behavior when planning is disabled',()=>{
  const r=run(false);
  try{assert.equal(r.result.status,0,r.result.stderr);assert.deepEqual(r.calls,['interpret_prompt','propose_project']);assert(!existsSync(r.output+'.plan.json'));}
  finally{rmSync(r.dir,{recursive:true,force:true});}
});
test('an explicit custom-motion brief hands off instead of emitting generic starter scenes',()=>{
  const r=run(true,false,{executionProfile:'custom-motion'});
  try{
    assert.equal(r.result.status,3,r.result.stderr);
    assert.deepEqual(r.calls,['interpret_prompt']);
    assert(!existsSync(r.output));
    const route=JSON.parse(readFileSync(r.output+'.route.json','utf8'));
    assert.equal(route.status,'needs_custom_renderer');
    assert.equal(route.executionProfile,'custom-motion');
    assert.equal(route.templateId,null);
  }finally{rmSync(r.dir,{recursive:true,force:true});}
});
test('API plan stage rejects a schedule that differs from the actual project',()=>{
  const r=run(true,true);
  try{assert.notEqual(r.result.status,0);assert.match(r.result.stderr,/differs from project.audio.cues/);assert(!existsSync(r.output+'.plan.json'));}
  finally{rmSync(r.dir,{recursive:true,force:true});}
});

function sparseRequest(withMusic=false){
  const request=JSON.parse(readFileSync(new URL('examples/generation-request.json',root),'utf8'));
  const {brandKit,assetManifest}=request;
  delete brandKit.strategy;
  brandKit.defaults={fps:60};
  const data={prompt:'A bold 12 second portrait photo studio reel at 120 BPM',brandKit,assetManifest};
  if(withMusic){
    assetManifest.push({id:'bed',src:'audio/test-bed.wav',kind:'audio',durationInFrames:750});
    data.musicTiming={assetId:'bed',startSeconds:0,beatSeconds:Array.from({length:24},(_,i)=>i*.5),evidence:'Offline fixture markers'};
  }
  return data;
}

test('sparse prompt picks a coherent style, keeps the exact duration and handles measured or provisional timing',()=>{
  for(const withMusic of [false,true]){
    const r=run(false,false,sparseRequest(withMusic));
    try{
      assert.equal(r.result.status,0,r.result.stderr);
      const direction=JSON.parse(readFileSync(r.output+'.direction.json','utf8'));
      const project=JSON.parse(readFileSync(r.output,'utf8'));
      assert.equal(direction.references.primary.id,'R02');
      assert.equal(direction.references.secondary[0].job,'Give the opening a short headline accent');
      assert.equal(direction.canvas.durationInFrames,720);
      assert.equal(direction.timing.windows.at(-1).toExclusive,720);
      assert.equal(project.canvas.durationInFrames,720);
      assert.equal(project.canvas.width,1080);
      assert.equal(project.audio.voiceover.status,'none');
      if(withMusic){
        assert.equal(direction.timing.mode,'measured-markers');
        assert(direction.timing.windows.some(window=>window.startsOnMeasuredMarker));
        assert.equal(project.audio.cues[0].durationInFrames,720);
      }else{
        assert.equal(direction.timing.mode,'provisional');
        assert.equal(direction.timing.soundtrack,null);
        assert.equal(direction.timing.targetBpm,120);
      }
    }finally{rmSync(r.dir,{recursive:true,force:true});}
  }
});

test('a project cannot claim supplied track timing while moving or shortening that track',()=>{
  const r=run(false,true,sparseRequest(true));
  try{
    assert.notEqual(r.result.status,0);
    assert.match(r.result.stderr,/planned frame placement and length/);
    assert(!existsSync(r.output));
  }finally{rmSync(r.dir,{recursive:true,force:true});}
});

test('reusable execution policy survives interpretation, standard generation and planning without forcing custom routing',()=>{
  const r=run(true,false,{}, {reusableExecution:true});
  try{
    assert.equal(r.result.status,0,r.result.stderr);
    assert.deepEqual(r.calls,['interpret_prompt','propose_project','propose_production_plan']);
    const policy=readFileSync(new URL('references/reusable-execution.md',root),'utf8');
    assert.deepEqual(r.contexts.map(entry=>entry.name),r.calls);
    for(const entry of r.contexts)assert(entry.context.includes(policy),`${entry.name} lost the execution policy`);
    assert(!existsSync(r.output+'.route.json'));
  }finally{rmSync(r.dir,{recursive:true,force:true});}
});

test('sparse quality brief can infer a custom mechanism and retain the complete implementation handoff',()=>{
  const request=sparseRequest(false);
  request.prompt='A dynamic premium 15 second portrait photo studio reel';
  const r=run(true,false,request,{reusableExecution:true,inferredCustom:true});
  try{
    assert.equal(r.result.status,3,r.result.stderr);
    assert.deepEqual(r.calls,['interpret_prompt']);
    assert(!existsSync(r.output),'custom handoff must not masquerade as a standard project');
    const route=JSON.parse(readFileSync(r.output+'.route.json','utf8'));
    assert.equal(route.status,'needs_custom_renderer');
    assert.equal(route.phase,'needs_custom_renderer');
    assert.equal(route.executionProfile,'custom-motion');
    assert.equal(route.implementationReady,false);
    assert.equal(route.workerRequired,true);
    assert.equal(route.executionPolicy.path,'references/reusable-execution.md');
    assert.equal(route.executionPolicy.text,readFileSync(new URL(route.executionPolicy.path,root),'utf8'));
    assert.deepEqual(route.selectedReferences.map(entry=>entry.id),['R02','R03']);
    for(const entry of route.selectedReferences){
      assert.match(entry.text,new RegExp(`^## ${entry.id} — `));
      assert.equal(entry.detail,`references/reference-atlas.md#${entry.id.toLowerCase()}`);
    }
    assert(route.recipeReferences.some(entry=>entry.path==='references/motion-recipes.md'&&entry.text.length>100));
    assert(route.recipeReferences.some(entry=>entry.path==='references/physics-motion.md'));
    assert(route.recipeReferences.some(entry=>entry.path==='references/advanced-ui-motion.md'));
    assert(route.exampleReferences.some(entry=>entry.directory==='examples/frame-photo-studio'&&entry.available));
    assert(route.exampleReferences.some(entry=>entry.directory==='examples/event-stage'&&typeof entry.available==='boolean'));
    assert(route.executionWorkflow.some(entry=>entry.phase==='implementation'));
    assert(route.executionWorkflow.some(entry=>entry.phase==='critique-and-repair'&&/full-speed playback/.test(entry.task)));
    assert.match(route.limitation,/no custom source was generated/);
    assert(r.contexts[0].context.includes(route.executionPolicy.text));
    assert.match(r.contexts[0].context,/including inferred visual direction/);
    const direction=JSON.parse(readFileSync(r.output+'.direction.json','utf8'));
    assert.equal(direction.canvas.durationInFrames,900);
  }finally{rmSync(r.dir,{recursive:true,force:true});}
});

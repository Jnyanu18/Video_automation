// Extend the offline fixture with context inspection and one inferred custom direction.
import './mock-planning-provider.mjs';
import {appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const offlineFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  const request=JSON.parse(options.body),name=request.tools[0].name;
  const context=request.system.map(block=>block.text).join('\n\n');
  if(process.env.MOCK_CONTEXT_FILE)appendFileSync(process.env.MOCK_CONTEXT_FILE,JSON.stringify({name,context})+'\n');
  const response=await offlineFetch(url,options);
  if(name!=='interpret_prompt'||process.env.MOCK_INFER_CUSTOM!=='1')return response;
  const data=JSON.parse(request.messages[0].content);
  assert.equal(data.prompt,'A dynamic premium 15 second portrait photo studio reel');
  assert.doesNotMatch(data.prompt,/morph|persistent|two-sided|3d|custom/i);
  assert.match(context,/quality words/);
  assert.match(context,/including inferred visual direction/);
  const result=await response.json();
  result.content[0].input={
    fields:{durationSeconds:{value:15,evidence:'15 second'},format:{value:'portrait',evidence:'portrait'}},
    creativeDefaults:{evidence:'photo studio reel',message:'Show the studio portfolio and invite a session booking',energy:'punchy',narration:false},
    styleSuggestion:{primaryRef:'R02',secondaryRefs:['R03'],primaryJob:'Carry one portrait card through contact sheet, macro selection and a two-sided product reveal',secondaryJobs:[{ref:'R03',job:'A short kinetic headline accent'}]},
    executionProfile:'custom-motion',
    moods:[{term:'premium',evidence:'premium'}],exactCopy:[],ambiguities:[],
  };
  return Response.json(result);
};

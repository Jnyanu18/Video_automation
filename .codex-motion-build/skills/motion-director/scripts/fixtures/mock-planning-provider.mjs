// Offline provider fixture. Every fetch is intercepted; no network or credentials are used.
import {readFileSync,appendFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('../../',import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('references/design-catalog.json',base),'utf8')).designs;
const sparsePrompt='A bold 12 second portrait photo studio reel at 120 BPM';
const sparsePreset={
  fields:{durationSeconds:{value:12,evidence:'12 second'},format:{value:'portrait',evidence:'portrait'}},
  creativeDefaults:{evidence:'photo studio reel',message:'Show the studio’s photography and invite a session booking',energy:'punchy',narration:false},
  targetTempo:{bpm:120,evidence:'120 BPM'},
  styleSuggestion:{primaryRef:'R02',secondaryRefs:['R03'],primaryJob:'Carry the same portfolio subject through framing and close-up',secondaryJobs:[{ref:'R03',job:'Give the opening a short headline accent'}]},
  moods:[],exactCopy:[],ambiguities:[],
};
const p=JSON.parse(readFileSync(new URL('examples/mixed-launch.json',base),'utf8'));
for(const s of p.scenes){s.from=Math.round(s.from*5/6);s.durationInFrames=Math.round(s.durationInFrames*5/6);}
p.canvas.durationInFrames=900;
p.scenes[3]={id:'proof',from:425,durationInFrames:150,refs:['R01'],headline:'Keep every scene editable.',entryFrames:24,transitionIn:{type:'cut',durationInFrames:0},kind:'type',treatment:'reveal'};
p.audio.cues=p.audio.cues.map(c=>({...c,from:Math.round(c.from*5/6)}));
p.audio.voiceover={status:'pending',text:'Turn your next idea into an editable branded video. Preview it, refine it, and export when it feels right.',from:0,durationInFrames:0};
globalThis.fetch=async(url,options)=>{
  if(String(url)!=='https://api.anthropic.com/v1/messages')throw new Error('Network disabled in fixture');
  const request=JSON.parse(options.body),name=request.tools[0].name;
  const data=JSON.parse(request.messages[0].content);
  if(process.env.MOCK_TRACE_FILE)appendFileSync(process.env.MOCK_TRACE_FILE,name+'\n');
  let input;
  if(name==='interpret_prompt'){
    assert.deepEqual(data.designCatalog.map(card=>card.id),catalog.map(card=>card.id));
    assert(data.designCatalog.every(card=>card.motion&&card.pace&&!('detail' in card)));
    input=data.prompt===sparsePrompt?sparsePreset:{fields:{durationSeconds:{value:15,evidence:'15 second'}},styleSuggestion:{primaryRef:'R08',secondaryRefs:['R03','R01']},moods:[{term:'premium',evidence:'premium'}],exactCopy:[],ambiguities:[]};
  }else if(name==='propose_project'){
    const context=request.system[0].text;
    assert.match(context,/# Choreography and synchronization/);
    assert.doesNotMatch(context,/^# Mixed-media direction|^# High-kinetic UI/m);
    const {direction,resolvedBrief}=data;
    const chosen=[direction.references.primary.id,...direction.references.secondary.map(entry=>entry.id)].sort();
    assert.deepEqual([...context.matchAll(/^## (R\d+) — /gm)].map(entry=>entry[1]).sort(),chosen);
    if(resolvedBrief.expected.canvas.width===1080){
      const track=direction.timing.soundtrack;
      const finalSceneStart=direction.timing.windows.at(-1).from;
      assert.equal(direction.timing.targetBpm,120);
      input={
        ...p,canvas:resolvedBrief.expected.canvas,brand:resolvedBrief.expected.brand,style:resolvedBrief.expected.style,
        assets:track?data.assetManifest.filter(asset=>asset.id===track.assetId||asset.id===p.brand.fontAssetId):p.assets,
        scenes:[
          {id:'portfolio',kind:'type',from:0,durationInFrames:finalSceneStart,refs:['R02','R03'],headline:'See the studio in focus',treatment:'stagger',entryFrames:24,transitionIn:{type:'cut',durationInFrames:0}},
          {...p.scenes.at(-1),refs:['R02'],from:finalSceneStart,durationInFrames:720-finalSceneStart,transitionIn:{type:'cut',durationInFrames:0}},
        ],
        audio:{voiceover:{status:'none',text:'',from:0,durationInFrames:0},cues:track?[
          {id:'bed',assetId:track.assetId,role:'music',from:track.from+(process.env.MOCK_BAD_PLAN==='1'?1:0),durationInFrames:track.durationInFrames,gain:.5,fadeInFrames:0,fadeOutFrames:0},
        ]:[]},
      };
      if(process.env.MOCK_BAD_PLAN==='1')input.audio.cues[0].durationInFrames--;
    }else input=p;
  }
  else if(name==='propose_production_plan'){
    const project=JSON.parse(request.messages[0].content).project;
    input=JSON.parse(readFileSync(new URL('examples/production-plan.json',base),'utf8'));
    input.projectId=project.id;input.projectRevision=project.revision;input.fps=project.canvas.fps;
    input.ending.holdFrames=120;
    input.events=project.audio.cues.map(c=>{
      const s=project.scenes.find(s=>c.from>=s.from&&c.from<s.from+s.durationInFrames);
      return {id:c.id+'-event',sceneId:s.id,localFrame:c.from-s.from,kind:'accent',description:'Offline cue mapping fixture'};
    });
    input.audioCues=project.audio.cues.map(c=>{
      const {from,...fields}=c;
      return {...fields,eventId:c.id+'-event',offsetFrames:0,alignment:{kind:'onset',sourceFrame:0,evidence:'Offline fixture, not a measured source'}};
    });
    if(process.env.MOCK_BAD_PLAN==='1')input.audioCues[0].offsetFrames=1;
  }else throw new Error('Unexpected provider tool: '+name);
  return Response.json({stop_reason:'tool_use',content:[{type:'tool_use',name,input}]});
};

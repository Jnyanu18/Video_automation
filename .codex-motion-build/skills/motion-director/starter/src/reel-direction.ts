import {z} from 'zod';
import type {Intent,ResolvedBrief} from './brief';
import {designCatalog} from './design-catalog';
import type {Project} from './schema';

const MusicTimingSchema=z.object({
  assetId:z.string().min(1).max(80),
  startSeconds:z.number().finite().nonnegative().default(0),
  beatSeconds:z.array(z.number().finite().nonnegative()).min(1).max(4000),
  evidence:z.string().trim().min(1).max(500),
}).strict();

function readMusicTiming(assets:Project['assets'],input:unknown) {
  if(input===undefined)return null;
  const timing=MusicTimingSchema.parse(input);
  const asset=assets.find(item=>item.id===timing.assetId);
  if(asset?.kind!=='audio'||asset.durationInFrames===undefined||
     !Number.isSafeInteger(asset.durationInFrames)||asset.durationInFrames<=0){
    throw new Error('Music timing requires an approved audio asset with duration at the resolved FPS');
  }
  for(let index=1;index<timing.beatSeconds.length;index++){
    if(timing.beatSeconds[index]<=timing.beatSeconds[index-1]){
      throw new Error('Source beat timestamps must increase');
    }
  }
  return {timing,sourceDuration:asset.durationInFrames};
}

/** Give the selector a compact picture of the supplied pulse before loading full detail. */
export function summarizeMusicTiming(assets:Project['assets'],input:unknown){
  const supplied=readMusicTiming(assets,input);
  if(!supplied)return null;
  const {timing}=supplied;
  const spacings=timing.beatSeconds.slice(1)
    .map((seconds,index)=>seconds-timing.beatSeconds[index])
    .sort((a,b)=>a-b);
  return {
    assetId:timing.assetId,
    markerCount:timing.beatSeconds.length,
    typicalMarkerIntervalSeconds:spacings[Math.floor(spacings.length/2)]??null,
  };
}

function resolveSoundtrack(brief:ResolvedBrief,assets:Project['assets'],input:unknown) {
  const supplied=readMusicTiming(assets,input);
  if(!supplied)return null;
  const {timing,sourceDuration}=supplied;
  const {fps,durationInFrames}=brief.expected.canvas;
  const from=Math.round(timing.startSeconds*fps);
  if(from>=durationInFrames)throw new Error('Soundtrack placement begins outside the reel');
  const cueLength=Math.min(sourceDuration,durationInFrames-from);
  const frames=new Set<number>();
  timing.beatSeconds.forEach(seconds=>{
    if(seconds>=sourceDuration/fps)throw new Error('Source beat timestamp lies outside the audio asset');
    const offset=Math.round(seconds*fps);
    if(offset<cueLength)frames.add(from+offset);
  });
  if(!frames.size)throw new Error('Soundtrack timing has no beat marker in the played span');
  return {
    assetId:timing.assetId,from,durationInFrames:cueLength,
    beatFrames:[...frames],evidence:timing.evidence,
  };
}

function pacingWindows(brief:ResolvedBrief,beatFrames:readonly number[]){
  const {fps,durationInFrames}=brief.expected.canvas;
  const seconds=durationInFrames/fps;
  const energy=brief.expected.style.energy;
  const phases=seconds<=5
    ?[['Hook and main action',0],['Closing action',.64]] as const
    :seconds<=10
      ?[['Hook',0],['Hero action and payoff',energy==='punchy'?.20:.25],['Closing action',.76]] as const
      :[['Hook',0],['Setup',energy==='punchy'?.12:.17],['Hero action',.34],['Payoff',.65],['Closing action',.82]] as const;
  const nominal=phases.map(([,position])=>Math.round(position*durationInFrames));
  const starts=[0];
  const beatAligned:number[]=[];
  const tolerance=Math.round(.2*fps);
  for(let index=1;index<nominal.length;index++){
    const target=nominal[index];
    const next=nominal[index+1]??durationInFrames;
    // Keep at least the smaller of 0.6 seconds or half the planned neighboring phases.
    const minSpan=Math.max(1,Math.min(Math.round(.6*fps),Math.floor((next-target)/2),Math.floor((target-nominal[index-1])/2)));
    const lower=starts[index-1]+minSpan;
    const upper=index===nominal.length-1?target:next-minSpan;
    let match:number|undefined;
    for(const frame of beatFrames){
      if(frame<lower||frame>upper||Math.abs(frame-target)>tolerance)continue;
      if(match===undefined||Math.abs(frame-target)<Math.abs(match-target))match=frame;
    }
    starts.push(match??target);
    if(match!==undefined)beatAligned.push(index);
  }
  return phases.map(([role],index)=>({
    role,from:starts[index],toExclusive:starts[index+1]??durationInFrames,
    startsOnMeasuredMarker:beatAligned.includes(index),
  }));
}

/** Assign roles after resolving the kit and user overrides. Use suggested jobs only for selected designs. */
export function buildReelDirection(brief:ResolvedBrief,intent:Intent,assets:Project['assets'],musicTiming:unknown){
  const {primaryRef,secondaryRefs,energy}=brief.expected.style;
  const suggestion=intent.styleSuggestion;
  const primary=designCatalog.find(design=>design.id===primaryRef)!;
  const soundtrack=resolveSoundtrack(brief,assets,musicTiming);
  return {
    version:1,
    canvas:brief.expected.canvas,
    concept:brief.decisions.message.value,
    energy,
    references:{
      primary:{id:primaryRef,job:suggestion?.primaryRef===primaryRef&&brief.decisions.primaryRef.source==='inference'
        ?suggestion.primaryJob??primary.motion:primary.motion},
      secondary:secondaryRefs.map(ref=>({
        id:ref,job:brief.decisions.secondaryRefs.source==='inference'
          ?suggestion?.secondaryJobs?.find(item=>item.ref===ref)?.job??designCatalog.find(design=>design.id===ref)!.motion
          :designCatalog.find(design=>design.id===ref)!.motion,
      })),
    },
    assumptions:Object.entries(brief.decisions)
      .filter(([field,decision])=>['format','durationSeconds','fps','energy','message','narration'].includes(field)&&['inference','product-default'].includes(decision.source))
      .map(([field,decision])=>({field,value:decision.value})),
    timing:{
      mode:soundtrack?'measured-markers':'provisional',
      targetBpm:brief.targetBpm??null,
      soundtrack,
      windows:pacingWindows(brief,soundtrack?.beatFrames??[]),
    },
  } as const;
}

export function validateDirectionSoundtrack(project:Project,direction:ReturnType<typeof buildReelDirection>){
  const track=direction.timing.soundtrack;
  if(!track)return;
  const tracks=project.audio.cues.filter(cue=>cue.role==='music'&&cue.assetId===track.assetId);
  const cue=tracks[0];
  if(tracks.length!==1||cue.from!==track.from||cue.durationInFrames!==track.durationInFrames||cue.gain<=0){
    throw new Error('Project must keep the selected soundtrack at its planned frame placement and length');
  }
}

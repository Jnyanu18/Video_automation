/** Original planning helpers. Metadata only: no renderer, synthesis or mixing. */
import {z} from 'zod';
import type {Project} from './schema';

const id=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const frame=z.number().int().nonnegative();
const positiveFrame=z.number().int().positive();
const note=z.string().min(1).max(1200);

export const ProductionPlanSchema=z.object({
  version:z.literal(1),projectId:id,projectRevision:positiveFrame,fps:z.number().int().positive(),
  direction:z.enum(['kinetic-editorial','continuous-product','hybrid']),
  ending:z.object({sceneId:id,goal:note,settledFromLocalFrame:frame,holdFrames:positiveFrame}).strict(),
  shots:z.array(z.object({
    sceneId:id,purpose:note,focalElement:note,entry:note,hold:note,exit:note,
    camera:z.object({mode:z.enum(['locked','continuous','intentional-cut']),path:note}).strict(),
    outgoing:z.object({toSceneId:id,mode:z.enum(['hard-cut','match','action','occlusion','scale-bridge','morph']),anchor:note,becomes:note}).strict().optional(),
    assetUses:z.array(z.object({assetId:id,maxDisplayWidthPx:z.number().positive().finite(),maxDisplayHeightPx:z.number().positive().finite(),fit:z.enum(['contain','cover']),reason:note}).strict()).max(30),
  }).strict()).min(1).max(50),
  events:z.array(z.object({id,sceneId:id,localFrame:frame,kind:z.enum(['contact','arrival','settle','cut','accent']),description:note}).strict()).max(300),
  audioCues:z.array(z.object({
    id,eventId:id,assetId:id,offsetFrames:z.number().int(),
    alignment:z.object({kind:z.enum(['onset','perceptual-peak','riser-end']),sourceFrame:frame,evidence:note}).strict(),
    durationInFrames:positiveFrame,gain:z.number().min(0).max(1),fadeInFrames:frame,fadeOutFrames:frame,role:z.enum(['sfx','music']),
  }).strict()).max(150),
}).strict();
export type ProductionPlan=z.infer<typeof ProductionPlanSchema>;
export type TimelineContext=Pick<Project,'id'|'revision'|'canvas'|'assets'> & {
  scenes:Array<Pick<Project['scenes'][number],'id'|'from'|'durationInFrames'|'entryFrames'|'transitionIn'>>;
};

/** Checks referential/timing integrity, not the quality or truth of prose. */
export function validateProductionPlan(input:unknown,project:TimelineContext):ProductionPlan {
  const p=ProductionPlanSchema.parse(input),errors:string[]=[];
  if(p.projectId!==project.id||p.projectRevision!==project.revision)errors.push('Plan belongs to another project/revision; revalidate after edits');
  if(p.fps!==project.canvas.fps)errors.push('Plan FPS differs; resolve all frame values at the current FPS');
  if(p.shots.length!==project.scenes.length||p.shots.some((s,i)=>s.sceneId!==project.scenes[i]?.id))errors.push('Shots must cover current scenes exactly once in timeline order');
  const scenes=new Map(project.scenes.map(s=>[s.id,s])),assets=new Map(project.assets.map(a=>[a.id,a]));
  const unique=(items:string[],label:string)=>{if(new Set(items).size!==items.length)errors.push(`Duplicate ${label} IDs`);};
  unique(p.events.map(e=>e.id),'event');unique(p.audioCues.map(c=>c.id),'planned cue');
  const last=project.scenes.at(-1);
  if(p.ending.sceneId!==last?.id)errors.push('Ending must name the final scene');
  // Entry and incoming transition run concurrently. Later child animations need
  // a declared settlement frame and visual review; this is only a lower bound.
  if(last&&(p.ending.settledFromLocalFrame<Math.max(last.entryFrames,last.transitionIn.durationInFrames)||p.ending.settledFromLocalFrame+p.ending.holdFrames>last.durationInFrames))errors.push('Ending hold exceeds declared settled time or begins before entry/transition completion');
  p.shots.forEach((s,i)=>{
    const next=project.scenes[i+1];
    if(next&&s.outgoing?.toSceneId!==next.id)errors.push(`${s.sceneId}: outgoing handover must name next scene`);
    if(!next&&s.outgoing)errors.push(`${s.sceneId}: final shot cannot hand over to another scene`);
    for(const usage of s.assetUses)if(!['image','video'].includes(assets.get(usage.assetId)?.kind??''))errors.push(`${s.sceneId}: unknown visual asset ${usage.assetId}`);
  });
  const events=new Map(p.events.map(e=>[e.id,e]));
  for(const e of p.events){
    const s=scenes.get(e.sceneId);
    if(!s||e.localFrame>=s.durationInFrames)errors.push(`${e.id}: event is outside its scene`);
  }
  for(const c of p.audioCues){
    const e=events.get(c.eventId),s=e&&scenes.get(e.sceneId),a=assets.get(c.assetId);
    if(!e||!s)errors.push(`${c.id}: unresolved motion event`);
    if(a?.kind!=='audio'||a.durationInFrames===undefined)errors.push(`${c.id}: needs approved audio with measured duration`);
    if(a?.durationInFrames!==undefined&&c.durationInFrames>a.durationInFrames)errors.push(`${c.id}: cue exceeds source duration`);
    if(c.alignment.sourceFrame>c.durationInFrames||(c.alignment.kind!=='riser-end'&&c.alignment.sourceFrame===c.durationInFrames))errors.push(`${c.id}: invalid source alignment frame`);
    if(c.fadeInFrames+c.fadeOutFrames>c.durationInFrames)errors.push(`${c.id}: fades exceed cue duration`);
    if(s&&e){
      const from=s.from+e.localFrame+c.offsetFrames-c.alignment.sourceFrame;
      if(from<0||from+c.durationInFrames>project.canvas.durationInFrames)errors.push(`${c.id}: resolved cue extends outside project; adjust explicitly, never clip silently`);
    }
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return p;
}

/** Recompute from current scene starts, never from old absolute cue positions. */
export function resolveCueTiming(input:unknown,project:TimelineContext):Project['audio']['cues'] {
  const p=validateProductionPlan(input,project),scenes=new Map(project.scenes.map(s=>[s.id,s]));
  const events=new Map(p.events.map(e=>[e.id,e]));
  return p.audioCues.map(c=>{
    const e=events.get(c.eventId)!,s=scenes.get(e.sceneId)!;
    return {id:c.id,assetId:c.assetId,from:s.from+e.localFrame+c.offsetFrames-c.alignment.sourceFrame,
      durationInFrames:c.durationInFrames,gain:c.gain,fadeInFrames:c.fadeInFrames,fadeOutFrames:c.fadeOutFrames,role:c.role};
  });
}

/** Bind a planning sidecar to what the current preview actually plays. */
export function validatePlanForProject(input:unknown,project:Project):ProductionPlan {
  const p=validateProductionPlan(input,project),cues=resolveCueTiming(p,project);
  const actual=new Map(project.audio.cues.map(c=>[c.id,c]));
  if(cues.length!==actual.size||cues.some(c=>{
    const a=actual.get(c.id);
    return !a||Object.entries(c).some(([key,value])=>a[key as keyof typeof a]!==value);
  }))throw new Error('Plan cue schedule differs from project.audio.cues. Apply intended cue edits to a new draft, validateProject, then revalidate the plan; no audio was changed.');
  return p;
}

/** Frame requests for an existing renderer. Does not render images or inspect them. */
export function buildReviewFrames(input:unknown,project:TimelineContext):number[] {
  const p=validateProductionPlan(input,project),frames=new Set<number>();
  for(const s of project.scenes){
    frames.add(s.from);frames.add(s.from+s.durationInFrames-1);
    frames.add(s.from+Math.min(s.durationInFrames-1,s.transitionIn.durationInFrames+s.entryFrames));
    if(s.from>0)frames.add(s.from-1);
    const t=s.transitionIn.durationInFrames;
    if(t>0)for(const fraction of [0,.25,.5,.75,1])frames.add(s.from+Math.round((t-1)*fraction));
  }
  const byId=new Map(project.scenes.map(s=>[s.id,s]));
  for(const e of p.events)frames.add(byId.get(e.sceneId)!.from+e.localFrame);
  return [...frames].sort((a,b)=>a-b);
}

const InspectionSchema=z.object({assetId:id,format:z.enum(['raster','vector']),width:z.number().positive().finite().optional(),height:z.number().positive().finite().optional()}).strict();
export type AssetInspection=z.infer<typeof InspectionSchema>;
/** Host-probed metadata only. Includes the maximum camera enlargement at delivery size. */
export function inspectAssetResolution(input:unknown,project:TimelineContext,metadata:AssetInspection[]) {
  const p=validateProductionPlan(input,project),items=z.array(InspectionSchema).parse(metadata);
  if(new Set(items.map(a=>a.assetId)).size!==items.length)throw new Error('Duplicate asset inspection IDs');
  const byId=new Map(items.map(a=>[a.assetId,a]));
  return p.shots.flatMap(s=>s.assetUses.map(u=>{
    const m=byId.get(u.assetId),base={sceneId:s.sceneId,assetId:u.assetId};
    if(!m)return {...base,status:'unmeasured' as const};
    if(m.format==='vector')return {...base,status:'vector' as const};
    if(!m.width||!m.height)return {...base,status:'unmeasured' as const};
    const ratios=[u.maxDisplayWidthPx/m.width,u.maxDisplayHeightPx/m.height];
    const scale=u.fit==='cover'?Math.max(...ratios):Math.min(...ratios);
    return {...base,status:scale>1?'upscaled' as const:'adequate' as const,scale};
  }));
}

/** Translation applied to a full image rectangle to center its visible alpha bounds. */
export function visibleCenterOffset(width:number,height:number,bounds:{x:number;y:number;width:number;height:number}) {
  if(![width,height,bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||width<=0||height<=0||bounds.x<0||bounds.y<0||bounds.width<=0||bounds.height<=0||bounds.x+bounds.width>width||bounds.y+bounds.height>height)throw new Error('Invalid visible bounds');
  return {x:width/2-(bounds.x+bounds.width/2),y:height/2-(bounds.y+bounds.height/2)};
}

const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** A text planning board, not representative artwork or a rendered preview. */
export function storyboardHtml(input:unknown,project:TimelineContext):string {
  const p=validateProductionPlan(input,project),e=escapeHtml;
  const rows=p.shots.map((s,i)=>{
    const scene=project.scenes[i];
    const outgoing=s.outgoing?`${s.outgoing.mode}: ${s.outgoing.anchor} → ${s.outgoing.becomes} (${s.outgoing.toSceneId})`:'Final lockup';
    return `<article><h2>${i+1}. ${e(s.sceneId)}</h2><small>Frames ${scene.from}–${scene.from+scene.durationInFrames-1} · ${(scene.from/project.canvas.fps).toFixed(2)}s · ${scene.durationInFrames} frames</small><h3>${e(s.purpose)}</h3><dl>${[['Focus',s.focalElement],['Entry',s.entry],['Hold',s.hold],['Exit',s.exit],['Camera',`${s.camera.mode}: ${s.camera.path}`],['Handover',outgoing],['Assets',s.assetUses.map(a=>`${a.assetId}: ${a.maxDisplayWidthPx}×${a.maxDisplayHeightPx}px ${a.fit}; ${a.reason}`).join('; ')||'No external visual assets']].map(([k,v])=>`<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><meta name="viewport" content="width=device-width"><title>Production plan ${e(p.projectId)}</title><style>body{margin:32px;background:#f4f1ea;color:#171719;font:16px system-ui;line-height:1.5}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{background:white;padding:24px;border:1px solid #aaa}h1,h2,h3{line-height:1.2}small{font-family:monospace}dt{font-weight:700;margin-top:12px}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>${e(p.projectId)} / revision ${p.projectRevision}</h1><p>Text planning board only. No rendered frames, playback or audio review.</p><p>Direction: ${e(p.direction)}. Ending: ${e(p.ending.goal)}. Settled hold: ${p.ending.holdFrames} frames.</p><main>${rows}</main></html>`;
}

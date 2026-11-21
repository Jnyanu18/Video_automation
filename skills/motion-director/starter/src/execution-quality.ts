/** Checks supplied measurements from actual component state or rendered samples.
 * Does not render, observe pixels, listen, prove provenance, or rate artistic quality. */
import {z} from 'zod';
const frame=z.number().int().nonnegative();
const id=z.string().min(1).max(160);
const point=z.object({x:z.number().finite(),y:z.number().finite(),z:z.number().finite().optional()}).strict();
const reviewState=z.enum(['passed','failed','pending','unavailable']);
export const ExecutionQualitySchema=z.object({
 version:z.literal(1),projectId:id,projectRevision:z.number().int().positive(),fps:z.number().int().positive().max(240),durationInFrames:z.number().int().positive(),
 evidence:z.object({mode:z.enum(['planned','component-sampled','render-sampled']),sourceHash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),notes:z.string().min(1)}).strict(),
 requiredProbes:z.array(z.enum(['contact','beat-word','cover'])),
 contacts:z.array(z.object({id,frame,space:z.enum(['world','screen']),objectBoundary:point,surface:point,tolerancePx:z.number().finite().nonnegative()}).strict()),
 beatWords:z.array(z.object({id,beatFrame:frame,firstReadableFrame:frame,intentionalOffsetFrames:z.number().int(),toleranceFrames:z.number().int().nonnegative()}).strict()),
 covers:z.array(z.object({id,cutFrame:frame,samples:z.array(z.object({frame,coveredFraction:z.number().min(0).max(1),outgoingForegroundAlpha:z.number().min(0).max(1)}).strict()).min(1)}).strict()),
 readableHolds:z.array(z.object({sceneId:id,firstReadableFrame:frame,lastReadableFrame:frame,minimumFrames:z.number().int().positive()}).strict()).min(1),
 ending:z.object({sceneId:id,firstReadableFrame:frame,lastReadableFrame:frame,minimumHoldFrames:z.number().int().positive()}).strict(),
 shots:z.array(z.object({sceneId:id,layout:id,typeMechanic:id,focalAction:id}).strict()).min(1),intentionalRepeatReason:z.string().min(1).optional(),
 assets:z.array(z.object({id,kind:z.enum(['logo','font','image','video','audio']),status:z.enum(['original','approved-derivative','placeholder','missing']),requiredForFinal:z.boolean()}).strict()),
 checks:z.object({typecheck:reviewState,randomFrameRepeat:reviewState,frameInspection:reviewState,fullSpeedPlayback:reviewState,audioListening:reviewState}).strict(),
 findings:z.array(z.object({id,frames:z.array(frame).min(1),severity:z.enum(['blocking','improvement']),observation:z.string().min(1),repair:z.string().min(1).nullable(),evidence:z.array(z.string().min(1)),status:z.enum(['open','resolved'])}).strict()).default([]),
}).strict();
export type ExecutionQualityInput=z.infer<typeof ExecutionQualitySchema>;
export function reviewExecution(input:unknown){
 const p=ExecutionQualitySchema.parse(input),errors:string[]=[],warnings:string[]=[],pending:string[]=[];
 const inFilm=(f:number,label:string)=>{if(f>=p.durationInFrames)errors.push(`${label}: frame ${f} is outside the film`);};
 for(const kind of p.requiredProbes){const n=kind==='contact'?p.contacts.length:kind==='beat-word'?p.beatWords.length:p.covers.length;if(n===0)errors.push(`Missing required ${kind} probes`);}
 for(const group of [p.contacts,p.beatWords,p.covers,p.assets])if(new Set(group.map(x=>x.id)).size!==group.length)errors.push('Duplicate probe/asset IDs within a group');
 const contacts=p.contacts.map(c=>{inFilm(c.frame,c.id);if(c.space==='world'&&(c.objectBoundary.z===undefined)!==(c.surface.z===undefined))errors.push(`${c.id}: contact dimensions differ`);const distancePx=Math.hypot(c.objectBoundary.x-c.surface.x,c.objectBoundary.y-c.surface.y,c.space==='screen'?0:(c.objectBoundary.z??0)-(c.surface.z??0));if(distancePx>c.tolerancePx)errors.push(`${c.id}: boundary misses surface by ${distancePx.toFixed(3)}px`);return{id:c.id,distancePx,withinTolerance:distancePx<=c.tolerancePx};});
 const beatWords=p.beatWords.map(w=>{inFilm(w.beatFrame,w.id);inFilm(w.firstReadableFrame,w.id);const offsetFrames=w.firstReadableFrame-w.beatFrame-w.intentionalOffsetFrames;if(Math.abs(offsetFrames)>w.toleranceFrames)errors.push(`${w.id}: readable word is ${offsetFrames} frames from intended beat`);return{id:w.id,offsetFrames,withinTolerance:Math.abs(offsetFrames)<=w.toleranceFrames};});
 for(const cover of p.covers){inFilm(cover.cutFrame,cover.id);const seen=new Set(cover.samples.map(s=>s.frame));for(const needed of [cover.cutFrame-1,cover.cutFrame,cover.cutFrame+1].filter(f=>f>=0&&f<p.durationInFrames))if(!seen.has(needed))errors.push(`${cover.id}: missing coverage sample at ${needed}`);for(const s of cover.samples){inFilm(s.frame,cover.id);if(s.coveredFraction<1-1e-6||s.outgoingForegroundAlpha>.01)errors.push(`${cover.id}: cover or foreground yield fails at frame ${s.frame}`);}}
 const shotIds=new Set(p.shots.map(s=>s.sceneId));
 for(const h of p.readableHolds){if(!shotIds.has(h.sceneId))errors.push(`${h.sceneId}: readable hold has unknown shot ID`);inFilm(h.firstReadableFrame,h.sceneId);inFilm(h.lastReadableFrame,h.sceneId);const available=h.lastReadableFrame-h.firstReadableFrame+1;if(available<h.minimumFrames)errors.push(`${h.sceneId}: readable hold ${available} < ${h.minimumFrames} frames`);}
 inFilm(p.ending.firstReadableFrame,'ending');inFilm(p.ending.lastReadableFrame,'ending');
 if(p.ending.sceneId!==p.shots.at(-1)!.sceneId)errors.push('Ending must reference the final shot');
 if(p.ending.lastReadableFrame-p.ending.firstReadableFrame+1<p.ending.minimumHoldFrames)errors.push('Ending has insufficient readable hold');
 if(!p.readableHolds.some(h=>h.sceneId===p.ending.sceneId&&h.firstReadableFrame<=p.ending.firstReadableFrame&&h.lastReadableFrame>=p.ending.lastReadableFrame))errors.push('Ending readability contradicts its actual readable-hold range');
 if(new Set(p.shots.map(s=>s.sceneId)).size!==p.shots.length)errors.push('Duplicate shot IDs');
 if(p.shots.length>=3&&!p.intentionalRepeatReason){if(new Set(p.shots.map(s=>s.layout)).size===1)warnings.push('All shots use one layout: inspect scale/framing and focal hierarchy');if(new Set(p.shots.map(s=>s.typeMechanic)).size===1)warnings.push('All shots use one text mechanism: inspect repeated reveals');}
 const unresolvedAssets=p.assets.filter(a=>a.requiredForFinal&&['placeholder','missing'].includes(a.status)).map(a=>a.id);
 for(const finding of p.findings){for(const f of finding.frames)inFilm(f,finding.id);if(finding.status==='resolved'&&(!finding.repair||!finding.evidence.length))errors.push(`${finding.id}: resolved finding needs a repair and refreshed evidence`);else if(finding.status==='open'){if(finding.severity==='blocking')errors.push(`${finding.id}: unresolved visual/audio finding`);else warnings.push(`${finding.id}: open improvement suggestion`);}}
 for(const [key,value]of Object.entries(p.checks)){if(value==='failed')errors.push(`${key} failed`);else if(value!=='passed')pending.push(`${key}: ${value}`);}
 if(p.evidence.mode==='planned')pending.push('Measurements are planned; component/render sampling is pending');
 if(p.evidence.mode!=='planned'&&!p.evidence.sourceHash)pending.push('Measured review is not bound to an immutable source hash');
 const status=errors.length?'needs-repair':unresolvedAssets.length?'needs-assets':pending.length?'review-pending':'checks-complete';
 return{projectId:p.projectId,projectRevision:p.projectRevision,fps:p.fps,durationInFrames:p.durationInFrames,evidence:p.evidence,status,structuralChecksPassed:errors.length===0,errors,warnings,pending,unresolvedAssets,contacts,beatWords,findings:p.findings,
  limitation:'Evaluates supplied measurements and review declarations only. The host must bind actual component/render evidence to this revision. checks-complete is not an artistic rating, provenance verification or user approval.'};
}

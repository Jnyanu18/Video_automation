import {z} from 'zod';
import type {Project} from './schema';
import {validatePlanForProject} from './production-plan';

const frame=z.number().int().nonnegative().safe();
const id=z.string().min(1).max(80);
export const SyncReviewSchema=z.object({
  projectId:id,
  projectRevision:frame.positive(),
  fps:frame.positive(),
  checks:z.array(z.object({
    eventId:id,
    cueId:id,
    sourceSeconds:z.number().finite().nonnegative(),
    // Positive means the sound marker should follow the visual event.
    audioOffsetFrames:z.number().int().safe().default(0),
    toleranceFrames:frame.default(1),
    observedVisualFrame:frame.optional(),
    evidence:z.string().trim().min(1).max(1200),
  }).strict()).min(1).max(300),
}).strict();

/** Compare named visual events to supplied audio markers in the current mix schedule. */
export function reviewSync(project:Project,planInput:unknown,reviewInput:unknown) {
  const plan=validatePlanForProject(planInput,project);
  const review=SyncReviewSchema.parse(reviewInput);
  const {fps,durationInFrames}=project.canvas;
  if(review.projectId!==project.id||review.projectRevision!==project.revision||review.fps!==fps) {
    throw new Error('Sync review must match the project ID, revision and FPS');
  }

  const scenes=new Map(project.scenes.map(scene=>[scene.id,scene]));
  const events=new Map(plan.events.map(event=>[event.id,event]));
  const cues=new Map(project.audio.cues.map(cue=>[cue.id,cue]));
  const reviewFrames=new Set<number>();
  const results=review.checks.map(check=>{
    const event=events.get(check.eventId);
    const cue=cues.get(check.cueId);
    if(!event||!cue) throw new Error(`Unknown visual event or audio cue: ${check.eventId}, ${check.cueId}`);
    // Starter cues always play from the first source sample. The active span excludes its end.
    if(check.sourceSeconds>=cue.durationInFrames/fps) throw new Error(`${check.cueId}: marker lies outside its played source span`);
    const sourceFrame=Math.round(check.sourceSeconds*fps);
    const audioFrame=cue.from+sourceFrame;
    const expectedVisualFrame=audioFrame-check.audioOffsetFrames;
    const plannedVisualFrame=scenes.get(event.sceneId)!.from+event.localFrame;
    const {observedVisualFrame,toleranceFrames}=check;
    if(expectedVisualFrame<0||expectedVisualFrame>=durationInFrames||
       (observedVisualFrame!==undefined&&observedVisualFrame>=durationInFrames)) {
      throw new Error(`${check.eventId}: visual frame lies outside the project`);
    }
    for(const f of [expectedVisualFrame,plannedVisualFrame,observedVisualFrame]) {
      if(f===undefined) continue;
      for(const neighbor of [f-1,f,f+1]) {
        if(neighbor>=0&&neighbor<durationInFrames) reviewFrames.add(neighbor);
      }
    }
    const plannedDeltaFrames=plannedVisualFrame-expectedVisualFrame;
    const observedDeltaFrames=observedVisualFrame===undefined?null:observedVisualFrame-expectedVisualFrame;
    return {
      ...check,
      audioFrame,
      expectedVisualFrame,
      plannedVisualFrame,
      plannedDeltaFrames,
      observedDeltaFrames,
      withinTolerance:Math.abs(plannedDeltaFrames)<=toleranceFrames&&
        (observedDeltaFrames===null||Math.abs(observedDeltaFrames)<=toleranceFrames),
    };
  });

  return {
    withinTolerance:results.every(check=>check.withinTolerance),
    observedCount:results.filter(check=>check.observedDeltaFrames!==null).length,
    checks:results,
    reviewFrames:[...reviewFrames].sort((a,b)=>a-b),
    limitation:'Compares supplied markers against the edit schedule and optional visual observations. Check the encoded soundtrack and full playback separately.',
  };
}

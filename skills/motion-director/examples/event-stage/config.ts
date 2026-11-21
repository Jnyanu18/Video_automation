import {z} from 'zod';
const hex=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const frame=z.number().int().min(0).max(899);
const localAsset=z.string().regex(/^(?!\/)(?!.*\.\.)[a-zA-Z0-9_. /-]+$/,'Use a staged relative public asset');
const copy=(max=90)=>z.string().trim().min(1).max(max);
export const eventIds=['spark-contact','stage-unfold','stage-arrival','lights','energy','action','detail-burst','detail-lock','moment-pullback','moment-lock','brand-cover','logo-arrival','final-settle'] as const;
export type EventId=typeof eventIds[number];
export const EventStageSchema=z.object({
 id:copy(80),revision:z.number().int().positive(),skillVersion:z.literal('2.1.0'),status:z.literal('review-copy'),fictionalBrand:z.boolean(),brand:copy(32),category:copy(40),tagline:copy(60),
 width:z.literal(1080),height:z.literal(1920),fps:z.literal(60),durationInFrames:z.literal(900),palette:z.object({orange:hex,white:hex,black:hex}).strict(),
 geometry:z.object({floorY:z.number().min(1200).max(1400),ballDiameter:z.number().min(60).max(120),fallStartY:z.number().min(650).max(950),contactX:z.literal(540)}).strict(),
 assets:z.object({logo:localAsset.nullable(),grain:localAsset,audio:localAsset}).strict(),references:z.object({primary:z.literal('R03'),secondary:z.array(z.enum(['R02','R10'])).max(2)}).strict(),
 audio:z.object({bpm:z.literal(120),beatPhaseFrame:z.literal(0),narration:z.literal('none'),source:copy(200)}).strict(),
 scenes:z.array(z.object({id:copy(80),from:frame,durationInFrames:z.number().int().positive(),headline:z.array(copy(18)).min(1).max(3),label:copy(40)}).strict()).length(6),
 events:z.array(z.object({id:z.enum(eventIds),frame,sound:z.enum(['impact','tick','whoosh-impact','whoosh','tail'])}).strict()).length(eventIds.length),
 copy:z.object({passTitle:copy(18),passSubtitle:copy(18),passFooter:copy(55),passBadge:copy(20),stageTitle:copy(18),stageStatus:copy(35),hudTagline:copy(36),sparkLine:copy(70),buildLine:copy(70),detailLine:copy(70),detailLabels:z.array(copy(18)).length(3),cta:copy(50)}).strict()
}).strict();
export type EventStageProject=z.infer<typeof EventStageSchema>;
export function validateEventStage(input:unknown):EventStageProject {
 const p=EventStageSchema.parse(input);let end=0;const ids=new Set<string>();
 const sceneIds=['spark','build','showtime','details','moment','identity'];
 for(const [i,s] of p.scenes.entries()){
  if(s.id!==sceneIds[i]||s.from!==end||ids.has(s.id))throw Error('Use the six supported stable scene IDs with no gap or overlap');
  if(s.headline.length!==(i===2?3:i===5?1:2))throw Error(`${s.id}: incorrect headline count for this recipe`);
  end+=s.durationInFrames;ids.add(s.id);
 }
 if(end!==900)throw Error('This supported recipe is exactly900 frames; other durations require adapting source/schema/score');
 if(new Set(p.events.map(e=>e.id)).size!==p.events.length)throw Error('Duplicate event');
 const at=(id:EventId)=>p.events.find(e=>e.id===id)!.frame;
 for(const [id,index] of [['stage-unfold',1],['lights',2],['detail-burst',3],['moment-pullback',4],['logo-arrival',5]] as const)
  if(at(id)!==p.scenes[index].from)throw Error(`${id}: event must follow its scene boundary`);
 if(!(12<=at('spark-contact')&&at('spark-contact')+40<at('stage-unfold')))throw Error('Spark contact needs approach and pass reading room');
 if(!(at('stage-unfold')<at('stage-arrival')&&at('stage-arrival')<at('lights')))throw Error('Stage arrival must remain within build');
 if(!(at('lights')<at('energy')&&at('energy')<at('action')&&at('action')+20<at('detail-burst')))throw Error('Whole-word markers need increasing readable windows');
 if(!(at('detail-burst')<at('detail-lock')&&at('detail-lock')<at('moment-pullback')))throw Error('Detail settlement must remain within details');
 if(!(at('moment-pullback')<at('moment-lock')&&at('moment-lock')+30<at('brand-cover')))throw Error('Moment lock needs a readable hold before cover');
 if(!(at('brand-cover')>=at('moment-pullback')+45&&at('brand-cover')+24<=at('logo-arrival')))throw Error('Cover requires at least24 frames before identity handover');
 if(!(at('final-settle')>=at('logo-arrival')+30&&at('final-settle')+90<=900))throw Error('Identity needs complete entry and at least90 settled frames');
 return p;
}

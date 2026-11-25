import {z} from 'zod';

const frame = z.number().int().nonnegative();
const positiveFrame = z.number().int().positive();
const ref = z.enum(['R01','R02','R03','R04','R05','R06','R07','R08','R09','R10','R11']);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use six-digit hex colors');
const ident = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
// Local paths are relative to public/. Remote URLs must be resolved/allowlisted by the host.
const src = z.string().refine(s => {
  if (s.startsWith('https://')) {try {return !new URL(s).username && !new URL(s).password;} catch {return false;}}
  return /^(audio|assets)\/[a-zA-Z0-9_./-]+$/.test(s) && !s.split('/').includes('..');
}, 'Use an approved HTTPS asset or audio/assets path without traversal');
const common = {
  id: ident, from: frame, durationInFrames: positiveFrame,
  refs: z.array(ref).min(1).max(3),
  headline: z.string().min(1).max(110),
  subheadline: z.string().max(180).optional(),
  background: color.optional(),
  transitionIn: z.object({type:z.enum(['cut','wipe','iris','push']),durationInFrames:frame}).strict(),
  entryFrames: positiveFrame,
};
const scenes = z.discriminatedUnion('kind', [
  z.object({...common,kind:z.literal('type'),treatment:z.enum(['reveal','stagger','tracking']),emphasis:z.string().max(40).optional()}).strict(),
  z.object({...common,kind:z.literal('ui'),template:z.enum(['input','checklist','approval','player']),label:z.string().max(70),value:z.string().max(100),steps:z.array(z.string().max(60)).max(5)}).strict(),
  z.object({...common,kind:z.literal('metric'),label:z.string().max(70),value:z.number().finite(),prefix:z.string().max(8),suffix:z.string().max(12),decimals:z.number().int().min(0).max(2)}).strict(),
  z.object({...common,kind:z.literal('gallery'),cards:z.array(z.object({title:z.string().max(45),assetId:ident.optional()}).strict()).min(2).max(9)}).strict(),
  z.object({...common,kind:z.literal('orbit'),particleCount:z.number().int().min(24).max(360)}).strict(),
  z.object({...common,kind:z.literal('illustration'),diagram:z.enum(['growth','workflow'])}).strict(),
  z.object({...common,kind:z.literal('cta'),buttonLabel:z.string().max(40),website:z.string().max(100)}).strict(),
]);

export const ProjectSchema = z.object({
  version:z.literal(1), id:ident, revision:positiveFrame, title:z.string().min(1).max(100),
  canvas:z.object({width:z.number().int().min(320).max(3840),height:z.number().int().min(320).max(3840),fps:z.union([z.literal(24),z.literal(25),z.literal(30),z.literal(60)]),durationInFrames:positiveFrame}).strict(),
  brand:z.object({name:z.string().min(1).max(45),background:color,foreground:color,primary:color,secondary:color,surface:color,muted:color,fontFamily:z.string().min(1).max(100),fontAssetId:ident.optional(),logoAssetId:ident.optional(),radius:z.number().min(0).max(80)}).strict(),
  style:z.object({primaryRef:ref,secondaryRefs:z.array(ref).max(2),energy:z.enum(['restrained','balanced','punchy'])}).strict(),
  assets:z.array(z.object({id:ident,kind:z.enum(['image','video','audio','font']),src,durationInFrames:positiveFrame.optional()}).strict()).max(120),
  scenes:z.array(scenes).min(1).max(50),
  audio:z.object({
    voiceover:z.object({status:z.enum(['none','pending','ready']),text:z.string().max(6000),assetId:ident.optional(),from:frame,durationInFrames:frame,voiceId:z.string().max(100).optional(),alignmentAsset:z.string().max(150).optional()}).strict(),
    cues:z.array(z.object({id:ident,assetId:ident,from:frame,durationInFrames:positiveFrame,gain:z.number().min(0).max(1),fadeInFrames:frame,fadeOutFrames:frame,role:z.enum(['sfx','music'])}).strict()).max(150),
  }).strict(),
}).strict();
export type Project=z.infer<typeof ProjectSchema>;
export type Scene=Project['scenes'][number];

export function validateProject(input:unknown, options:{final?:boolean}={}) : Project {
  const p=ProjectSchema.parse(input);
  const errors:string[]=[];
  const assetMap=new Map(p.assets.map(a=>[a.id,a]));
  const unique=(items:string[],name:string)=>{if(new Set(items).size!==items.length)errors.push(`Duplicate ${name} IDs`);};
  unique(p.assets.map(a=>a.id),'asset');unique(p.scenes.map(s=>s.id),'scene');unique(p.audio.cues.map(c=>c.id),'cue');
  if(p.canvas.width%2||p.canvas.height%2)errors.push('H.264 dimensions must be even');
  if(p.canvas.durationInFrames>p.canvas.fps*180)errors.push('Starter limit is 180 seconds');
  let next=0;
  const allowedRefs=new Set([p.style.primaryRef,...p.style.secondaryRefs]);
  for(const s of p.scenes){
    if(s.refs.some(r=>!allowedRefs.has(r)))errors.push(`${s.id}: reference is outside the selected primary/secondary set`);
    if(s.from!==next)errors.push(`${s.id}: expected start ${next}; no gaps or overlaps`);
    next=s.from+s.durationInFrames;
    const t=s.transitionIn;
    if((t.type==='cut')!==(t.durationInFrames===0))errors.push(`${s.id}: cut requires 0 frames; other transitions require >0`);
    if(s.from===0&&t.type!=='cut')errors.push('First scene must start with a cut');
    if(t.durationInFrames>s.durationInFrames/3)errors.push(`${s.id}: transition consumes more than one third of scene`);
    if(s.entryFrames>=s.durationInFrames-t.durationInFrames)errors.push(`${s.id}: no readable hold after entry`);
    if(s.kind==='gallery')for(const c of s.cards)if(c.assetId&&!['image','video'].includes(assetMap.get(c.assetId)?.kind??''))errors.push(`${s.id}: unresolved visual ${c.assetId}`);
  }
  if(next!==p.canvas.durationInFrames)errors.push(`Timeline ends at ${next}, expected ${p.canvas.durationInFrames}`);
  if(p.brand.logoAssetId&&assetMap.get(p.brand.logoAssetId)?.kind!=='image')errors.push('Logo must reference an image');
  if(p.brand.fontAssetId&&assetMap.get(p.brand.fontAssetId)?.kind!=='font')errors.push('Font must reference a font');
  const v=p.audio.voiceover;
  if(v.status==='pending'&&options.final)errors.push('Voiceover is pending; resolve it before final export');
  if(v.status==='ready'){
    if(!v.text.trim())errors.push('Ready voiceover must include its script');
    if(!v.assetId||assetMap.get(v.assetId)?.kind!=='audio')errors.push('Ready voiceover needs an audio asset');
    if(v.durationInFrames===0)errors.push('Ready voiceover has zero duration');
    if(v.from+v.durationInFrames>next)errors.push('Voiceover extends beyond the timeline; retime scenes');
    const asset=assetMap.get(v.assetId??'');
    if(asset?.durationInFrames!==v.durationInFrames)errors.push('Voiceover duration must match probed audio duration');
  } else if(v.assetId||v.durationInFrames!==0)errors.push('Unresolved/absent voiceover cannot carry audio timing');
  if(v.status==='none'&&v.text.trim())errors.push('Use pending for a script awaiting speech generation');
  for(const c of p.audio.cues){
    const a=assetMap.get(c.assetId);
    if(a?.kind!=='audio')errors.push(`${c.id}: missing audio asset`);
    if(a?.durationInFrames===undefined)errors.push(`${c.id}: audio asset needs probed duration`);
    if(a?.durationInFrames!==undefined&&c.durationInFrames>a.durationInFrames)errors.push(`${c.id}: cue is longer than source; supply a longer asset`);
    if(c.from+c.durationInFrames>next)errors.push(`${c.id}: cue exceeds project duration`);
    if(c.fadeInFrames+c.fadeOutFrames>c.durationInFrames)errors.push(`${c.id}: fades exceed cue duration`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return p;
}

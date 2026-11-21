import {z} from 'zod';
const hex=z.string().regex(/^#[0-9A-Fa-f]{6}$/),file=z.string().regex(/^[A-Za-z0-9_-]+\.png$/);
export const StudioSchema=z.object({id:z.string(),revision:z.number().int().positive(),skillVersion:z.literal('1.6'),fictionalBrand:z.boolean(),brand:z.string().min(1).max(12),descriptor:z.string().max(20),category:z.string().max(55),cta:z.string().max(30),width:z.literal(1080),height:z.literal(1920),fps:z.literal(60),durationInFrames:z.literal(900),palette:z.object({black:hex,white:hex,blue:hex,orange:hex}),camera:z.object({perspective:z.number().min(1200).max(3000),origin:z.object({x:z.number(),y:z.number()})}),assets:z.object({portrait:file,product:file,movement:file}),audio:z.literal('studio-score.wav'),scenes:z.array(z.object({id:z.string(),from:z.number().int().nonnegative(),durationInFrames:z.number().int().positive(),headline:z.array(z.string().max(30)).min(1).max(3),label:z.string()})).length(6),events:z.array(z.object({id:z.string(),frame:z.number().int().min(0).max(899)})),copy:z.object({header:z.string(),portraitLabel:z.string(),productLabel:z.string(),creativeLabel:z.string(),selection:z.string(),endline:z.string(),portfolioNote:z.string()})}).strict();
export type StudioProject=z.infer<typeof StudioSchema>;
export function validateStudio(input:unknown){
 const p=StudioSchema.parse(input);let end=0;const ids=new Set<string>();
 for(const s of p.scenes){if(s.from!==end||ids.has(s.id))throw new Error('Scene spans/IDs invalid');end+=s.durationInFrames;ids.add(s.id);}
 if(end!==p.durationInFrames)throw new Error('Timeline must end at frame 900');
 if(new Set(p.events.map(e=>e.id)).size!==p.events.length)throw new Error('Event IDs must be unique');
 for(const id of ['hero-bloom','depth-burst','cards-settle','select-contact','card-flip','product-lock','type-accent','identity-impact','cta-lock'])if(!p.events.some(e=>e.id===id))throw new Error('Missing event '+id);
 return p;
}

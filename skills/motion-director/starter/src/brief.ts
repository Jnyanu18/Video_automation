import {z} from 'zod';
import {ProjectSchema,validateProject,type Project} from './schema';
import {defaultDesignRef} from './design-catalog';

const ref=ProjectSchema.shape.style.shape.primaryRef;
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const fields={
  objective:z.string().min(1).max(500), audience:z.string().min(1).max(300), message:z.string().min(1).max(500),
  cta:z.string().min(1).max(40),website:z.string().max(100),
  durationSeconds:z.number().min(3).max(180),format:z.enum(['landscape','portrait','square']),fps:z.union([z.literal(24),z.literal(25),z.literal(30),z.literal(60)]),
  spokenLanguage:z.string().min(2).max(30),onScreenLanguage:z.string().min(2).max(30),narration:z.boolean(),voiceId:z.string().max(100).nullable(),
  tone:z.string().max(300),energy:z.enum(['restrained','balanced','punchy']),primaryRef:ref,secondaryRefs:z.array(ref).max(2),allowOrbit:z.boolean(),
  name:z.string().min(1).max(45),primary:color,secondary:color,background:color,foreground:color,surface:color,muted:color,
  fontFamily:z.string().min(1).max(100),fontAssetId:z.string().max(80).nullable(),logoAssetId:z.string().max(80).nullable(),radius:z.number().min(0).max(80),
};
type Field=keyof typeof fields;
const names=Object.keys(fields) as Field[];
const FieldName=z.enum(names as [Field,...Field[]]);
const evidence=z.string().min(1).max(1500);
const patchShape=Object.fromEntries(names.map(name=>[name,z.object({value:fields[name],evidence}).strict().optional()]));
export const IntentSchema=z.object({
  fields:z.object(patchShape).strict(),
  executionProfile:z.enum(['standard','shared-container-ui','saas-launch','neo-swiss-kinetic','custom-motion']).optional(),
  styleSuggestion:z.object({
    primaryRef:ref,secondaryRefs:z.array(ref).max(2),
    primaryJob:z.string().trim().min(1).max(300).optional(),
    secondaryJobs:z.array(z.object({ref,job:z.string().trim().min(1).max(300)}).strict()).max(2).optional(),
    reselectEvidence:evidence.optional(),
  }).strict().optional(),
  creativeDefaults:z.object({
    evidence,
    message:fields.message.optional(),
    format:fields.format.optional(),
    energy:fields.energy.optional(),
    narration:fields.narration.optional(),
  }).strict().optional(),
  targetTempo:z.object({bpm:z.number().finite().positive(),evidence}).strict().optional(),
  moods:z.array(z.object({term:z.string().min(1).max(80),evidence}).strict()).max(8),
  exactCopy:z.array(z.object({text:z.string().min(1).max(500),placement:z.enum(['screen','voiceover']),evidence}).strict()).max(12),
  exactCopyResetEvidence:evidence.optional(),
  creativeRequests:z.array(z.object({instruction:z.string().min(1).max(600),evidence,targetSceneId:z.string().max(80).optional()}).strict()).max(12).default([]),
  ambiguities:z.array(z.object({question:z.string().min(1).max(300),blocking:z.boolean()}).strict()).max(3),
}).strict();
export type Intent=z.infer<typeof IntentSchema>;
const FlexibleFields=z.object(Object.fromEntries(names.map(name=>[name,fields[name].optional()]))).strict();
export const BrandKitSchema=z.object({
  id:z.string().min(1),revision:z.number().int().positive(),name:z.string().min(1),visual:ProjectSchema.shape.brand,
  tone:z.string().default('Clear and concise'),language:z.string().default('en'),website:z.string().default(''),cta:z.string().default('Learn more'),
  voice:z.object({provider:z.literal('elevenlabs'),voiceId:z.string().nullable()}).passthrough().optional(),
  strategy:z.object({objective:z.string().optional(),audience:z.string().optional(),message:z.string().optional()}).strict().optional(),
  defaults:FlexibleFields.optional(),
  rules:z.object({lockedFields:z.array(FieldName).default([]),approvedMetricValues:z.array(z.number().finite()).default([])}).strict().optional(),
  logoVariants:z.array(z.object({assetId:z.string(),forBackground:z.enum(['light','dark','any'])}).strict()).optional(),
}).passthrough();
export type BrandKit=z.infer<typeof BrandKitSchema>;
type Source='kit'|'product-default'|'previous'|'form'|'prompt'|'inference';
type Decision={value:unknown;source:Source;originalSource?:Source;evidence?:string};
export type ResolvedBrief={
  version:1;status:'ready'|'needs_input';kitSnapshot:BrandKit;decisions:Record<string,Decision>;
  executionProfile:NonNullable<Intent['executionProfile']>;
  conflicts:{field:string;requested:unknown;applied:unknown;reason:string}[];
  questions:string[];warnings:string[];moods:string[];exactCopy:Intent['exactCopy'];
  creativeRequests:Intent['creativeRequests'];
  targetBpm?:number;
  expected:{brand:Project['brand'];canvas:Project['canvas'];style:Project['style'];cta:string;website:string;narration:boolean;voiceId:string|null;spokenLanguage:string;onScreenLanguage:string;allowOrbit:boolean;approvedMetricValues:number[]};
};

const normalize=(s:string)=>s.normalize('NFC');
function quoted(prompt:string,quote:string){return normalize(prompt).includes(normalize(quote));}
function dark(hex:string){const c=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722<.35;}

/** Interpret with Claude first, then resolve actual values deterministically here. */
export function resolveBrief(input:{prompt:string;intent:unknown;brandKit:unknown;previous?:ResolvedBrief;rebaseBrandKit?:boolean;formOverrides?:Record<string,unknown>;assetManifest:Project['assets']}):ResolvedBrief{
  const intent=IntentSchema.parse(input.intent);
  const kit=BrandKitSchema.parse(input.previous&&!input.rebaseBrandKit?input.previous.kitSnapshot:input.brandKit);
  for(const name of Object.keys(ProjectSchema.shape.brand.shape))if(name in (kit.defaults??{})&&JSON.stringify((kit.defaults as any)[name])!==JSON.stringify((kit.visual as any)[name]))throw new Error(`Keep canonical visual ${name} in kit.visual; conflicting kit.defaults value`);
  const defaults:Record<string,unknown>={objective:'',audience:'',message:'',cta:kit.cta,website:kit.website,durationSeconds:15,format:'landscape',fps:60,spokenLanguage:kit.language,onScreenLanguage:kit.language,narration:true,voiceId:kit.voice?.voiceId??null,tone:kit.tone,energy:'balanced',primaryRef:defaultDesignRef,secondaryRefs:[],allowOrbit:true,...kit.visual,fontAssetId:kit.visual.fontAssetId??null,logoAssetId:kit.visual.logoAssetId??null,...kit.strategy,...kit.defaults};
  const decisions:Record<string,Decision>={};
  const inherited=new Set(['objective','audience','message','cta','website','spokenLanguage','onScreenLanguage','voiceId','tone',...Object.keys(kit.visual),...Object.keys(kit.defaults??{})]);
  for(const name of names){
    const prior=input.previous?.decisions[name];
    const origin=prior?.originalSource??prior?.source;
    const old=prior&&(!input.rebaseBrandKit||origin==='prompt'||origin==='form')?prior:undefined;
    decisions[name]=old?{...old,source:'previous',originalSource:origin}:{value:defaults[name],source:inherited.has(name)?'kit':'product-default'};
  }
  const conflicts:ResolvedBrief['conflicts']=[],warnings:string[]=[];
  const locks=new Set(kit.rules?.lockedFields??[]);
  for(const name of locks)if(JSON.stringify(decisions[name].value)!==JSON.stringify(defaults[name])){
    conflicts.push({field:name,requested:decisions[name].value,applied:defaults[name],reason:'Rebased kit has a versioned lock on this field'});
    decisions[name]={value:defaults[name],source:'kit'};
  }
  for(const proposal of [intent.creativeDefaults,intent.targetTempo]){
    if(proposal&&!quoted(input.prompt,proposal.evidence))throw new Error('Creative suggestion evidence absent from prompt');
  }
  const styleSuggestion=intent.styleSuggestion;
  const reselectEvidence=styleSuggestion?.reselectEvidence;
  if(reselectEvidence&&!quoted(input.prompt,reselectEvidence))throw new Error('Style change evidence absent from prompt');
  if(styleSuggestion&&(!input.previous||input.rebaseBrandKit||reselectEvidence)){
    for(const name of ['primaryRef','secondaryRefs'] as const){
      const original=decisions[name].originalSource??decisions[name].source;
      if(!(name in (kit.defaults??{}))&&!locks.has(name)&&original!=='prompt'&&original!=='form'){
        decisions[name]={value:styleSuggestion[name],source:'inference',...(reselectEvidence?{evidence:reselectEvidence}:{})};
      }
    }
  }
  if(!input.previous&&intent.creativeDefaults){
    for(const name of ['message','format','energy','narration'] as const){
      const proposed=intent.creativeDefaults[name];
      const missingMessage=name==='message'&&!String(decisions[name].value).trim();
      if(proposed!==undefined&&(decisions[name].source==='product-default'||missingMessage)&&!locks.has(name)){
        decisions[name]={value:proposed,source:'inference',evidence:intent.creativeDefaults.evidence};
      }
    }
  }
  const apply=(name:Field,value:unknown,source:'form'|'prompt',quote?:string)=>{
    const parsed=fields[name].parse(value);
    if(locks.has(name)&&JSON.stringify(parsed)!==JSON.stringify(defaults[name])){conflicts.push({field:name,requested:parsed,applied:decisions[name].value,reason:'Field locked by host-configured brand policy'});return;}
    decisions[name]={value:parsed,source,...(quote?{evidence:quote}:{})};
  };
  for(const [key,item]of Object.entries(intent.fields)){
    if(!item)continue;
    if(!quoted(input.prompt,item.evidence))throw new Error(`Prompt evidence absent for ${key}`);
    apply(key as Field,item.value,'prompt',item.evidence);
  }
  // Only explicitly edited UI controls belong here, not an entire form of defaults.
  for(const [key,value]of Object.entries(input.formOverrides??{})){
    if(!names.includes(key as Field))throw new Error(`Unknown form override: ${key}`);
    apply(key as Field,value,'form');
  }
  const primary=ref.parse(decisions.primaryRef.value);
  let secondary=z.array(ref).max(2).parse(decisions.secondaryRefs.value);
  if(decisions.secondaryRefs.source==='inference'){
    secondary=[...new Set(secondary)].filter(item=>item!==primary);
    decisions.secondaryRefs={...decisions.secondaryRefs,value:secondary};
  }else if(decisions.primaryRef.source==='inference'&&secondary.includes(primary)){
    // An explicit secondary selection takes precedence over an inferred primary.
    const alternate=[defaultDesignRef,...ref.options].find(item=>!secondary.includes(item));
    if(alternate===undefined)throw new Error('Choose a primary design outside the secondary references');
    decisions.primaryRef={value:alternate,source:'inference'};
  }
  const resolvedPrimary=ref.parse(decisions.primaryRef.value);
  if(new Set([resolvedPrimary,...secondary]).size!==secondary.length+1){
    throw new Error('Use distinct designs for the primary and secondary reference roles');
  }
  for(const mood of intent.moods)if(!quoted(input.prompt,mood.evidence))throw new Error('Mood evidence absent from prompt');
  for(const request of intent.creativeRequests)if(!quoted(input.prompt,request.evidence))throw new Error('Creative request evidence absent from prompt');
  for(const c of intent.exactCopy)if(!quoted(input.prompt,c.evidence)||!quoted(c.evidence,c.text))throw new Error('Exact copy is not present in its prompt evidence');
  if(intent.exactCopyResetEvidence&&!quoted(input.prompt,intent.exactCopyResetEvidence))throw new Error('Exact copy reset requires prompt evidence');
  // Mood is direction, not permission to change the logo/font/colors.
  const moods=intent.moods.length?intent.moods.map(x=>x.term):(input.previous?.moods??[]);
  const priorCopy=intent.exactCopyResetEvidence?[]:(input.previous?.exactCopy??[]).filter(c=>!(input.previous&&decisions.cta.value!==input.previous.expected.cta&&c.text===input.previous.expected.cta));
  const exactCopy=[...priorCopy,...intent.exactCopy].filter((c,i,all)=>all.findIndex(x=>x.text===c.text&&x.placement===c.placement)===i);
  const value=(name:Field)=>decisions[name].value as any;
  const brand:any={};
  for(const name of Object.keys(ProjectSchema.shape.brand.shape) as Field[])if(value(name)!==null&&value(name)!==undefined)brand[name]=value(name);
  const assetMap=new Map(input.assetManifest.map(a=>[a.id,a]));
  // Choose an uploaded logo variant for the resolved background, unless explicitly chosen.
  if(!['prompt','form'].includes(decisions.logoAssetId.originalSource??decisions.logoAssetId.source)&&!locks.has('logoAssetId')){
    const background=dark(brand.background)?'dark':'light';
    const logo=kit.logoVariants?.find(x=>x.forBackground===background)??kit.logoVariants?.find(x=>x.forBackground==='any');
    if(logo){brand.logoAssetId=logo.assetId;decisions.logoAssetId={value:logo.assetId,source:'kit'};}
  }
  const questions=intent.ambiguities.filter(a=>a.blocking).map(a=>a.question);
  if(!value('message'))questions.push('What product or idea should the video explain, and what should the viewer take away?');
  for(const [key,kind]of [['fontAssetId','font'],['logoAssetId','image']] as const)if(brand[key]&&assetMap.get(brand[key])?.kind!==kind)questions.push(`The selected ${kind} asset is unavailable. Choose an uploaded asset or explicitly allow a preview stand-in.`);
  if(brand.fontFamily!==kit.visual.fontFamily&&brand.fontAssetId===kit.visual.fontAssetId)questions.push('Choose the uploaded font asset matching the requested font family.');
  if(value('narration')&&!value('voiceId'))warnings.push('Narration can be planned, but an authorized voice must be selected before speech generation.');
  if(!value('website'))warnings.push('No CTA destination supplied; do not invent a URL.');
  if(conflicts.length)warnings.push('Some explicit requests conflict with configured brand locks; show the requested and applied values in preview.');
  if(input.previous&&!input.rebaseBrandKit&&input.previous.kitSnapshot.revision!==(input.brandKit as any)?.revision)warnings.push('Kept the prior brand-kit snapshot; newer kit changes need an explicit rebase.');
  const dims=value('format')==='portrait'?[1080,1920]:value('format')==='square'?[1440,1440]:[1920,1080];
  return {version:1,executionProfile:intent.executionProfile??input.previous?.executionProfile??'standard',status:questions.length?'needs_input':'ready',kitSnapshot:kit,decisions,conflicts,questions:[...new Set(questions)],warnings,moods,exactCopy,creativeRequests:intent.creativeRequests,targetBpm:intent.targetTempo?.bpm??input.previous?.targetBpm,expected:{brand:ProjectSchema.shape.brand.parse(brand),canvas:{width:dims[0],height:dims[1],fps:value('fps'),durationInFrames:Math.round(value('durationSeconds')*value('fps'))},style:{primaryRef:resolvedPrimary,secondaryRefs:secondary,energy:value('energy')},cta:value('cta'),website:value('website'),narration:value('narration'),voiceId:value('voiceId'),spokenLanguage:value('spokenLanguage'),onScreenLanguage:value('onScreenLanguage'),allowOrbit:value('allowOrbit'),approvedMetricValues:kit.rules?.approvedMetricValues??[]}};
}

/** Enforce verifiable brand constraints after scene generation; not semantic fact checking. */
export function validateAgainstBrief(input:unknown,brief:ResolvedBrief,manifest:Project['assets']):Project{
  if(brief.status!=='ready')throw new Error('Resolve blocking brief questions before generation');
  const p=validateProject(input),e=brief.expected,errors:string[]=[];
  for(const key of Object.keys(ProjectSchema.shape.brand.shape) as (keyof Project['brand'])[])if(p.brand[key]!==e.brand[key])errors.push(`Brand mismatch: ${key}`);
  for(const key of ['width','height','fps','durationInFrames'] as const)if(p.canvas[key]!==e.canvas[key])errors.push(`Canvas mismatch: ${key}`);
  for(const key of ['primaryRef','energy'] as const)if(p.style[key]!==e.style[key])errors.push(`Style mismatch: ${key}`);
  if(JSON.stringify(p.style.secondaryRefs)!==JSON.stringify(e.style.secondaryRefs))errors.push('Style mismatch: secondaryRefs');
  const assets=new Map(manifest.map(a=>[a.id,a]));
  for(const a of p.assets){const supplied=assets.get(a.id);if(!supplied||(['id','kind','src','durationInFrames'] as const).some(k=>a[k]!==supplied[k]))errors.push(`Unapproved or modified asset: ${a.id}`);}
  const palette=new Set([e.brand.primary,e.brand.secondary,e.brand.background,e.brand.foreground,e.brand.surface,e.brand.muted].map(x=>x.toLowerCase()));
  const ctas=p.scenes.filter(s=>s.kind==='cta');
  if(ctas.length===0)errors.push('Missing CTA scene');
  for(const s of p.scenes){
    if(s.background&&!palette.has(s.background.toLowerCase()))errors.push(`${s.id}: scene color outside resolved palette`);
    if(s.kind==='orbit'&&!e.allowOrbit)errors.push(`${s.id}: orbit particles disabled by brand rules`);
    if(s.kind==='metric'&&!e.approvedMetricValues.includes(s.value))errors.push(`${s.id}: metric value lacks approved data`);
    if(s.kind==='cta'&&(s.buttonLabel!==e.cta||s.website!==e.website))errors.push(`${s.id}: CTA differs from resolved brief`);
  }
  if(e.narration&&p.audio.voiceover.status==='none')errors.push('Required narration omitted');
  if(!e.narration&&p.audio.voiceover.status!=='none')errors.push('Narration was disabled');
  if(p.audio.voiceover.voiceId&&p.audio.voiceover.voiceId!==e.voiceId)errors.push('Unauthorized voice choice');
  const screen=p.scenes.flatMap(s=>[s.headline,s.subheadline??'',s.kind==='cta'?s.buttonLabel:'',s.kind==='ui'?`${s.label} ${s.value} ${s.steps.join(' ')}`:'',s.kind==='gallery'?s.cards.map(c=>c.title).join(' '):'',s.kind==='metric'?s.label:'']).join('\n');
  for(const c of brief.exactCopy)if(!(c.placement==='screen'?screen:p.audio.voiceover.text).includes(c.text))errors.push(`Missing exact ${c.placement} copy: ${c.text}`);
  if(errors.length)throw new Error(errors.join('\n'));
  return p;
}

import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{tsImport}=require('tsx/esm/api');
const {validateStudio}=await tsImport(new URL('./config.ts',import.meta.url).href,import.meta.url);
const {validateProductionPlan,resolveCueTiming,buildReviewFrames,storyboardHtml}=await tsImport(new URL('./lib/production-plan.ts',import.meta.url).href,import.meta.url);
const p=validateStudio(JSON.parse(readFileSync(new URL('./project.json',import.meta.url),'utf8')));
const context={id:p.id,revision:p.revision,canvas:{width:p.width,height:p.height,fps:p.fps,durationInFrames:p.durationInFrames},assets:[{id:'score',kind:'audio',src:p.audio,durationInFrames:900}],scenes:p.scenes.map((s,i)=>({id:s.id,from:s.from,durationInFrames:s.durationInFrames,entryFrames:i===5?60:52,transitionIn:{type:'cut',durationInFrames:0}}))};
const actions=[
 ['Persistent portrait frame','Per-glyph springs and reciprocal strain; the photo frame grows into its first pose.','The same frame contracts while four photo cards emerge behind it.'],
 ['Hero portrait and contact sheet','A spring camera pullback reveals staggered 3D photo cards.','The cursor approaches the hero and the camera moves in.'],
 ['Portrait detail and selection point','Curved cursor path meets the projected image target; shutter accent and bounded recoil.','The same two-sided card starts a 3D Y rotation.'],
 ['Product still life','The reverse face is revealed by the card flip; other cards remain defocused.','The card joins a wider portfolio layout while the camera pulls back.'],
 ['Photography categories and portfolio','Focus moves through three words while images reflow in depth.','All cards collect toward the hero, which collapses into the studio mark.'],
 ['Studio identity and CTA','The persistent card becomes an orange viewfinder mark; the wordmark settles.','Stable identity and CTA through the final frame.'],
];
const plan={version:1,projectId:p.id,projectRevision:p.revision,fps:p.fps,direction:'hybrid',ending:{sceneId:'identity',goal:p.cta,settledFromLocalFrame:60,holdFrames:120},shots:p.scenes.map((s,i)=>({sceneId:s.id,purpose:s.headline.join(' '),focalElement:actions[i][0],entry:actions[i][1],hold:'Main copy remains readable after its entrance; secondary motion serves the selected subject.',exit:actions[i][2],camera:{mode:i===5?'locked':'continuous',path:i===5?'The camera settles while the identity holds.':'One shared 2D camera matrix above a CSS perspective stage; cursor uses matching world-to-screen projection.'},assetUses:[],...(i<5?{outgoing:{toSceneId:p.scenes[i+1].id,mode:i===2||i===4?'morph':'match',anchor:'Persistent hero photo-card object',becomes:actions[i][2]}}:{})})),events:[{id:'score-start',sceneId:'alive',localFrame:0,kind:'accent',description:'Original score starts at sample zero'},...p.events.map(e=>{const s=p.scenes.find(s=>e.frame>=s.from&&e.frame<s.from+s.durationInFrames);return {id:e.id,sceneId:s.id,localFrame:e.frame-s.from,kind:e.id==='select-contact'?'contact':'accent',description:e.id};})],audioCues:[{id:'original-score',eventId:'score-start',assetId:'score',offsetFrames:0,alignment:{kind:'onset',sourceFrame:0,evidence:'Original score starts at sample zero; encoding and perception checked separately.'},durationInFrames:900,gain:1,fadeInFrames:0,fadeOutFrames:0,role:'music'}]};
validateProductionPlan(plan,context);const cues=resolveCueTiming(plan,context);assert.equal(cues[0].from,0);assert.equal(cues[0].durationInFrames,900);
const audio=JSON.parse(readFileSync(new URL('./audio-report.json',import.meta.url),'utf8'));
assert.deepEqual(p.scenes.map(s=>s.from).concat(900),audio.sceneBoundaryFrames);
assert.deepEqual([...new Set(audio.events.map(e=>e.targetFrame))].sort((a,b)=>a-b),p.events.map(e=>e.frame));
writeFileSync('production-plan.json',JSON.stringify(plan,null,2)+'\n');writeFileSync('storyboard.html',storyboardHtml(plan,context));
writeFileSync('plan-report.json',JSON.stringify({skillVersion:'1.6',projectId:p.id,revision:p.revision,renderer:'Registered custom Remotion composition FramePhotoStudio',timelineContiguous:true,sharedAudioEventFrames:true,resolvedCues:cues,reviewFrames:buildReviewFrames(plan,context),notes:['Custom StudioSchema, not standard seven-scene Project v1 JSON.','One hero object remains mounted; a back face reveals a different asset during the Y flip.','Original generated photos are raster assets; no real client portfolio is claimed.','Timing arithmetic does not prove perceived sound synchronization.']},null,2)+'\n');
console.log('Validated custom production plan and shared sound/visual event frames.');

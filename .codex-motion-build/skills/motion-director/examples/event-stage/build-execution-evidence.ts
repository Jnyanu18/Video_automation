/** Sample actual component functions. Does not inspect pixels or certify artistic quality. */
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import data from './project.json';
import {sourceFingerprint} from './source-fingerprint';
import {validateEventStage} from './config';
import {beatWordState,event,foregroundOpacity,heroCoversViewport,identityState,sparkContactGeometry} from './motion';
import {ExecutionQualitySchema,reviewExecution} from './lib/execution-quality';
const root=fileURLToPath(new URL('.',import.meta.url)),p=validateEventStage(data),sourceHash=sourceFingerprint(root);
const typecheck=spawnSync('npm',['run','check'],{cwd:root,encoding:'utf8'});
if(typecheck.status!==0)throw Error(typecheck.stderr+typecheck.stdout);
const pixelCheckPath=join(root,'random-frame-check.json');
const pixelCheck=existsSync(pixelCheckPath)?JSON.parse(readFileSync(pixelCheckPath,'utf8')):null;
const pixelVerified=pixelCheck?.passed===true&&pixelCheck.sourceHash===sourceHash;
const hit=event(p,'spark-contact'),contact=sparkContactGeometry(hit,p),cut=event(p,'logo-arrival');
let firstReadableFrame=cut;
while(firstReadableFrame<900){const state=identityState(firstReadableFrame,p);if(state.opacity===1&&state.ctaOpacity===1&&state.rule===1&&Math.abs(state.scale-1)<.002)break;firstReadableFrame++;}
const input=ExecutionQualitySchema.parse({
 version:1,projectId:p.id,projectRevision:p.revision,fps:p.fps,durationInFrames:p.durationInFrames,
 evidence:{mode:'component-sampled',sourceHash,notes:'Samples actual functions consumed by EventStageFilm. At cut−1 coverage uses the projected opaque hero polygon with zero corner radius/hidden internal content; at cut/cut+1 EventStageFilm uses the same opaque brand-color full-canvas identity backplane. This is not pixel inspection, playback, listening, font-fit measurement, approval or an artistic rating.'},
 requiredProbes:['contact','beat-word','cover'],
 contacts:[{id:'spark-floor',frame:hit,space:'screen',objectBoundary:contact.bottom,surface:contact.floor,tolerancePx:.5}],
 beatWords:(['lights','energy','action'] as const).map(id=>({id,beatFrame:event(p,id),firstReadableFrame:beatWordState(event(p,id),p).firstReadableFrame,intentionalOffsetFrames:0,toleranceFrames:0})),
 covers:[{id:'brand-cover',cutFrame:cut,samples:[cut-1,cut,cut+1].map(frame=>({frame,coveredFraction:frame>=cut?1:heroCoversViewport(frame,p)?1:0,outgoingForegroundAlpha:foregroundOpacity(frame,p)}))}],
 readableHolds:[{sceneId:'identity',firstReadableFrame,lastReadableFrame:899,minimumFrames:90}],ending:{sceneId:'identity',firstReadableFrame,lastReadableFrame:899,minimumHoldFrames:90},
 shots:[
  {sceneId:'spark',layout:'small-object-to-pass',typeMechanic:'spring-letters',focalAction:'floor-contact-to-pass'},
  {sceneId:'build',layout:'wide-perspective-stage',typeMechanic:'line-wipe',focalAction:'pass-unfolds-stage'},
  {sceneId:'showtime',layout:'macro-stage',typeMechanic:'whole-word-beat',focalAction:'lights-energy-action'},
  {sceneId:'details',layout:'left-hero-right-support',typeMechanic:'wipe-and-letter-response',focalAction:'supporting-card-burst'},
  {sceneId:'moment',layout:'regroup-then-cover',typeMechanic:'letters-and-scale-response',focalAction:'stage-cover'},
  {sceneId:'identity',layout:'quiet-brand-center',typeMechanic:'settled-identity',focalAction:'readable-brand-hold'}
 ],
 assets:[{id:'logo',kind:'logo',status:p.assets.logo?'original':'placeholder',requiredForFinal:!p.fictionalBrand},{id:'original-score',kind:'audio',status:'original',requiredForFinal:true}],
 checks:{typecheck:'passed',randomFrameRepeat:pixelVerified?'passed':'pending',frameInspection:'pending',fullSpeedPlayback:'pending',audioListening:'pending'}
});
// The host must verify any supplied logo's provenance. A path is not proof of originality.
if(p.assets.logo)input.assets[0].status='placeholder';
writeFileSync(join(root,'execution-evidence.json'),JSON.stringify(input,null,2)+'\n');
const report=reviewExecution(input);writeFileSync(join(root,'execution-review.json'),JSON.stringify(report,null,2)+'\n');
if(!report.structuralChecksPassed)throw Error(report.errors.join('\n'));
console.log(JSON.stringify({status:report.status,structuralChecksPassed:report.structuralChecksPassed,pending:report.pending,sourceHash:input.evidence.sourceHash}));

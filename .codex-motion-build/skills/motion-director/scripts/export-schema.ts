import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {ProjectSchema} from '../starter/src/schema';
import {IntentSchema,BrandKitSchema} from '../starter/src/brief';
import {motionPresets,bezierProgress,predictedOvershoot} from '../starter/src/motion-policy';
import {ProductionPlanSchema} from '../starter/src/production-plan';
import {ExecutionQualitySchema} from '../starter/src/execution-quality';
import {SyncReviewSchema} from '../starter/src/sync-review';
import {depthPresets} from '../starter/src/depth-motion';
import {typeCameraPresets} from '../starter/src/type-camera';
import {mixedMediaPresets} from '../starter/src/mixed-media';
import {highKineticPresets} from '../starter/src/high-kinetic-ui';
const require=createRequire(new URL('../starter/package.json',import.meta.url));
const {zodToJsonSchema}=require('zod-to-json-schema');
const schema=zodToJsonSchema(ProjectSchema,{target:'jsonSchema7',$refStrategy:'none'});
writeFileSync(fileURLToPath(new URL('../schemas/project.schema.json',import.meta.url)),JSON.stringify(schema,null,2)+'\n');
console.log('Wrote schemas/project.schema.json; semantic validation remains mandatory.');
for(const [name,source]of [['intent',IntentSchema],['brand-kit',BrandKitSchema],['production-plan',ProductionPlanSchema],['sync-review',SyncReviewSchema],['execution-quality',ExecutionQualitySchema]] as const){
  writeFileSync(fileURLToPath(new URL(`../schemas/${name}.schema.json`,import.meta.url)),JSON.stringify(zodToJsonSchema(source,{target:'jsonSchema7',$refStrategy:'none'}),null,2)+'\n');
}
writeFileSync(fileURLToPath(new URL('../references/motion-presets.json',import.meta.url)),JSON.stringify({
  presets:motionPresets,depthPresets,typeCameraPresets,mixedMediaPresets,highKineticPresets,
  measuredTravelAt20Percent:{snap:bezierProgress(.2,motionPresets.easing.snap),fastSnap:bezierProgress(.2,motionPresets.easing.fastSnap)},
  idealStepOvershoot:Object.fromEntries(Object.entries(motionPresets.springs).map(([name,value])=>[name,predictedOvershoot(value)])),
  idealExplosionOvershoot:predictedOvershoot(depthPresets.explosionSpring),
  note:'Defaults require template integration and visual tuning; values are not extracted reference keyframes.',
},null,2)+'\n');

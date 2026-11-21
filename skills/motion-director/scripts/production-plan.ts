/** Local validation/export only. Does not call a model, generate media or alter project.json. */
import {readFileSync,writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {validateProject} from '../starter/src/schema';
import {validatePlanForProject,resolveCueTiming,buildReviewFrames,inspectAssetResolution,storyboardHtml} from '../starter/src/production-plan';
import {reviewSync} from '../starter/src/sync-review';
const {positionals,values}=parseArgs({allowPositionals:true,options:{'sync-review':{type:'string'}}});
const [projectPath,planPath,outputPrefix,inspectionPath]=positionals;
if(!projectPath||!planPath||!outputPrefix||positionals.length>4)throw new Error('Usage: npm run plan -- project.json plan.json output-prefix [host-asset-inspection.json] [--sync-review host-sync-review.json]');
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const project=validateProject(read(projectPath)),plan=validatePlanForProject(read(planPath),project);
const sync=values['sync-review']?reviewSync(project,plan,read(values['sync-review'])):undefined;
const report={projectId:project.id,projectRevision:project.revision,
  cueScheduleMatchesProject:true,cues:resolveCueTiming(plan,project),reviewFrames:buildReviewFrames(plan,project),
  assetResolution:inspectAssetResolution(plan,project,inspectionPath?read(inspectionPath):[]),
  ...(sync?{syncReview:sync}:{}),
  limitations:['Cue placement checks arithmetic only; no mixing or perceptual sync test.','Review frame numbers request future captures; no media was generated.','Asset coverage is limited to declared assetUses; omitted usages are not assessed. Host-probed dimensions and maximum framing are required.','The ending settlement frame is a planning declaration; child animation completion needs visual review.'],
};
writeFileSync(`${outputPrefix}.plan-report.json`,JSON.stringify(report,null,2)+'\n');
writeFileSync(`${outputPrefix}.storyboard.html`,storyboardHtml(plan,project));
console.log('Validated production plan; wrote text storyboard and metadata report. Project/audio/media unchanged.');
if(sync&&!sync.withinTolerance){
  console.error('One or more sync checks exceed their frame tolerance. See the report for signed offsets.');
  process.exitCode=4;
}

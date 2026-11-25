import {readFileSync,writeFileSync} from 'node:fs';
import {reviewExecution} from '../starter/src/execution-quality';
const [inputPath,outputPath,...extra]=process.argv.slice(2);
if(!inputPath||!outputPath||extra.length)throw Error('Usage: npm run review -- execution-evidence.json execution-report.json');
const report=reviewExecution(JSON.parse(readFileSync(inputPath,'utf8')));
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(`Execution evidence: ${report.status}; ${report.errors.length} errors, ${report.warnings.length} warnings. Report: ${outputPath}`);
process.exitCode=report.status==='needs-repair'?4:report.status==='needs-assets'?5:report.status==='review-pending'?6:0;

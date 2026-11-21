/** Optional planning math. No meshes, shaders, collisions, alpha tests or media are generated. */
import type {Point} from './motion-policy';
import type {Point3} from './depth-motion';
export const mixedMediaPresets={
  acrylic:{extrusionDesignUnits:[16,24]},
  impact:{referenceFps:60,referenceFrames:[2,3],defaultTimingMode:'frames'},
  halftone:{spacingDesignPx:8,radiusDesignPx:1.2,rotationDegrees:-15,cornerOpacity:.08},
  shockwave:{dragPerSimulatedSecond:2,slowMotionTimeScale:.35},
  handoff:{directionalBlurDesignPx:40},
  emphasis:{peakScaleRange:[6,8],restScale:1},
} as const;
function finite(n:number,label:string){if(!Number.isFinite(n))throw new Error(`${label} must be finite`);}
function positive(n:number,label:string){finite(n,label);if(n<=0)throw new Error(`${label} must be positive`);}
function integer(n:number,label:string){if(!Number.isSafeInteger(n))throw new Error(`${label} must be a safe integer`);}
function point(p:Point3){finite(p.x,'x');finite(p.y,'y');finite(p.z,'z');}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** Frame-count styling is the default. Duration mode preserves N/60 seconds approximately. */
export function impactWindow(frame:number,fps:number,options:{atFrame:number;referenceFrames?:2|3;timingMode?:'frames'|'duration'}){
  integer(frame,'frame');integer(fps,'fps');positive(fps,'fps');integer(options.atFrame,'atFrame');if(options.atFrame<0)throw new Error('atFrame cannot be negative');
  const {referenceFrames=2,timingMode='frames'}=options;
  if(referenceFrames!==2&&referenceFrames!==3)throw new Error('Use two or three reference frames');
  if(timingMode!=='frames'&&timingMode!=='duration')throw new Error('Unknown impact timing mode');
  const durationInFrames=timingMode==='frames'?referenceFrames:Math.max(1,Math.round(referenceFrames*fps/60));
  return {durationInFrames,active:frame>=options.atFrame&&frame<options.atFrame+durationInFrames};
}
/** turns may be negative. Radius/pitch/origin share one declared world-unit system. */
export function helixPoint(turns:number,origin:Point3,radius:number,pitchPerTurn:number,phaseRadians=0):Point3{
  finite(turns,'turns');point(origin);finite(radius,'radius');finite(pitchPerTurn,'pitchPerTurn');finite(phaseRadians,'phaseRadians');if(radius<0)throw new Error('radius cannot be negative');
  const angle=2*Math.PI*turns+phaseRadians;
  return {x:origin.x+radius*Math.cos(angle),y:origin.y+radius*Math.sin(angle),z:origin.z+pitchPerTurn*turns};
}
/** Analytic free-flight with linear drag, no gravity/collisions. Velocities use simulated seconds. */
export function shockwaveImpulse(elapsedVideoSeconds:number,origin:Point3,initialVelocity:Point3,options:{dragPerSimulatedSecond?:number;timeScale?:number}={}){
  finite(elapsedVideoSeconds,'elapsedVideoSeconds');point(origin);point(initialVelocity);
  const {dragPerSimulatedSecond=2,timeScale=1}=options;
  finite(dragPerSimulatedSecond,'dragPerSimulatedSecond');finite(timeScale,'timeScale');
  if(dragPerSimulatedSecond<0||timeScale<0||timeScale>1)throw new Error('Use nonnegative drag and a timeScale in [0,1]');
  if(elapsedVideoSeconds<0)return {position:{...origin},velocityPerVideoSecond:{x:0,y:0,z:0}};
  const t=elapsedVideoSeconds*timeScale,k=dragPerSimulatedSecond;
  const travel=k===0?t:-Math.expm1(-k*t)/k,decay=Math.exp(-k*t)*timeScale;
  return {position:{x:origin.x+initialVelocity.x*travel,y:origin.y+initialVelocity.y*travel,z:origin.z+initialVelocity.z*travel},
    velocityPerVideoSecond:{x:initialVelocity.x*decay,y:initialVelocity.y*decay,z:initialVelocity.z*decay}};
}
/** Requires supplied point correspondence; does not solve mesh topology or redraw a logo. */
export function ribbonToLogoPoint(from:Point3,approvedTarget:Point,easedProgress:number):Point3{
  point(from);finite(approvedTarget.x,'target x');finite(approvedTarget.y,'target y');finite(easedProgress,'easedProgress');const q=clamp(easedProgress);
  if(q===0)return {...from};if(q===1)return {x:approvedTarget.x,y:approvedTarget.y,z:0};
  return {x:from.x+(approvedTarget.x-from.x)*q,y:from.y+(approvedTarget.y-from.y)*q,z:from.z*(1-q)};
}

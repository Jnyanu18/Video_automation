/** Tested planning utilities. Templates must explicitly wire these into their frame clock. */
export const motionPresets={
  easing:{snap:[.16,1,.3,1],fastSnap:[.10,1,.12,1]},
  springs:{
    expressive:{stiffness:280,damping:22,mass:1},
    stableUi:{stiffness:280,damping:32,mass:1},
    letters:{stiffness:220,damping:18,mass:.7},
    camera:{stiffness:180,damping:28,mass:1},
  },
  press:{scale:.95,compressionMs:120,release:'spring'},
  radial:{secondsPerCell:.04,maxDelaySeconds:.45},
  perspective:{distancePx:1200,gridRotateX:22,gridRotateZ:-12},
  polish:{glassBlurPx:20,glassAlpha:.08,specularAlpha:.35,grainOpacity:.03},
} as const;
export type Cubic=readonly[number,number,number,number];
export type Point={x:number;y:number};
function finite(n:number,name:string){if(!Number.isFinite(n))throw new Error(`${name} must be finite`);}
function fpsCheck(fps:number){finite(fps,'fps');if(!Number.isInteger(fps)||fps<=0)throw new Error('fps must be a positive integer');}
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const component=(u:number,a:number,b:number)=>3*(1-u)**2*u*a+3*(1-u)*u*u*b+u**3;

/** Solve the x component for elapsed time before evaluating y; not y(elapsed). */
export function bezierProgress(elapsed:number,curve:Cubic):number{
  finite(elapsed,'elapsed');curve.forEach(v=>finite(v,'control point'));
  if(curve[0]<0||curve[0]>1||curve[2]<0||curve[2]>1)throw new Error('Bezier time handles must be in [0,1]');
  const x=clamp(elapsed);if(x===0||x===1)return x;
  let lo=0,hi=1;
  for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(component(mid,curve[0],curve[2])<x)lo=mid;else hi=mid;}
  return component((lo+hi)/2,curve[1],curve[3]);
}
export function dampingRatio(p:{stiffness:number;damping:number;mass:number}):number{
  for(const [key,v]of Object.entries(p)){finite(v,key);if(v<=0)throw new Error(`${key} must be positive`);}
  return p.damping/(2*Math.sqrt(p.stiffness*p.mass));
}
export function predictedOvershoot(p:{stiffness:number;damping:number;mass:number}):number{
  const z=dampingRatio(p);return z>=1?0:Math.exp(-z*Math.PI/Math.sqrt(1-z*z));
}
export function millisecondsToFrames(ms:number,fps:number):number{
  finite(ms,'milliseconds');fpsCheck(fps);if(ms<0)throw new Error('milliseconds cannot be negative');return Math.round(ms/1000*fps);
}
export function alignmentToFrame(seconds:number,fps:number,startFrame=0):number{
  finite(seconds,'seconds');fpsCheck(fps);if(seconds<0||!Number.isInteger(startFrame)||startFrame<0)throw new Error('Invalid audio alignment offset');return startFrame+Math.round(seconds*fps);
}
export function radialDelayFrames(point:Point,center:Point,options:{spacingPx:number;fps:number;secondsPerCell?:number;maxDelaySeconds?:number}):number{
  const {spacingPx,fps,secondsPerCell=.04,maxDelaySeconds=.45}=options;
  for(const n of [point.x,point.y,center.x,center.y,spacingPx,secondsPerCell,maxDelaySeconds])finite(n,'radial parameter');fpsCheck(fps);
  if(spacingPx<=0||secondsPerCell<0||maxDelaySeconds<0)throw new Error('Invalid radial delay parameters');
  const cells=Math.hypot(point.x-center.x,point.y-center.y)/spacingPx;
  return Math.round(Math.min(cells*secondsPerCell,maxDelaySeconds)*fps);
}
export function cubicPathPoint(progress:number,p0:Point,p1:Point,p2:Point,p3:Point):Point{
  finite(progress,'progress');for(const p of [p0,p1,p2,p3]){finite(p.x,'x');finite(p.y,'y');}
  const u=clamp(progress),q=1-u;
  return {x:q**3*p0.x+3*q*q*u*p1.x+3*q*u*u*p2.x+u**3*p3.x,y:q**3*p0.y+3*q*q*u*p1.y+3*q*u*u*p2.y+u**3*p3.y};
}
export function frameTimecode(frame:number,fps:number):string{
  fpsCheck(fps);if(!Number.isInteger(frame)||frame<0)throw new Error('frame must be a nonnegative integer');
  const seconds=Math.floor(frame/fps),pad=(n:number)=>String(n).padStart(2,'0');
  return `TC ${pad(Math.floor(seconds/3600))}:${pad(Math.floor(seconds/60)%60)}:${pad(seconds%60)}:${pad(frame%fps)}`;
}
export function truthfulProgress(frame:number,durationInFrames:number):number{
  if(!Number.isInteger(frame)||frame<0||!Number.isInteger(durationInFrames)||durationInFrames<1)throw new Error('Invalid frame span');
  return durationInFrames===1?1:clamp(frame/(durationInFrames-1));
}

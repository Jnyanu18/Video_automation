/** Frame-driven building blocks. No renderer, collision solver or automatic scene registration. */
import {spring} from 'remotion';
import type {Point} from './motion-policy';
export type Point3=Point & {z:number};
export const depthPresets={
  explosionSpring:{stiffness:300,damping:20,mass:1},
  burst:{secondsPerCell:.012,maxDelaySeconds:.3},
  shadow:{referenceElevationDesignPx:400,maxMultiplier:2.5,layers:[{y:30,blur:60,alpha:.2},{y:4,blur:12,alpha:.1}]},
  focus:{heroScale:1.1,backgroundScale:.8,backgroundOpacity:.35,backgroundBlurPx:12},
  blur:{maxPx:15,durationSeconds:8/60,referenceSpeedPxPerSecond:1800},
  impact:{durationSeconds:12/60,amplitudePx:18,widthPx:160,waveSpeedPxPerSecond:2400},
} as const;
function finite(n:number,name:string){if(!Number.isFinite(n))throw new Error(`${name} must be finite`);}
function positive(n:number,name:string){finite(n,name);if(n<=0)throw new Error(`${name} must be positive`);}
function clock(frame:number,fps:number){if(!Number.isInteger(frame))throw new Error('frame must be an integer');positive(fps,'fps');if(!Number.isInteger(fps))throw new Error('fps must be an integer');}
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
function point(p:Point3){for(const k of ['x','y','z'] as const)finite(p[k],k);}

/** Elevation is in DESIGN pixels above the receiving plane; returned shadows use DELIVERY pixels. */
export function elevationShadows(elevationDesignPx:number,designScale=1){
  finite(elevationDesignPx,'elevation');positive(designScale,'designScale');
  const factor=1+clamp(elevationDesignPx/depthPresets.shadow.referenceElevationDesignPx)*(depthPresets.shadow.maxMultiplier-1);
  return depthPresets.shadow.layers.map(l=>({x:0,y:l.y*factor*designScale,blur:l.blur*factor*designScale,alpha:l.alpha}));
}
/** Supply eased focus weight: 0 = inactive, 1 = hero. Keep HUD/captions outside blur. */
export function focusLayer(focusWeight:number,designScale=1){
  finite(focusWeight,'focusWeight');positive(designScale,'designScale');const q=clamp(focusWeight),p=depthPresets.focus;
  return {scale:p.backgroundScale+(p.heroScale-p.backgroundScale)*q,opacity:p.backgroundOpacity+(1-p.backgroundOpacity)*q,blurPx:p.backgroundBlurPx*(1-q)*designScale};
}
/** Single launch from rest with fixed endpoints; changing targets needs a state-continuous track. */
export function burstPosition(frame:number,fps:number,origin:Point3,target:Point3,delayFrames=0,config:{stiffness:number;damping:number;mass:number}=depthPresets.explosionSpring):Point3{
  clock(frame,fps);point(origin);point(target);
  if(!Number.isInteger(delayFrames)||delayFrames<0)throw new Error('delayFrames must be a nonnegative integer');
  for(const [name,value]of Object.entries(config))positive(value,name);
  const local=frame-delayFrames,q=local<0?0:spring({frame:local,fps,config});
  return {x:origin.x+(target.x-origin.x)*q,y:origin.y+(target.y-origin.y)*q,z:origin.z+(target.z-origin.z)*q};
}
/** screenVelocity is measured AFTER projection, in delivery pixels per second. */
export function directionalBlurState(screenVelocity:Point,elapsedFrames:number,fps:number,designScale=1){
  clock(elapsedFrames,fps);finite(screenVelocity.x,'velocity x');finite(screenVelocity.y,'velocity y');positive(designScale,'designScale');
  const speed=Math.hypot(screenVelocity.x,screenVelocity.y),age=elapsedFrames/fps;
  const u=clamp(age/depthPresets.blur.durationSeconds),window=1-u*u*(3-2*u);
  return {radiusPx:age<0?0:depthPresets.blur.maxPx*designScale*clamp(speed/(depthPresets.blur.referenceSpeedPxPerSecond*designScale))*window,
    angleRadians:speed===0?0:Math.atan2(screenVelocity.y,screenVelocity.x)};
}
/** Reciprocal strain preserves local 2D area. Uniform layout scaling belongs on a parent. */
export function areaPreservingScales(strain:number,limit=.2){
  finite(strain,'strain');finite(limit,'limit');if(limit<0||limit>=1)throw new Error('limit must be in [0,1)');
  const x=1+clamp(strain,-limit,limit);return {scaleX:x,scaleY:1/x};
}
/** One consistent coordinate space; a global response window, not a fresh lifetime per point. */
export function baselineDisplacement(x:number,frame:number,fps:number,options:{startX:number;endX:number;contactX:number;impactFrame:number;amplitudePx?:number;widthPx?:number;durationSeconds?:number;waveSpeedPxPerSecond?:number}){
  clock(frame,fps);finite(x,'x');
  const {startX,endX,contactX,impactFrame,amplitudePx=18,widthPx=160,durationSeconds=12/60,waveSpeedPxPerSecond=2400}=options;
  for(const [name,value]of Object.entries({startX,endX,contactX,amplitudePx}))finite(value,name);
  positive(widthPx,'widthPx');positive(durationSeconds,'durationSeconds');positive(waveSpeedPxPerSecond,'waveSpeedPxPerSecond');
  if(endX<=startX||contactX<startX||contactX>endX||!Number.isInteger(impactFrame)||impactFrame<0)throw new Error('Invalid baseline/contact geometry');
  const age=(frame-impactFrame)/fps,u=age/durationSeconds,distance=Math.abs(x-contactX),local=age-distance/waveSpeedPxPerSecond;
  if(x<=startX||x>=endX||age<=0||u>=1||local<=0)return 0;
  const spatial=Math.sin(Math.PI*(x-startX)/(endX-startX))**2*Math.exp(-.5*(distance/widthPx)**2);
  return amplitudePx*spatial*Math.sin(4*Math.PI*local/durationSeconds)*Math.exp(-3*u)*(1-u)**2;
}

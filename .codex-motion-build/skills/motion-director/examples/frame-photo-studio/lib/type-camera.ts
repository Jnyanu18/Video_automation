/** Optional frame-driven utilities. Templates supply layout, media, projection and rendering. */
import {bezierProgress,motionPresets,type Point} from './motion-policy';
export const typeCameraPresets={
  line:{travelDesignPx:32,staggerSeconds:.04,durationSeconds:.45},
  textFocus:{inactiveBlurDesignPx:10,inactiveOpacity:.25},
  hero:{initialScale:.3,targetScale:1,authoredPeak:1.08},
  grid:{rotateXDegrees:15,rotateYDegrees:-10,minZDesignPx:0,maxZDesignPx:80},
  camera:{pushScale:1.35,pushSeconds:15/60,macroCardScale:2.4,backgroundBlurDesignPx:16},
  recoil:{amplitudeDeliveryPx:4,rotationDegrees:.2,durationSeconds:.35,frequencyHz:8},
} as const;
function finite(n:number,label:string){if(!Number.isFinite(n))throw new Error(`${label} must be finite`);}
function positive(n:number,label:string){finite(n,label);if(n<=0)throw new Error(`${label} must be positive`);}
function integer(n:number,label:string){if(!Number.isSafeInteger(n))throw new Error(`${label} must be a safe integer`);}
function fpsCheck(fps:number){integer(fps,'fps');positive(fps,'fps');}
function validPoint(p:Point){finite(p.x,'x');finite(p.y,'y');}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** Caller supplies a measured line mask. No block opacity animation or automatic line splitting. */
export function lineEntrance(frame:number,fps:number,lineIndex:number,options:{startFrame?:number;designScale?:number;durationSeconds?:number;staggerSeconds?:number}={}){
  integer(frame,'frame');fpsCheck(fps);integer(lineIndex,'lineIndex');if(lineIndex<0)throw new Error('lineIndex cannot be negative');
  const {startFrame=0,designScale=1,durationSeconds=.45,staggerSeconds=.04}=options;
  integer(startFrame,'startFrame');positive(designScale,'designScale');positive(durationSeconds,'durationSeconds');finite(staggerSeconds,'staggerSeconds');if(staggerSeconds<0)throw new Error('staggerSeconds cannot be negative');
  // Round each absolute delay, not an already rounded one-line interval.
  const delayFrames=Math.round(lineIndex*staggerSeconds*fps),from=startFrame+delayFrames;
  const duration=Math.max(1,Math.round(durationSeconds*fps));
  const progress=bezierProgress((frame-from)/duration,motionPresets.easing.snap);
  return {from,progress,visibility:frame<from?'hidden' as const:'visible' as const,translateY:typeCameraPresets.line.travelDesignPx*designScale*(1-progress)};
}
/** Supply eased focus weight. Essential reading/captions must remain in a crisp layer. */
export function textFocus(weight:number,designScale=1){
  finite(weight,'weight');positive(designScale,'designScale');const q=clamp(weight);
  return {blurPx:typeCameraPresets.textFocus.inactiveBlurDesignPx*designScale*(1-q),opacity:typeCameraPresets.textFocus.inactiveOpacity+(1-typeCameraPresets.textFocus.inactiveOpacity)*q};
}
export function zoomScale(frame:number,fps:number,options:{startFrame:number;fromScale?:number;toScale?:number;durationSeconds?:number}){
  integer(frame,'frame');fpsCheck(fps);integer(options.startFrame,'startFrame');
  const {fromScale=1,toScale=1.35,durationSeconds=15/60}=options;positive(fromScale,'fromScale');positive(toScale,'toScale');positive(durationSeconds,'durationSeconds');
  const duration=Math.max(1,Math.round(durationSeconds*fps)),q=bezierProgress((frame-options.startFrame)/duration,motionPresets.easing.snap);
  return fromScale+(toScale-fromScale)*q;
}
export type Affine2D={a:number;b:number;c:number;d:number;e:number;f:number};
/** CSS matrix(a,b,c,d,e,f), transform-origin 0 0. This is a 2D camera, not a true dolly. */
export function anchoredCamera(worldAnchor:Point,screenAnchor:Point,scale:number,options:{rotationDegrees?:number;offsetDeliveryPx?:Point}={}):Affine2D{
  validPoint(worldAnchor);validPoint(screenAnchor);positive(scale,'scale');
  const {rotationDegrees=0,offsetDeliveryPx={x:0,y:0}}=options;finite(rotationDegrees,'rotationDegrees');validPoint(offsetDeliveryPx);
  const angle=rotationDegrees*Math.PI/180,a=scale*Math.cos(angle),b=scale*Math.sin(angle),c=-b,d=a;
  return {a,b,c,d,e:screenAnchor.x-a*worldAnchor.x-c*worldAnchor.y+offsetDeliveryPx.x,f:screenAnchor.y-b*worldAnchor.x-d*worldAnchor.y+offsetDeliveryPx.y};
}
function matrixCheck(m:Affine2D){for(const [key,n]of Object.entries(m))finite(n,key);}
export function projectPoint(p:Point,m:Affine2D):Point{validPoint(p);matrixCheck(m);return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};}
export function unprojectPoint(p:Point,m:Affine2D):Point{
  validPoint(p);matrixCheck(m);const determinant=m.a*m.d-m.b*m.c;
  if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)throw new Error('Camera matrix cannot be inverted safely');
  const x=p.x-m.e,y=p.y-m.f;return {x:(m.d*x-m.c*y)/determinant,y:(-m.b*x+m.a*y)/determinant};
}
/** Bounded authored impact response. Add only on named impacts, never continuous random shake. */
export function cameraRecoil(frame:number,fps:number,options:{eventFrame:number;amplitudeDeliveryPx?:number;rotationDegrees?:number;durationSeconds?:number;frequencyHz?:number;direction?:Point}){
  integer(frame,'frame');fpsCheck(fps);integer(options.eventFrame,'eventFrame');
  const {amplitudeDeliveryPx=4,rotationDegrees=.2,durationSeconds=.35,frequencyHz=8,direction={x:-.35,y:-1}}=options;
  finite(amplitudeDeliveryPx,'amplitudeDeliveryPx');finite(rotationDegrees,'rotationDegrees');positive(durationSeconds,'durationSeconds');positive(frequencyHz,'frequencyHz');validPoint(direction);
  if(amplitudeDeliveryPx<0||rotationDegrees<0)throw new Error('Recoil magnitudes cannot be negative');
  const length=Math.hypot(direction.x,direction.y);if(length===0||!Number.isFinite(length))throw new Error('Recoil direction needs a finite nonzero length');
  const age=(frame-options.eventFrame)/fps,u=age/durationSeconds;
  if(age<=0||u>=1)return {offsetDeliveryPx:{x:0,y:0},rotationDegrees:0};
  const envelope=Math.exp(-5*u)*(1-u)**2,w=2*Math.PI*frequencyHz*age;
  const move=amplitudeDeliveryPx*Math.sin(w)*envelope;
  return {offsetDeliveryPx:{x:direction.x/length*move,y:direction.y/length*move},rotationDegrees:rotationDegrees*Math.sin(w*.8)*envelope};
}
/** Authored phase windows; parentSettledFrame must come from actual template choreography. */
export function internalRevealSchedule(parentSettledFrame:number,fps:number,options:{materialSeconds?:number;chartSeconds?:number;digitsSeconds?:number}={}){
  integer(parentSettledFrame,'parentSettledFrame');if(parentSettledFrame<0)throw new Error('parentSettledFrame cannot be negative');fpsCheck(fps);
  const {materialSeconds=.12,chartSeconds=.35,digitsSeconds=.3}=options;
  for(const [key,value]of Object.entries({materialSeconds,chartSeconds,digitsSeconds})){finite(value,key);if(value<0)throw new Error(`${key} cannot be negative`);}
  const chartFrom=parentSettledFrame+Math.round(materialSeconds*fps);
  const digitsFrom=chartFrom+Math.round(chartSeconds*fps);
  return {materialFrom:parentSettledFrame,chartFrom,digitsFrom,settledFrame:digitsFrom+Math.round(digitsSeconds*fps)};
}

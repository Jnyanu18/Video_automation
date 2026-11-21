/** Planning helpers only. Actual font metadata, audio markers and compositing come from the host. */
export const highKineticPresets={
  variableType:{scaleFrom:1,scaleTo:4,weightFrom:400,weightTo:900,trackingFromEm:0,trackingToEm:-.03},
  staggerSeconds:[.02,.04],
  beats:{subdivisionsPerQuarter:4},
  goo:{stdDeviationDesignPx:12,alphaScale:19,alphaBias:-9},
  gridOpacity:[.05,.10],
} as const;
function finite(n:number,label:string){if(!Number.isFinite(n))throw new Error(`${label} must be finite`);}
function positive(n:number,label:string){finite(n,label);if(n<=0)throw new Error(`${label} must be positive`);}
function integer(n:number,label:string){if(!Number.isSafeInteger(n))throw new Error(`${label} must be a safe integer`);}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** wght range must be host-inspected from the approved font, not inferred from its name. */
export function variableTypeState(easedProgress:number,axis:{min:number;max:number},options:{scaleFrom?:number;scaleTo?:number;weightFrom?:number;weightTo?:number;trackingFromEm?:number;trackingToEm?:number}={}){
  finite(easedProgress,'easedProgress');positive(axis.min,'axis minimum');positive(axis.max,'axis maximum');if(axis.max<=axis.min)throw new Error('A variable wght axis needs a nonzero range');
  const {scaleFrom=1,scaleTo=4,weightFrom=400,weightTo=900,trackingFromEm=0,trackingToEm=-.03}=options;
  positive(scaleFrom,'scaleFrom');positive(scaleTo,'scaleTo');
  for(const [key,value]of Object.entries({weightFrom,weightTo,trackingFromEm,trackingToEm}))finite(value,key);
  if(weightFrom<axis.min||weightFrom>axis.max||weightTo<axis.min||weightTo>axis.max)throw new Error('Requested weights exceed the approved font axis; adapt explicitly or use the static-font treatment');
  const q=clamp(easedProgress),mix=(a:number,b:number)=>a+(b-a)*q;
  return {scale:mix(scaleFrom,scaleTo),weight:mix(weightFrom,weightTo),letterSpacingEm:mix(trackingFromEm,trackingToEm)};
}
/** Straight subdivisions between measured quarter beats; swung hits need their actual timestamps. */
export function subdivisionFrames(quarterBeatsSeconds:readonly number[],fps:number,options:{subdivisionsPerQuarter?:number;offsetFrames?:number}={}):number[]{
  integer(fps,'fps');positive(fps,'fps');if(quarterBeatsSeconds.length<2)throw new Error('Supply at least two measured quarter beats');
  const {subdivisionsPerQuarter=4,offsetFrames=0}=options;integer(subdivisionsPerQuarter,'subdivisionsPerQuarter');positive(subdivisionsPerQuarter,'subdivisionsPerQuarter');integer(offsetFrames,'offsetFrames');
  for(let i=0;i<quarterBeatsSeconds.length;i++){const t=quarterBeatsSeconds[i];finite(t,'beat timestamp');if(t<0||i>0&&t<=quarterBeatsSeconds[i-1])throw new Error('Measured beat timestamps must be nonnegative and strictly increasing');}
  const frames:number[]=[];
  for(let i=0;i<quarterBeatsSeconds.length-1;i++)for(let j=0;j<subdivisionsPerQuarter;j++){
    const t=quarterBeatsSeconds[i]+(quarterBeatsSeconds[i+1]-quarterBeatsSeconds[i])*j/subdivisionsPerQuarter;
    frames.push(offsetFrames+Math.round(t*fps));
  }
  frames.push(offsetFrames+Math.round(quarterBeatsSeconds.at(-1)!*fps));
  if(frames[0]<0)throw new Error('Beat offset places an event before frame zero');
  if(frames.some((f,i)=>i>0&&f<=frames[i-1]))throw new Error('Beat states collide after frame quantization; simplify subdivisions or increase FPS');
  return frames;
}
/** Use this ONE index to select both the word and palette pair from host-approved states. */
export function beatSwapIndex(frame:number,markerFrames:readonly number[],stateCount:number):number|null{
  integer(frame,'frame');integer(stateCount,'stateCount');positive(stateCount,'stateCount');
  if(markerFrames.length===0)throw new Error('Beat swap needs explicit marker frames');
  markerFrames.forEach((f,i)=>{integer(f,'marker frame');if(f<0||i>0&&f<=markerFrames[i-1])throw new Error('Marker frames must be nonnegative and strictly increasing');});
  if(frame<markerFrames[0])return null;
  let lo=0,hi=markerFrames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(markerFrames[mid]<=frame)lo=mid;else hi=mid-1;}
  return lo%stateCount;
}
/** Models only the alpha transfer 19a-9 (default), not Gaussian geometry or bridge distance. */
export function gooAlpha(alpha:number,scale=19,bias=-9):number{
  finite(alpha,'alpha');positive(scale,'alpha scale');finite(bias,'alpha bias');if(alpha<0||alpha>1)throw new Error('Source alpha must be in [0,1]');
  return clamp(scale*alpha+bias);
}

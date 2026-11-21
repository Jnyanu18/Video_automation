import {spring} from 'remotion';

export const fps=60;
export const profiles={
  shell:{mass:1,stiffness:250,damping:22},
  letters:{mass:.6,stiffness:240,damping:15},
  control:{mass:.55,stiffness:340,damping:20},
  artwork:{mass:.8,stiffness:210,damping:18},
};
export type Profile=keyof typeof profiles;
export const step=(t:number,start:number,profile:Profile='shell')=>t<start?0:spring({frame:(t-start)*fps,fps,config:profiles[profile]});

/** Superposed step responses preserve residual motion when a new target arrives. */
export function springTrack(t:number,initial:number,targets:[number,number][],profile:Profile='shell'){
  let value=initial,previous=initial;
  for(const [start,target]of targets){value+=(target-previous)*step(t,start,profile);previous=target;}
  return value;
}
export const widthTargets:[number,number][]=[[.55,124],[1.24,840],[4.43,300],[5.18,840],[7.18,740],[7.94,150]];
export const heightTargets:[number,number][]=[[1.45,144],[1.78,620],[3.24,136],[4.43,160],[5.18,136],[5.9,650],[7.18,126],[7.94,150]];
export const radiusTargets:[number,number][]=[[1.78,62],[3.24,72],[5.9,60],[7.18,70],[7.94,80]];
export function shell(t:number){return {w:springTrack(t,430,widthTargets),h:springTrack(t,124,heightTargets),r:springTrack(t,70,radiusTargets)};}

/** Damped response to a short impulse; zero before contact and no timer clock. */
export function kick(t:number,start:number){const s=t-start;return s<0?0:Math.sin(s*32)*Math.exp(-s*14);}
export function deformation(t:number){
  const now=shell(t),prev=shell(t-1/fps);
  const velocity=(now.w-prev.w)/Math.max(120,now.w)-(now.h-prev.h)/Math.max(120,now.h);
  const contact=.065*kick(t,.55)+.024*kick(t,4.88);
  const sx=1+Math.tanh(velocity*3.5)*.075+contact;
  return {sx,sy:1/sx};
}

// Copy into your React app and adjust imports. This is a component, not a full editor.
import React from 'react';
import {Player} from '@remotion/player';
import {Video} from '../starter/src/Video';
import {validateProject,type Project} from '../starter/src/schema';

export function EditablePreview({project,onChange}:{project:Project;onChange:(next:Project)=>void}){
  const p=validateProject(project);
  const [first]=p.scenes;
  return <div>
    <Player component={Video} inputProps={{project:p}} durationInFrames={p.canvas.durationInFrames} fps={p.canvas.fps} compositionWidth={p.canvas.width} compositionHeight={p.canvas.height} controls style={{width:'100%',maxHeight:'70vh'}}/>
    <label>Opening headline<input value={first.headline} maxLength={110} onChange={event=>{
      const next=structuredClone(p);next.scenes[0].headline=event.target.value||' ';
      // The real server assigns/locks revision numbers and invalidates approval.
      next.revision=p.revision+1;onChange(next);
    }}/></label>
    <label>Primary color<input type="color" value={p.brand.primary} onChange={event=>onChange({...p,revision:p.revision+1,brand:{...p.brand,primary:event.target.value}})}/></label>
  </div>;
}

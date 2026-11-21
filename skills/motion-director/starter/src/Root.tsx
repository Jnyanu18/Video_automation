import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {validateProject} from './schema';
import sample from '../../examples/mixed-launch.json';

export const Root:React.FC=()=>{
  const project=validateProject(sample);
  return <Composition id="ReferenceMotion" component={Video} defaultProps={{project}} width={project.canvas.width} height={project.canvas.height} fps={project.canvas.fps} durationInFrames={project.canvas.durationInFrames}
    calculateMetadata={({props})=>{
      const p=validateProject(props.project);
      return {width:p.canvas.width,height:p.canvas.height,fps:p.canvas.fps,durationInFrames:p.canvas.durationInFrames,props:{project:p}};
    }}/>;
};

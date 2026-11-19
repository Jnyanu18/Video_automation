import React from 'react';
import {Composition} from 'remotion';
import {Reel, plan} from './Reel';

export const Root: React.FC = () => (
  <Composition
    id="CalmindReel"
    component={Reel}
    width={plan.width}
    height={plan.height}
    fps={plan.fps}
    durationInFrames={plan.durationInFrames}
    defaultProps={{blur: true}}
  />
);

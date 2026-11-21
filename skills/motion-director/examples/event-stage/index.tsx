import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {EventStageFilm} from './EventStage';
import {EventStageSchema,validateEventStage} from './config';
import data from './project.json';
const Root=()=>{const p=validateEventStage(data);return <Composition id="EventStageReel" component={EventStageFilm} schema={EventStageSchema} defaultProps={p} fps={p.fps} width={p.width} height={p.height} durationInFrames={p.durationInFrames}/>;};
registerRoot(Root);

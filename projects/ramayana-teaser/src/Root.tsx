import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Film} from './kit/film';
import {film} from './film';

// Props cross a JSON boundary, so the film config (which holds functions) is captured here, not passed as a prop.
const FilmComp: React.FC<{blur: boolean}> = ({blur}) => <Film cfg={film} blur={blur} />;

const Root: React.FC = () => (
  <Composition
    id="Film"
    component={FilmComp}
    width={film.width}
    height={film.height}
    fps={film.fps}
    durationInFrames={Math.round(film.duration * film.fps)}
    defaultProps={{blur: true}}
  />
);

registerRoot(Root);

import React from "react";
import { Frame } from "../../kit/Frame";
import { Headline } from "../../kit/Blocks";
import { Cue, Word } from "../../kit/theme";
import cuesJson from "../../../../videos/roof-numbers/cues.json";
import wordsJson from "../../../../videos/roof-numbers/words.json";
import voiceMeta from "../../../../videos/roof-numbers/voice/meta.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

// One entry per beat id in storyboard.md. Built from the kit in remotion/src/kit.
export const RoofNumbers: React.FC = () => (
  <Frame
    slug="roof-numbers"
    cues={cues}
    words={words}
    draftVoice={voiceMeta.draft}
    beats={{}}
  />
);

import { WhatIsVerb, seconds as WhatIsVerbSeconds } from "./what-is-verb";
import { Day12FeatureTrap, seconds as Day12FeatureTrapSeconds } from "./day-12-feature-trap";
import React from "react";

// One line per video. bin/new.py adds to this list; nothing else needs to change when a video is added.
export type VideoEntry = { slug: string; Scene: React.FC; seconds: number };

export const VIDEOS: VideoEntry[] = [
  // registry:entries
  { slug: "what-is-verb", Scene: WhatIsVerb, seconds: WhatIsVerbSeconds },
  { slug: "day-12-feature-trap", Scene: Day12FeatureTrap, seconds: Day12FeatureTrapSeconds },
];

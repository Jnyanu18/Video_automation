import { BEATS } from "./src/beats";
import { CHUNKS } from "./src/captions";
console.log(JSON.stringify({ beats: BEATS.map(b => ({ id: b.id, s: +b.s.toFixed(2), e: +b.e.toFixed(2), mode: b.mode, tile: b.tile })), chunks: CHUNKS.map(c => ({ s: +c.s.toFixed(2), e: +c.e.toFixed(2), text: c.words.map(w => w.w).join(" ") })) }));

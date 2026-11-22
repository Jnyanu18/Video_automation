// The one place that talks to Remotion. Bundles once, then renders stills or videos.
//   node bin/remotion.mjs stills <slug> <outDir> <frame,frame,...>
//   node bin/remotion.mjs render <compositionId> <out.mp4>
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [mode, a, b, c] = process.argv.slice(2);

const serveUrl = await bundle({
  entryPoint: path.join(root, "remotion", "src", "index.ts"),
  publicDir: path.join(root, "videos"),
});

if (mode === "stills") {
  const composition = await selectComposition({ serveUrl, id: `${a}-16x9` });
  for (const f of c.split(",").map(Number)) {
    const frame = Math.min(f, composition.durationInFrames - 1);
    await renderStill({ serveUrl, composition, frame, output: path.join(b, `frame-${String(frame).padStart(5, "0")}.png`) });
    console.log(`still ${frame}`);
  }
} else if (mode === "render") {
  const composition = await selectComposition({ serveUrl, id: a });
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: b,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${a}: ${p * 10}%`);
      }
    },
  });
} else if (mode === "th-render" || mode === "th-stills") {
  // Talking head: one composition, told which video to draw by its slug.
  //   node bin/remotion.mjs th-render <slug> <out.mp4> [scale]
  //   node bin/remotion.mjs th-stills <slug> <outDir> <frame,frame,...>
  const inputProps = { slug: a };
  const composition = await selectComposition({ serveUrl, id: "talking-head", inputProps });
  if (mode === "th-stills") {
    for (const f of c.split(",").map(Number)) {
      const frame = Math.min(f, composition.durationInFrames - 1);
      await renderStill({ serveUrl, composition, inputProps, frame, output: path.join(b, `frame-${String(frame).padStart(5, "0")}.png`) });
    }
    console.log(`${a}: stills done`);
  } else {
    let last = -1;
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: "h264",
      outputLocation: b,
      scale: c ? Number(c) : 1,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10);
        if (p !== last) {
          last = p;
          console.log(`${a}: ${p * 10}%`);
        }
      },
    });
  }
} else {
  console.error("mode must be stills, render, th-render or th-stills");
  process.exit(1);
}

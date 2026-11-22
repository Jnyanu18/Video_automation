// The one place that talks to Remotion. Bundles once, then renders stills or videos.
//   node kit/remotion.mjs stills <slug> <outDir> <frame,frame,...> [16x9|9x16]
//   node kit/remotion.mjs render <compositionId> <out.mp4>
import { mkdirSync, rmSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [mode, a, b, c, d] = process.argv.slice(2);

// One frame at a time. This laptop has 4 threads, and a render on all of them overheated it into a thermal
// shutdown twice on 2026-10-22. Slower, but it stays cool. STUDIO_CONCURRENCY overrides it on a bigger machine.
const concurrency = Number(process.env.STUDIO_CONCURRENCY || 1);

// The bundle copies all of videos/ (footage included), so it lives on D: and is deleted when this run ends,
// however it ends. Left in the system temp folder, 50 runs filled C: (22 GB, 2026-10-21).
// Each run has its own folders (by process id): a stills run once wiped a render's bundle mid-render (2026-10-26).
const outDir = path.join(root, ".cache", `bundle-${process.pid}`);
rmSync(outDir, { recursive: true, force: true });
process.on("exit", () => rmSync(outDir, { recursive: true, force: true }));

// Remotion's own temp files (frames, audio) go to D: too, and are wiped when the run ends. In the Windows temp
// folder every run left one behind: 401 of them, 24 GB, filled C: on 2026-10-23.
const tmp = path.join(root, ".cache", `tmp-${process.pid}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
process.env.TEMP = process.env.TMP = tmp;
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));

// The bundle copies its public folder, and all of videos/ ran out of disk on 2026-10-26. STUDIO_ONLY="slug,_sfx"
// bundles just those folders of videos/ (joined in through junctions); a sheet needs none. Unset, it is all of videos/.
const only = mode === "sheet" ? [] : process.env.STUDIO_ONLY?.split(",").filter(Boolean);
let publicDir = path.join(root, "videos");
if (only) {
  publicDir = path.join(root, ".cache", `public-${process.pid}`);
  rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(publicDir, { recursive: true });
  for (const f of only) cpSync(path.join(root, "videos", f), path.join(publicDir, f), { recursive: true });
  process.on("exit", () => rmSync(publicDir, { recursive: true, force: true }));
}

const serveUrl = await bundle({
  entryPoint: path.join(root, "remotion", "src", process.env.STUDIO_ENTRY || "index.ts"),
  publicDir,
  outDir,
});

if (mode === "stills") {
  const composition = await selectComposition({ serveUrl, id: `${a}-${d ?? "16x9"}` });
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
    concurrency,
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
  //   node kit/remotion.mjs th-render <slug> <out.mp4> [scale]
  //   node kit/remotion.mjs th-stills <slug> <outDir> <frame,frame,...>
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
      concurrency,
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
} else if (mode === "cover") {
  // A talking-head cover: one still, its words given as JSON.
  //   node kit/remotion.mjs cover <out.png> '{"slug":..,"at":..,"title":..,"mark":..,"kicker":..}'
  const inputProps = JSON.parse(b);
  const composition = await selectComposition({ serveUrl, id: inputProps.look === "clay" ? "cover-clay" : inputProps.layout ? "cover-design" : "th-cover", inputProps });
  await renderStill({ serveUrl, composition, inputProps, frame: 0, output: a });
  console.log(`cover: ${a}`);
} else if (mode === "carousel") {
  // Carousel: one slide per frame.
  //   node kit/remotion.mjs carousel <slug> <outDir> <slide count>
  const inputProps = { slug: a };
  const composition = await selectComposition({ serveUrl, id: "carousel", inputProps });
  for (let f = 0; f < Number(c); f++) {
    await renderStill({ serveUrl, composition, inputProps, frame: f, output: path.join(b, `frame-${String(f).padStart(5, "0")}.png`) });
  }
  console.log(`${a}: ${c} slides`);
} else if (mode === "sheet") {
  // A still per frame of a composition, such as the style review sheet.
  //   node kit/remotion.mjs sheet <compositionId> <outDir> <frame count>
  const composition = await selectComposition({ serveUrl, id: a });
  for (let f = 0; f < Number(c); f++) {
    await renderStill({ serveUrl, composition, frame: f, output: path.join(b, `page-${f + 1}.png`) });
    console.log(`${a}: page ${f + 1}`);
  }
} else {
  console.error("mode must be stills, render, th-render, th-stills, carousel or sheet");
  process.exit(1);
}

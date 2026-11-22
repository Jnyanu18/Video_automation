---
name: art-styles
description: The studio's art styles (neo-brutalism, liquid glass, paper cutout, doodle, sticker bomb, claymorphism, CRT, pixel art and more): which ones are Vishnu's brand, which are for other work, and each style's colours, type, shapes and motion. Use when choosing the look of a video, carousel or cover.
---

# Art styles

Every style here was seen by Vishnu on the review sheet (`videos/_styles/out/all-styles.png`, 2026-10-23) and
kept. Each has a file in `styles/` and reference tiles (a headline, a chat, a stat) in
`remotion/src/lanes/styles/StyleSheet.tsx`. Build a new piece from those tiles; do not invent a new look.

## Two uses

**1. Vishnu's personal brand (AskVerb, building in public).** One small set, used every time, so people know
it is him before they read a word. Do not drift outside it for his own posts.

**The brand set (Vishnu, 2026-10-23: "these 5 should be it"):**

| Style | Job in the brand |
| --- | --- |
| Pastel neo-brutalism (the `effects` skill) | paused 2026-10-23: "do not use neo brutalism until I ask"; claymorphism took its place |
| Liquid glass (the `effects` skill, `glass`) | the one big number over footage |
| Paper cutout (`styles/paper-cutout.md`) | covers, carousels and story moments |
| Hand-drawn doodle (`styles/doodle.md`) | explaining: arrows, circled numbers, notes on screen |
| Claymorphism (`styles/claymorphism.md`) | the base since 2026-10-23: every card, chip, number, caption, name tag, end card and cover (`style: clay`, `remotion/src/lanes/talking-head/clay.tsx`) |

All five are tactile, things you could touch, which is the opposite of the glossy AI look he rejected. Clay
is the soft one, so it carries the product and never the hook. Sticker bomb is close to neo-brutalism and can
accent an end card. Change this table only on his word.

**2. Everything else (agency and client videos, one-offs).** Any style below, chosen for the subject. One style
per piece; never mix two in one video.

## The library

| Style | File | Good for | Note |
| --- | --- | --- | --- |
| Pastel neo-brutalism | `effects` skill | cards, chips | brand base |
| Liquid glass | `effects` skill | a number over footage | brand |
| Paper cutout / Collage | `paper-cutout.md` | covers, carousels, his photo | brand; loved |
| Hand-drawn doodle | `doodle.md` | explainers, annotations | brand; loved |
| Sticker bomb | `sticker-bomb.md` | hooks, lists, end cards | loved |
| Claymorphism | `claymorphism.md` | product UI, friendly explainers, a stat | brand |
| Neumorphism | `neumorphism.md` | a calm stat, a toggle, a ring | |
| Bento grid | `bento.md` | several numbers at once | |
| Swiss / International | `swiss.md` | serious points, a big number | sometimes only |
| Memphis | `memphis.md` | playful hooks, lists | |
| Risograph print | `risograph.md` | a cover now and then | light use only |
| Halftone / Pop art | `pop-art.md` | shock lines, reactions | |
| Isometric 3D | `isometric.md` | growth, how parts fit | |
| Retro terminal / CRT | `crt.md` | the agent working, logs | |
| Pixel art / 8-bit | `pixel.md` | progress, choices, milestones | |
| Vaporwave | `vaporwave.md` | nostalgia, old way vs new | |
| Kinetic typography | `kinetic.md` | hooks, voice-over without a face | motion only |
| Bauhaus | `bauhaus.md` | structured three-part ideas | |
| Acid / Brutalist web | `acid.md` | edgy or developer points | |
| Polaroid / Scrapbook | `polaroid.md` | personal story, before and after | real photos only |
| Minimal monochrome | `minimal.md` | quotes, serious lines | |

Seen and not kept: Y2K / Frutiger Aero (rejected). Skeuomorphism, Editorial, Blueprint, Grainy mesh gradient and
Duotone were on the sheet and not picked; their tiles stay in `StyleSheet.tsx` as a record. Do not use them
unless he asks.

## Rules

- **The look is a check like any other:** show him stills in the chosen style before rendering, and wait for his yes.
- **Every number is true**, from his records, whatever the style. The sample tiles use day 24, 23 sign-ups,
  0 paying, a goal of 10, and 2,500+ users; update them before reuse.
- **Photos are real:** his footage or the product, never a stock or made-up face.
- **Readable first:** on a phone at arm's length. Several styles fail this when pushed (text over the vaporwave
  sun, stretched acid type, low-contrast neumorphism); each file's Avoid line says how.

## A new style

Add it to `STYLES` in `StyleSheet.tsx` with its three tiles, render the sheet, and show it to him. Only after
his yes, write `styles/<name>.md` and add a row here.

```
node kit/remotion.mjs sheet style-sheet videos/_styles/out <pages>
```

Pages hold five styles each, so pass the number of styles divided by five, rounded up. Renders run one frame at
a time.

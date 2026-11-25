---
name: graph
description: Use when a reel needs one number that changes over time shown as a line graph that draws itself while the number counts up (followers, revenue, stars, users, a price, a deadline count). A scene called `graph` in the faceless lane, timed to the voice, dark or light. Not 3D, not a multi-series chart.
---

# graph (the `graph` scene)

One line, one big number. The line draws left to right while the number counts up with its tip, lands on the final value
with a pulse, and a short gold chip can appear under it. It is a scene in `remotion/src/lanes/animated/faceless.tsx`
(`Graph`), so it sits in `scenes.json` like any other scene and the voice sets its pace.

Made 2026-11-02 after testing artemnovitckii/claude-animation-skills (MIT): the idea only, no code copied. Both themes were
checked as storyboard stills; it has not been in a posted reel yet.

## Use it

```json
{"scene": "graph", "at": "every week", "bg": "#0d0e12", "section": "graph", "mark": ["climbs"],
 "poses": [{"on": "every week", "pose": "point-left"}],
 "props": {"look": "dev", "stageScale": 1.0, "stageLift": 60, "slug": "<slug>", "theme": "dark",
   "label": "Followers", "values": [1.2, 2.1, 3.4, 5, 9, 24, 51, 78, 100], "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
   "final": 100000, "prefix": "", "suffix": "", "decimals": 0, "chip": "In nine months",
   "parts": {"draw": "every week", "land": "hundred thousand"}}}
```

| prop | meaning |
| --- | --- |
| `values` | 2 or more numbers, 0 or above, oldest first; the highest touches the top gridline |
| `labels` | optional, one per value under the axis (every other one past 12) |
| `final` | what the count lands on; values may be in thousands and `final` in full (count = value under the tip times `final / last value`) |
| `prefix`, `suffix`, `decimals` | `"$"`, `"%"`, ` " views"`; the number shrinks itself when long |
| `theme` | `"dark"` (scene `bg` `#0d0e12`: gold line, white number) or `"light"` (`bg` `#f3f1ec`: ink line, gold dot) |
| `chip` | optional line that fades in after the landing (4 words at most) |
| `parts.draw`, `parts.land` | phrases in the voice: the line starts on `draw` and lands exactly on `land`; without them it draws for `drawSeconds` (2.6) from the scene start |

Sound: a soft swipe at the start, a ding and a sparkle on the landing (three hits).

## Rules

- **Real numbers only.** Ask Vishnu for the figures (or his screenshot). Never invent data. If only a start and an end are
  known, say the curve is illustrative in the label ("illustrative").
- The label is a plain noun ("Followers", "Monthly revenue"), not a slogan. One number, one line: no callouts, no "83x"
  chips, no marketing words on the graphic.
- A curve that grows late (slow, then steep) reads best, but it must be the real shape.
- Storyboard first, as for every scene: draw stills at the landing and one mid-draw before any render.
- Scene `props.slug` is the video's folder; the scene needs the voice to say the number's phrase so `land` can find it.

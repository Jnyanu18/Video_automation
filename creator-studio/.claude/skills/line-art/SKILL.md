---
name: line-art
description: Use when a reel needs a calm picture of steady progress, habits, compounding or patience: hairline steps rise one by one, a dot hops up them, and at the top an orbit draws round it with a few sparks. A scene called `lineart` in the faceless lane, timed to the voice, dark or light. Not for data (use graph for numbers).
---

# line-art (the `lineart` scene)

Thin outlined steps rise left to right, a solid dot hops up them (one arc per step), and when it reaches the top it
turns gold, an orbit draws round it and a ring and a few sparks burst out. It carries an idea, not a figure. The words
come from the spoken captions already on screen, so the scene has no text of its own except an optional chip.

It is a scene in `remotion/src/lanes/animated/faceless.tsx` (`LineArt`). Made 2026-11-02 after testing
artemnovitckii/claude-animation-skills (MIT): the idea only, no code copied. Both themes were checked as storyboard
stills; it has not been in a posted reel yet.

## Use it

```json
{"scene": "lineart", "at": "every step", "bg": "#f3f1ec", "section": "line art", "mark": ["back"],
 "poses": [{"on": "every step", "pose": "point-left"}],
 "props": {"look": "dev", "stageScale": 1.0, "stageLift": 60, "slug": "<slug>", "theme": "light", "steps": 5, "chip": "Look back",
   "parts": {"start": "every step", "top": "look back"}}}
```

| prop | meaning |
| --- | --- |
| `steps` | 3 to 7 (default 5); one hop per step |
| `theme` | `"dark"` (`bg` `#0d0e12`: white hairlines, white dot) or `"light"` (`bg` `#f3f1ec`: ink hairlines, ink dot) |
| `chip` | optional gold line that fades in after the dot reaches the top (4 words at most) |
| `parts.start`, `parts.top` | phrases in the voice: the first step rises on `start`, and the dot lands on the top step exactly on `top`; the hops are spread evenly between them (at least 1.2 s) |

Sound: a soft pop at the start, a chime and a sparkle at the top (three hits).

## Rules

- The idea must be about steady progress (habits, compounding, patience, "every step feels small"), because the picture
  is a dot climbing steps. For a number that changes over time, use `graph`.
- Quiet and plain: no emojis, no extra shapes, gold only at the top. For another motif (a maze, a line that wanders), add
  a new view next to `LineArt` in `faceless.tsx` and keep the rules: hairline strokes, one solid dot, gold as the payoff.
- Give the scene at least 2 s between `start` and `top`, or the hops look rushed.
- Storyboard first: draw stills mid-climb and at the top before any render.

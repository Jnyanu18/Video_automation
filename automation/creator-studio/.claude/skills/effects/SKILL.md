---
name: effects
description: The talking-head effects (glass graph, screen push, and more as they are added): what each one is for, its edit.md line, and how to check it. Use when planning the edit step of a talking-head video.
---

# Talking-head effects

Each effect is one beat in `edit.md`, anchored on spoken words like every other beat, and built in
`remotion/src/lanes/talking-head/effects.tsx`. Adapted from the "Effect of the Day" prompts (EP. 02, EP. 03);
the glass refraction follows liquid-glass-js by Armagan Amcalar (MIT licence), credited in the code.

## The 3-second rule (Vishnu, 2026-10-22)

**Never more than about 3 seconds without something new on screen**: a card, a zoom, chips, an effect, b-roll.
His first edit of `add-ai-agent-to-saas` sat 18 seconds with only his face and captions, and he said viewers
would leave. But it must never become an eyesore:

- **Rotate the kinds.** Zoom, card, chips, zoom, effect. Two cards in a row read as a slideshow.
- **Zooms are the quiet filler.** A 1.08 to 1.12 push on a key phrase keeps it moving without adding anything to read.
- **One thing at a time.** Cards share one spot; the plan step makes each end when the next starts.
- **Big effects stay rare** (glass, screen, shoulder): one or two a video, on the lines that earn them.
- **Check the plan for gaps**: list the beats' times from `work/edit.json` and look for any stretch over 3 seconds.

## chips: short labels that pop in as each is said

```
- chips "pricing" Pricing | FAQ | About us
```

Each label stamps in on its own word (found in order after the anchor), with a soft pop sound, drawn in
**pastel neo-brutalism** (below). Best for a spoken
list, two to four labels of one or two words. Use sparingly: Vishnu banned them once as "AI-looking", then
brought them back the same day (2026-10-22), so keep them to a list that is really spoken, at most twice a video.

## Art style: pastel neo-brutalism (Vishnu, 2026-10-22)

The look for chips, and the one to reach for when a beat needs a "designed" feel rather than the plain light card:
a **5px black outline**, a **hard black shadow with no blur** (offset 7 to 10px, down and right), a **flat
pastel fill** that changes per item (butter `#FFE89A`, mint `#B8F2D0`, lilac `#D9C8FF`, peach `#FFC9B0`,
sky `#BDE3FF`), **bold DM Sans** in near-black `#111`, corners 16px, a tilt of 2 degrees alternating. Never a
dot, never a soft glow. The earlier white pills with a gold dot read as AI-made; this did not.

**The default look** (Vishnu picked it 2026-10-22 over an all-pastel version): light cards (`style: light`) with
pastel neo-brutalist chips in between. `style: brutal` puts every card in the pastel style; it is kept for
comparison (`add-ai-agent-to-saas/out/B-neo-brutal`), not the default.

## When to use one

- **At most one or two effects per video.** An effect is the moment; five of them is noise.
- **Only on a line that earns it:** a real number (glass) or the one sentence the video is about (screen).
- The number on a glass card is a true number from his records, like every number in the studio.

## glass: a liquid glass card with a velocity graph

```
- glass "more than 2.5K" USERS | 2,500+ | gold top=1180
```

`TITLE | END NUMBER | colour`. The counter climbs from a fifth of the end number while a glowing line draws up,
the card punches when it lands, holds, then sinks away. Colour defaults to brand gold (names: gold, green,
white, amber, red, blue, pink, mint, or a hex). `top=` places the card (pixels from the top of 1080x1920,
default 860): put it **below the chin**, never over the mouth. Captions step aside while it is up.
Lasts 3.2 s (`dur=` to change).

## screen: a macro shot of a monitor, one word per cut

```
- screen "only one of them actually makes money"
- screen "stop scrolling" STOP SCROLLING. | #FFC46B
```

Cuts from him to LCD pixels showing the words, hard-cutting to each word the moment he says it, then back.
With no text after the anchor, the screen shows the spoken words. Text after the anchor is shown exactly as
typed; if it is not what he says, the words are spread evenly over `dur=` (default 2 s). Colour defaults to
white. Reads best at 3 to 15 words. Captions are off while it is up.

## shoulder: push in, a card over each shoulder, whip between them

```
- shoulder "I built more than six apps" BUILT | 6+ | apps >> MAKES MONEY | 1 | app style=transition
```

`LABEL | BIG | small >> LABEL | BIG | small`, each card shown exactly as typed (one part alone is the big
text). The camera pushes in, slides so the first card lands over his left shoulder, whips across to the second
over his right shoulder, then eases back out; 4.6 s in all. `style=transition` breaks the first card's big text
into points of light that streak into the second. `colour=` sets the outline, labels and light (default gold
deep, readable on the white card). Big text reads best at up to about 9 characters.

**It needs the right framing**: chest up, face in the middle, head about a third of the frame wide, space
beside it. Measure the face from a frame and set it once in Settings: `face: <x> <width> <eye>` (face centre
across, head width ear to ear, eye height; all 0 to 1). A face wider than about 0.4 cannot be fixed in the edit:
the cards land on the hair (seen on `who-is-vishnu`, face 0.69 wide, 2026-10-21). Tell him before he films a
video that will use it: phone a step further back.

## Check (always, before showing Vishnu)

Render stills mid-effect and look at them: the glass card clear of the face, the line rising with the dot on
its tip, the number right; the screen word big, centred and spelled exactly. He checks the sound and timing in
the preview.

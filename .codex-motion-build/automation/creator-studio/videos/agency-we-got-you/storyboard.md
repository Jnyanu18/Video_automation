# Storyboard v3: We got you (Auralion Labs)

Contact sheet: `stills/contact-sheet.png` (16 stills, single frames, nothing rendered). 9:16, 1080x1920, 30 fps, 12 s,
a seamless loop. Code: `remotion/src/lanes/animated/agency-we-got-you.tsx`.

## What changed from v2, and why (from a second look at the reference, research/viral/DeUQCEbDPM7/card.md)

| v2 (rejected) | v3 | The reference |
| --- | --- | --- |
| the whole frame split into a white and a black world, a seam through the logo and footer | only the text changes; the stage, logo and footer never move | only the text changes |
| short string, 27 degrees, a vertical cut 100 px from the string | pivot 1540 px above the frame, about 9 degrees, the string is the cut | pivot far above, about 9 degrees, the string cuts |
| each question a different shape and size | NEED / <words>? at one size (92 px) | NEED / <words>?, one size |
| damped stop and an end card | 12 s loop, the last frame runs into the first | 12 s loop |
| no depth | soft shadow of the string and badge on the stage | soft shadow |

## Beats (one cycle, then the same five times)

| Time | On screen |
| --- | --- |
| 0.0 | badge at the far right, NEED / A WEBSITE? in grey |
| 0.6 | the string crosses the text: grey question left of it, white WE GOT YOU. right of it |
| 1.2 | badge at the far left, WE GOT YOU. in white |
| 1.8 | swinging back: the next question cut in left of the string |
| 2.4, 4.8, 7.2, 9.6 | NEED / A MOBILE APP?, SOFTWARE?, AI AGENTS?, AUTOMATION? |
| 11.4 to 12.0 | the last swing brings back NEED / A WEBSITE?: the loop |

## Look

Dark: a black stage with a soft spotlight at the centre, the question in grey `#9a9ca8`, the answer in white, Poppins 800
(the site's font). A light string and a white badge with our ink mark, both casting a soft shadow.

## Sound (made after the yes)

As in the reference (measured: two hits a swing, wide stereo, -16.4 LUFS): a tick where each swing turns, a swish as the
string slices the text, both panned left and right with the badge. No music unless Vishnu asks (he picked effects only).

## Cover options

q1 (NEED A WEBSITE?), a1 (WE GOT YOU.), q2 (NEED A MOBILE APP?).

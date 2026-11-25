# How adilet.fndr builds a reel, frame by frame (studied 2026-10-26)

Two of his reels, cut into 1 frame a second and 6 frames a second, with hard cuts counted by ffmpeg scene detection and
sharp sound hits counted from the audio: DdyqycEINNe ("your vibe-coded app can get sued", 70 s) and De8yh94R0SZ
("42,500 followers in 5 weeks", 48 s). Studied after Vishnu called our first faceless render AI slop.

## What he does

1. **One take.** 2 hard cuts in 70 s, 3 in 48 s. One fixed frame for the whole video: the line on top, one object in
   the middle, the character big at the bottom. Nothing cuts; the object changes.
2. **The character is the star.** Bottom centre, cropped at the chest, about 45% of the frame, never leaves. A new pose
   about every second, each acting the line: waves on "your", points at the number, facepalms on "sued", shrugs,
   sweats, hand on cheek, finger up, wink. The mouth moves with the voice.
3. **Objects morph in place.** The next object pushes the last one out (slides up, blurs, fades) while it lands, so
   there is always motion and never an empty frame. Numbers roll like a slot machine with a red glitch ($000,0?? to
   $100,000). Small details: a cursor clicks, a field fills, a stamp lands.
4. **Real UI, in miniature.** A real sign-up form ("Create account"), a Stripe checkout ("Pro plan $19/month"), a court
   judgment ("LG Munchen I"), an analytics chart ("12,408"). Each with a small mono label ("// signup"). Never a
   generic box.
5. **Text as he speaks.** Each word appears as it is said; the next word shows faintly just before. One key word per
   line in a red serif italic.
6. **Colour as mood, never a cut.** Off-white, black, one red-orange. The whole background floods orange for the danger
   section and black for the twist ("The word is per.").
7. **A running tally.** Top right, "LIABILITY $0" climbs with every item ($53,000, $111,118, $261,118). It keeps people
   watching to see the total.
8. **Sound everywhere.** About 2.4 sharp hits a second (ours: 0.7). Every word-level event ticks, whooshes or clicks.
9. **Script:** a list of everyday things, each with a real law and a real number, the numbers escalating; a twist
   line; then "send this video's link to Claude", and a follow joke.

## Where our first render went wrong

- A slideshow: every scene cut to a new layout, a lot of empty paper, nothing moving between beats.
- Ava small in a corner with two faces, doing nothing. His character carries the video.
- Generic outlined boxes in place of real-looking UI (the pricing cards had no plans or prices).
- Section tags and a "2 things" badge that showed the structure.
- A third of his sound density.

## Our version: same craft, our look

Ava in his character's place: big at the bottom centre, a pose for every line (her floating arms and LED eyes make
poses easy), eyes that pulse as Christopher speaks. One take: a stage in the middle where the next object pushes the
last one out. Real UI miniatures. Gold on paper, with whole-background floods for mood. A running tally when the
story counts something. A sound on every event.

## Next in the queue: the "sued" reel (DdyqycEINNe), for our own version

His line order, for structure only (every claim gets checked against a primary source before we use it, and the
wording is ours): an age gate (COPPA, about $53,000 per child), Google Fonts loaded from Google's servers (a Munich court,
EUR 100 to one visitor), session replay on by default (California wiretap law, $5,000 per session), a launch email with
no unsubscribe or postal address (CAN-SPAM, about $53,000 per email), Stripe checkout without renewal terms by the
button (California auto-renewal law), no $6 DMCA agent (up to $150,000 per image). Twist: "the word is per". Then:
"send this video's link to Claude and ask it to fix everything". A running "LIABILITY $" tally climbs top right.

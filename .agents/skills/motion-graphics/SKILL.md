---
name: motion-graphics
description: Comprehensive motion graphics toolkit with 81 ready-to-use Remotion templates and animation primitives across charts, kinetic type, UI mocks, cinematic effects, transitions, logo reveals, and social video overlays.
---

# Motion Graphics & Visual Effects Toolkit

This skill provides a structured directory of **81 programmatic motion graphics templates** (pure Remotion / React components using `useCurrentFrame`, `interpolate`, `spring`, `useVideoConfig`) pulled from the React Video Editor Remotion repository.

Locations in workspace:
- **Source Repository:** `remotion-templates/templates/`
- **Vishnu Studio Kit:** `vishnu-studio/remotion/src/kit/templates/`

---

## Directing Rules for Motion Graphics

1. **The 3-Second Rule:** Never let more than ~3 seconds pass without visual change (a graphic, zoom, chip, card, or b-roll).
2. **First Two Seconds Hook:** In the first 5 seconds, no shot or graphic holds static for longer than `1.5s`. The first visual shift occurs within `1.0s`.
3. **Restraint & Meaning:** At most 1 or 2 complex motion graphics per reel (e.g. one comparison chart, one notification stack, or one glass graph). Too many simultaneous effects make the video look noisy or "AI-generated".
4. **Snapping to Audio:** Every animation entrance must hit precisely on the spoken keyword or downbeat. Pair with subtle sound effects from `assets/sfx/` (`pop`, `whoosh`, `subdrop`, `ding`).

---

## Catalog of 81 Motion Graphics Templates

### 1. Charts & Data (9 Templates)
For metrics, ARR, benchmarks, traction, before-and-after results, and quantitative proof.

| Component | File | Key Props / Behavior | Best Used For |
|---|---|---|---|
| **Bar Chart** | `chart-animation.tsx` | Staggered bar growth, dynamic labels & heights | Metric breakdown, monthly comparisons |
| **Line Chart** | `line-chart.tsx` | SVG polyline drawing left-to-right with data points | Trends over time, growth curves |
| **Pie Chart** | `pie-chart.tsx` | Segmented circular reveals with percentages | Market share, resource distribution |
| **Donut Chart** | `donut-chart.tsx` | Ring chart with animated segments & centre metric | Highlighting one core stat against a whole |
| **Area Chart** | `area-chart.tsx` | Gradient-filled area under curve | Revenue, cumulative metrics |
| **Progress Bars** | `progress-bars.tsx` | Horizontal bars filling to varying percentages | Feature completion, multi-stat comparisons |
| **Stat Counter** | `stat-counter.tsx` | Large number counting up with comma formatting | Big number hooks (\$100k+, 10M views) |
| **Comparison Chart** | `comparison-chart.tsx` | Side-by-side metric comparison (Old vs. New) | Before vs. After, Competitor vs. Us |
| **Circular Progress** | `circular-progress.tsx` | Animated circular progress ring with percent text | Loading meters, single KPI achievements |

### 2. Kinetic Text & Typography (9 Templates)
For punchy titles, spoken hooks, emphasis words, and animated callouts.

| Component | File | Key Props / Behavior | Best Used For |
|---|---|---|---|
| **Animated Text** | `animated-text.tsx` | Character-by-character staggered reveal | Bold title introductions |
| **Bounce Text** | `bounce-text.tsx` | Elastic spring bounce entrance | Energetic hooks, surprising statements |
| **Bubble Pop Text** | `bubble-pop-text.tsx` | Characters pop in inside pill bubbles | Playful, informal captions and titles |
| **Floating Text Chip** | `floating-bubble-text.tsx` | Sine-wave floating wobble badge | Sticky callouts, tags, UI labels |
| **Glitch Text** | `glitch-text.tsx` | RGB split chromatic aberration glitch | Cyberpunk, security, technical alerts |
| **Popping Scale Text** | `popping-text.tsx` | Spring-based scale overshoot pop | Impact nouns, dramatic revelations |
| **Pulsing Text** | `pulsing-text.tsx` | Continuous rhythmic scale pulse | Crucial reminders, ongoing alerts |
| **Slide Text** | `slide-text.tsx` | Smooth directional directional slide-in | Clean editorial headlines |
| **Typewriter Subtitle** | `typewriter-subtitle.tsx` | Monospace character typing with blinking cursor | Code demos, terminal outputs, raw quotes |

### 3. Content Animation & UI Mocks (9 Templates)
For step-by-step explanations, product walkthroughs, and UI cards.

| Component | File | Key Props / Behavior | Best Used For |
|---|---|---|---|
| **Animated List** | `animated-list.tsx` | Staggered card entrance with icons & checkmarks | "3 reasons why", feature lists |
| **Card Flip** | `card-flip.tsx` | 3D Y-axis flip revealing backside | Problem / Solution reveals, flashcards |
| **Countdown Timer** | `countdown-timer.tsx` | 5-4-3-2-1-GO spring sequence | Urgency triggers, deadline demos |
| **Notification Pop** | `notification-pop.tsx` | Stacking iOS/macOS notification toasts | Inflow of leads, alerts, messages |
| **Particle Explosion** | `particle-explosion.tsx` | Radial burst of colored confetti/particles | Milestone celebrations, eureka moments |
| **Progress Steps** | `progress-steps.tsx` | Step indicators (1, 2, 3) filling sequentially | Multi-step frameworks, roadmap stages |
| **Rotating Carousel** | `rotating-carousel.tsx` | 3D carousel revolving cards | Portfolio highlights, feature showcases |
| **Sound Wave** | `sound-wave.tsx` | Audio waveform frequency bars | Podcast clips, AI voiceover moments |
| **Text Highlight** | `text-highlight.tsx` | Highlighter marker swipe across key phrases | Quote emphasis, document audits |

### 4. Ambient Backgrounds (9 Templates)
For rich visual depth without distracting from foreground content.

| Component | File | Style / Aesthetic |
|---|---|---|
| **Bokeh Circles** | `bokeh-circles.tsx` | Floating soft out-of-focus luminous orbs |
| **Geometric Patterns** | `geometric-patterns.tsx` | Rotating, interlocking geometric shapes |
| **Gradient Shift** | `gradient-shift.tsx` | Smooth shifting ambient color wash |
| **Grid Pulse** | `grid-pulse.tsx` | Tech dot-matrix grid with expanding ripple waves |
| **Liquid Wave** | `liquid-wave.tsx` | Flowing layered organic SVG waves |
| **Matrix Rain** | `matrix-rain.tsx` | Vertical falling code rain columns |
| **Noise Grain** | `noise-grain.tsx` | Subtle 35mm film grain texture layer |
| **Pixel Transition** | `pixel-transition.tsx` | Retro 8-bit mosaic pixelation backdrop |
| **Starfield** | `starfield.tsx` | Warp-speed 3D forward star flight |

### 5. Cinematic Camera & Lens Effects (9 Templates)
For emotional weight, dramatic emphasis, and organic camera presence.

| Component | File | Effect Description |
|---|---|---|
| **Camera Shake** | `camera-shake.tsx` | Decaying trauma/shake on impact moments |
| **Film Burn** | `film-burn.tsx` | Warm analog light leak and flare overlay |
| **Ken Burns** | `ken-burns.tsx` | Slow cinematic pan-and-zoom over photos |
| **Letterbox Reveal** | `letterbox-reveal.tsx` | Widescreen cinema bars opening/closing |
| **Parallax Pan** | `parallax-pan.tsx` | Multi-depth layer pan with relative velocity |
| **Spotlight Reveal** | `spotlight-reveal.tsx` | Expanding circular mask focusing on a detail |
| **Vignette Pulse** | `vignette-pulse.tsx` | Darkened edge breathing for tension |
| **Whip Pan** | `whip-pan.tsx` | Rapid directional swipe with motion blur |
| **Zoom Pulse** | `zoom-pulse.tsx` | Rhythmic bass-matched micro zoom pulse |

### 6. Transitions & Scene Cuts (9 Templates)
For seamless beat shifts between ideas and scenes.

| Component | File | Style |
|---|---|---|
| **Blinds Transition** | `blinds-transition.tsx` | Venetian blinds slat rotation |
| **Clock Wipe** | `clock-wipe.tsx` | Radial clock-hand 360-degree sweep |
| **Cross Dissolve** | `cross-dissolve.tsx` | Standard smooth opacity blend |
| **Fade Through Black** | `fade-through-black.tsx` | Dip-to-black for time passing |
| **Iris Transition** | `iris-transition.tsx` | Circular iris expand / contract |
| **Morph Transition** | `morph-transition.tsx` | Scale-and-fade shape morphing |
| **Push Transition** | `push-transition.tsx` | Entering frame pushes exiting frame |
| **Slide Wipe** | `slide-wipe.tsx` | Snappy spring-driven panel slide |
| **Zoom Through** | `zoom-through.tsx` | Rapid push into a detail emerging into next scene |

### 7. Logo & Branding Reveals (9 Templates)
For intros, brand showcases, client watermarks, and outro cards.

| Component | File | Reveal Style |
|---|---|---|
| **Logo Blur Reveal** | `logo-blur-reveal.tsx` | Defocus blur resolving into crisp focus |
| **Logo Bounce Drop** | `logo-bounce-drop.tsx` | Gravity drop with rubbery ground bounce |
| **Logo Fade Reveal** | `logo-fade-reveal.tsx` | Subtle cinematic scale-up fade |
| **Logo Glitch Reveal** | `logo-glitch-reveal.tsx` | RGB displacement channel glitch |
| **Logo Scale Rotate** | `logo-scale-rotate.tsx` | 360 spin zooming from centre |
| **Logo Spin Reveal** | `logo-spin-reveal.tsx` | 3D coin flip spin reveal |
| **Logo Split Reveal** | `logo-split-reveal.tsx` | Split halves sliding together |
| **Logo Stroke Draw** | `logo-stroke-draw.tsx` | Animated SVG line stroke outline drawing |
| **Logo Typewriter** | `logo-typewriter.tsx` | Monogram icon pop followed by typed brand name |

### 8. Intros, Outros & Social Overlays (9 Templates)
For structured chapters, lower thirds, and call-to-actions.

| Component | File | Application |
|---|---|---|
| **Chapter Title** | `chapter-title.tsx` | Chapter number with extending border rules |
| **Cinematic Title Intro**| `cinematic-title-intro.tsx` | High-production opening hero title |
| **Countdown Intro** | `countdown-intro.tsx` | 3-2-1 ring countdown before action starts |
| **Credits Roll** | `credits-roll.tsx` | Film-style vertical scrolling credits |
| **End Card** | `end-card.tsx` | YouTube/Shorts outro with video placeholders & subscribe |
| **Lower Third** | `lower-third.tsx` | Speaker name, title, and social handle tag |
| **Quote Card** | `quote-card.tsx` | Quotation badge with author attribution |
| **Subscribe Reminder** | `subscribe-reminder.tsx` | Floating bell + follow pill animation |
| **Title Split** | `title-split.tsx` | Two-halves typography colliding at center |

### 9. Image & Media Showcases (9 Templates)
For displaying mockups, b-roll footage, case study screenshots, and testimonials.

| Component | File | Layout Description |
|---|---|---|
| **Gallery Grid** | `gallery-grid.tsx` | Staggered 2x3 image tile reveal |
| **Image Carousel** | `image-carousel.tsx` | Horizontal smooth card slider with centre focus |
| **Image Comparison Slider** | `image-comparison-slider.tsx` | Interactive split before/after wipe divider |
| **Image Zoom Reveal** | `image-zoom-reveal.tsx` | Zoom-out focus pull from macro detail |
| **Masonry Gallery** | `masonry-gallery.tsx` | Pinterest-style staggered masonry layout |
| **Photo Stack** | `photo-stack.tsx` | Casual tilted photo pile being dealt out |
| **Picture in Picture** | `picture-in-picture.tsx` | Corner inset floating screen over footage |
| **Polaroid Frame** | `polaroid-frame.tsx` | Polaroid frame dropping in with pin |
| **Split Screen** | `split-screen.tsx` | Dual vertical/horizontal comparative panels |

---

## How to Import & Use in Remotion Compositions

All templates are self-contained React components using Remotion hooks (`useCurrentFrame`, `interpolate`, `spring`, `useVideoConfig`).

### Example: Using in Vishnu Studio (`vishnu-studio/remotion/`)
```tsx
import { AbsoluteFill, Composition } from "remotion";
import ChartAnimation from "../kit/templates/chart-animation";
import NotificationPop from "../kit/templates/notification-pop";
import CameraShake from "../kit/templates/camera-shake";

export const MyScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background layer */}
      <NotificationPop />

      {/* Foreground graph */}
      <ChartAnimation />
    </AbsoluteFill>
  );
};
```

### Example: Mounting into a Scene Sequence
```tsx
import { Sequence } from "remotion";
import StatCounter from "../kit/templates/stat-counter";
import LowerThird from "../kit/templates/lower-third";

export const VideoSequence = () => (
  <>
    <Sequence from={0} durationInFrames={90}>
      <StatCounter />
    </Sequence>
    <Sequence from={60} durationInFrames={120}>
      <LowerThird />
    </Sequence>
  </>
);
```

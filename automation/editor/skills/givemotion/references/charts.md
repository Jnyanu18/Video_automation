# Charts and numbers

Purpose: live line charts (`gm.chart.line`) a camera can follow, the chart blocks, and counters. For the story structure of a data video, also read `references/genres/data-story.md`.

Contents
- Live line chart
- Axis, grid and ticks
- Pinned callouts and live text
- Chart JS API
- Styling and the chart's DOM
- Layout advice
- Blocks and counters

## Live line chart

`gm.chart.line` draws a data line over time. Its head is a real element (`chart.head`) a camera can follow, and anything inside the chart can be pinned to a data point or ride the head. Don't hand-write chart math in `onFrame`.

```html
<div id="world" style="position:absolute;left:0;top:0;width:4000px;height:1300px">
  <div id="growth" style="position:absolute;left:100px;top:140px;width:3700px;height:1060px;--chart-line:#38e1c7">
    <div class="rider" data-point="head right 36"><span data-chart-text="label"></span> <b data-chart-text="value"></b></div>
    <div class="callout" data-point="Mar top-left 60">Outage</div>   <!-- appears when the line reaches Mar -->
    <div class="callout" data-point="Aug top-left 40">Viral video</div>
  </div>
</div>
<script>
const chart = gm.chart.line('#growth', {
  values: gm.data.values, labels: gm.data.months,   // arrays or comma strings
  delay: 0.6, duration: 9.4,                         // drawing time (holds included), spread over any number of points
  holds: { Mar: 1.3, Aug: 1.3 },                     // pause there; points are an index (0 = first), a label, 'last' or 'max'
  colors: { Mar: '#ff4d6d', Aug: '#ffcf3f' },        // the segment into Mar is red, and the head while it is on it
  rescale: true,                                     // the y axis grows with the highest value so far: an early dip stays visible
  axis: 'head 460',                                  // tick labels 460 px right of the head ('left' default, 'right', 'none')
  overview: true,                                    // when the line is done, the chart narrows to the frame width
});
const mar = chart.timeOf('Mar'), end = chart.timeOf('last');   // when the line gets there (seconds in the chart's clip)
gm.camera('#world')
  .shot(0, { follow: chart.head, zoom: 1.1, offset: [260, 0] })       // head left of center, room ahead
  .shot(mar - 0.4, { follow: chart.head, zoom: 1.35, duration: 0.6 })  // push in on the dip
  .shot(mar + 1.2, { follow: chart.head, zoom: 1.1, offset: [260, 0], duration: 0.8 })
  .shot(end + 0.2, { fit: '#growth', duration: 1.4 })                  // the whole year, labels still full size
  .shake(mar, { amount: 12 });
</script>
```

## Several lines (solar vs wind vs coal)

`gm.chart.line('#c', { labels: [2015, 2016, 2017, 2018, 2019, 2020], duration: 6, series: [{ name: 'Solar', values: [300, 220, 160, 110, 70, 50], color: '#e8a10c' }, { name: 'Wind', values: […], color: '#2b7bb9' }, { name: 'Coal', values: […] }] })`: one scale for all lines (min/max over every series), the axis and x labels drawn once, each line named at its end in its color (names that end close together are pushed apart), all drawing together with the same `stops`/`holds`. The chart returned is the first series (its head, `data-point` callouts and the camera's `follow`); the others are in `chart.series`. No area fill unless `area: true`.

Points are named by index (`2` = the third), `'last'`, `'max'`, or a label. Year labels are labels: `'2020'` (a string, in `stops`, `holds` or `data-point="2020 top 30"`) is the year 2020, not the index 2020.

## Axis, grid and ticks

A fixed scale with a labelled grid that draws itself on, no CSS hacks needed:

```js
gm.chart.line('#growth', {
  values: gm.data.users, labels: gm.data.months,
  min: 0, max: 50000,                       // fixed y range (default: 0 or the lowest value, to the highest + 12%)
  ticks: 10000,                             // a label and grid line every 10,000 from the bottom: 0, 10k ... 50k
  // ticks: [0, 25000, 50000]               //   or exactly these values
  tickFormat: v => v / 1000 + 'k',          // label text; 'compact' (10k, 1.5M; the default) or 'full' (same as the value: 12,500)
  axisLine: true,                           // also draw the vertical axis line
  axisIntro: 0.8,                           // base line, axis and grid draw on from the origin in 0.8 s, labels fade in
  delay: 1.2,                               // start the line after the axes are drawn
});
```

- `axis`: where the tick labels go: `'left'` (default), `'right'`, `'head 460'` (they ride 460 px right of the head) or `'none'`. `axis: 'none'` draws nothing of the axis: no labels, no grid lines, no base line.
- `grid: false` hides the horizontal grid lines and keeps the labels; `grid: true` with `axis: 'none'` gives grid lines without labels. `base: false` hides the base line (the bottom of the axis).
- With `ticks` the bottom value is labelled too (`0`); the automatic ticks leave it out.
- `axisIntro: { duration: 0.8, at: 0.2, ease: 'out-cubic' }`: `at` is when it starts, in seconds from the chart's start (default 0). The base line draws first, then each grid line from the left, bottom to top; the x labels appear as the base line passes them. Give the line a `delay` longer than the intro.
- With `rescale: true`, grid lines fade in and out as the axis grows, `ticks` included.

## Pinned callouts and live text

- `data-point="<point> <side> <gap>"` pins any element inside the chart to a point, or to `head` (it rides the tip). Sides: `top` `bottom` `left` `right` `center`, and the corners `top-left` … `bottom-right` (diagonally away from the point); the gap is px from the dot. A pinned callout enters (`pop` unless it has its own `data-enter`) when the line reaches its point; its `data-enter` delay counts from that moment.
- `data-chart-text="value"` shows the value at the head, `"label"` the current label, `"change"` the change from the previous point (`+42%`). Outside the chart: `data-chart-text="#growth value"`. Drive every number from the chart so a counter never disagrees with the line (judges caught "MAR 2,217" shown after the line left March).
- The number's format is set by chart options (in `gm.chart.line('#growth', { … })`, not on the element): `format: v => Math.round(v).toLocaleString('en-US')`, or `prefix: '$'`, `suffix: ' users'`, `decimals: 0`. The default is the value with thousands commas and as many decimals as the data has.

## Chart JS API

- `chart.valueAt(t)`, `chart.progress(t)` (fractional point index), `chart.timeOf(point)` (when the line gets there: plan camera shots, bursts and tweens from it), `chart.pointAt(point)` (`{x, y, value, label, time}` in the chart's own px), `chart.dots[i]`, `chart.head`.
- `chart.headAt(t)`: where the tip is at time `t` (seconds in the chart's clip), on the smooth curve the line draws: `{x, y, value, progress, label}` in the chart's px. `chart.headAt(t, '#world')` gives x, y in the px of that element (camera world px, camera moves not counted). `chart.toPx(point, value, t)` places any value, e.g. a target line at 40,000.
- Points are a 0-based index, `-1` for the last, `'first'`, `'last'`, `'max'`, `'min'` or a label (`'Mar'`).
- Timing by hand like a path travel: `stops: [[0.5, 0], [3, 'Mar'], [4.2, 'Mar'], [9, 'last']]`; `ease` (default `in-out-sine`) shapes each run between holds.
- A camera that follows the tip but stays inside the chart: move a small proxy element from `headAt` and follow it.

```js
const cam = document.querySelector('#cam');   // <div id="cam" style="position:absolute;width:2px;height:2px"> in #world
gm.onFrame((t) => {
  const h = chart.headAt(t, '#world');
  cam.style.left = gm.clamp(h.x + 230, 700, 1400) + 'px';   // tip left of center, never past the chart's ends
  cam.style.top = gm.clamp(h.y, 450, 700) + 'px';
});
gm.camera('#world').shot(2.5, { follow: '#cam', zoom: 1.6, duration: 0.5 });
```

- Other options: `dots: false`, `area: false`, `head: false`, `smooth: false`, `color` (sets `--chart-line`), `headSize: 14` (px at 1080p), `padding: [top, right, bottom, left]` (room for the tick and x labels).
- `check` codes: `chart-no-element`, `chart-no-values` (fewer than 2 numbers), `chart-no-size` (the element has no width/height), `chart-bad-point` (a point name is not an index, label, `last` or `max`), `chart-bad-option` (`ticks` or `tickFormat` not understood).

## Styling and the chart's DOM

The chart adds these inside its element (style them with CSS; the page's CSS wins over the defaults):

| class | what it is |
|---|---|
| `.gm-chart` | the chart element itself |
| `svg.gm-chart-svg` | the drawing, holding the lines below |
| `.gm-chart-grid line` | horizontal grid lines (`stroke`, `stroke-opacity`, `stroke-width`) |
| `.gm-chart-base` | the base line along the bottom |
| `.gm-chart-axis` | the vertical axis line (only with `axisLine: true`) |
| `.gm-chart-area` | the fill under the line (a gradient of `--chart-line`; dim it with `opacity`) |
| `.gm-chart-line` | the line (`stroke-width: 6px` for a thinner one) |
| `.gm-chart-seg` | a colored segment from `colors` |
| `.gm-chart-ticks > .gm-chart-tick` | the y labels |
| `.gm-chart-label` | the x labels (`[data-reached]` once the line passed it) |
| `.gm-chart-dot` | the dot on each point (`[data-i="2"]`, `[data-reached]`) |
| `.gm-chart-head` | the glowing dot at the tip |

- Colors: `--chart-line` (line, area, dots, head) can be set anywhere above the chart (`:root`, the scene) or on it. `var(--chart-color)` is the color of the segment the head is on (use it on a rider). `--chart-bg` fills the hollow dots.
- Resize the head or the dots with CSS `width`/`height` (or `headSize`): they stay centered on the line. To animate their size, use `transform: scale(…)`, not width/height (the size is measured once).
- Don't hide parts with `display: none` on internal elements: use `axis: 'none'`, `grid: false`, `base: false`, `dots: false`, `head: false`, `area: false`.

## Layout advice

- Make the chart 2-3 frames wide inside a camera world so the camera can follow at zoom ~1.1, put the rider on one side of the head (`right`) and the callouts on the other (`top-left`), and keep callouts off the line.
- A small dip on a linear axis that ends at a big number is invisible: use `rescale: true`, or push the camera in on it.
- Axis labels and units are secondary text: ≥ 32 px on screen. In the final overview, check they are still readable (`fit: '#growth'` with `overview: true` on the chart keeps labels full size); a fit-all of a very wide chart squashes it into a thin strip with tiny labels.
- Callouts near the bottom edge get cut while the camera moves: place them above the line, or give the shot more `padding`.
- One highlight color per event (red for a drop, gold for a jump), the same color on the segment, the callout and a burst at that moment.

## Blocks and counters

- Without a camera, use the `line-chart` block: the same options as attributes (`holds="Mar:1.2"`, `colors="Mar:#ff4d6d"`, `rescale="true"`, `axis`, `ticks="10000"`, `grid="false"`, `axisintro="0.8"`, `dots`, `endlabel`, `overview`, callouts as inner HTML with `data-point`); `gm.chart.get('#id')` gives its chart (follow it with `follow: '#growth .gm-chart-head'`).
- `bar-chart` block: `values`, `labels`, `title`, `prefix`, `suffix`, `max`, `color`, `highlight` (index), `height`. `direction="horizontal"` makes rows that grow to the right with the value riding each bar's end (comparisons: solar vs wind vs coal); `colors` gives one color per bar. Bars grow one after another and count up. For a bar race or custom bars, use SVG/HTML bars with `grow-y` or a timeline `fromTo` of `scaleY` with `stagger`.
- `stat` block: one big number that counts up with a label and a `delta` badge.
- Counters anywhere: `data-count="0 1250"` (`data-count-duration`, `-delay`, `-prefix`, `-suffix`, `-decimals`, `-ease`, `-group="false"`), or a timeline `textContent` tween. Data comes from `gm.data` / `{{data.values}}` (`references/data-templates.md`); an array becomes a comma list, which is what the chart blocks take.

# Isometric 3D

Flat 3D blocks at a fixed angle, like a tiny diorama.

Reference tiles: `iso` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Ground `#E8F0FF`, blue `#5B6CFF` (sides `#3b48c4`, `#2c379c`), orange `#FF8A5B` (sides `#c8603a`, `#a24a2b`), green `#3DDC97` (side `#24a46c`), text `#1b2150`.
- **Type:** Outfit 700.
- **Shapes and texture:** Columns drawn as three SVG polygons (top, left, right, each a shade darker), or a flat card tilted with `rotateX(55deg) rotateZ(-45deg)` and a stepped `depth()` shadow. UI cards get a short stepped shadow so they read as slabs.
- **Motion:** Blocks rise from the floor; columns grow to their value.
- **Use for:** Growth charts, "how it fits together" diagrams, product pieces stacking up.
- **Avoid:** Real perspective (it must stay isometric); text on the tilted faces. A box-shadow on a tilted card does not make a column: draw columns as polygons.

# Bento grid

A dark grid of rounded boxes of different sizes, each holding one thing.

Reference tiles: `bento` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Ground `#0E0E10`, boxes `#1C1C1F` and `#2C2C30`, accents lime `#D4FF3A` and orange `#FF6B35`, text white, muted `#77777f`.
- **Type:** Outfit 700 for numbers and headlines, Outfit 400 for labels.
- **Shapes and texture:** CSS grid, gap 14px, radius 26px, one idea per box, one box much bigger than the rest. Labels small at the top of a box, the value big at the bottom.
- **Motion:** Boxes arrive one by one with a short scale-up (0.94 to 1), staggered 3 to 4 frames.
- **Use for:** Numbers side by side (day, sign-ups, goal), feature lists, an "everything at a glance" end card.
- **Avoid:** More than six boxes; two accents in neighbouring boxes.

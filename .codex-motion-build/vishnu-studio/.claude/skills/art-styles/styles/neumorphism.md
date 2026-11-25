# Neumorphism

Shapes pushed out of, or pressed into, one flat grey surface.

Reference tiles: `neumorphism` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Everything on `#E0E5EC`, one accent blue `#5b7cfa`, text `#3b4664`, muted `#8a96b3`.
- **Type:** Nunito 800.
- **Shapes and texture:** Raised: `14px 14px 28px #a3b1c6, -14px -14px 28px #ffffff`. Pressed: the same as `inset`, smaller. Ground and shapes are the same colour; the shadows do all the work. Rings and dials suit it.
- **Motion:** Slow presses: a raised shape sinks to inset when it is "clicked"; a dial fills.
- **Use for:** One calm stat, a setting being switched, a progress ring.
- **Avoid:** Low contrast: keep text dark and large. Never on footage. Never more than one accent.

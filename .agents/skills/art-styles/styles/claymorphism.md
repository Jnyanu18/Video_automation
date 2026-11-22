# Claymorphism

Soft, puffy, toy-like 3D shapes that look pressed out of clay.

Reference tiles: `claymorphism` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Lilac ground `#E9DDFB`; fills pink `#FFD6E7`, mint `#BFF0D4`, butter `#FFF0B8`, sky `#C9E4FF`, peach `#FFD6A8`; text deep purple `#3d2766`.
- **Type:** Fredoka 600, big and round.
- **Shapes and texture:** Big radii (30 to 44px, pills at 999). Every shape gets the clay shadow: `inset -10px -12px 22px rgba(0,0,0,0.13), inset 10px 12px 22px rgba(255,255,255,0.75), 0 26px 40px rgba(90,60,140,0.25)`. A couple of clay blobs off the edges.
- **Motion:** Shapes squash and spring back (a spring with low damping); things land with a little bounce.
- **Use for:** Friendly explainers, product UI shown softly, stats as a single big tile.
- **Avoid:** Hard edges, thin type, dark grounds. Too many blobs turns it into a toy box.

# Pixel art / 8-bit

An NES-era game screen: sky blue, pixel clouds, bricks, a dialog box.

Reference tiles: `pixel` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Sky `#5C94FC`, brick `#C84C0C`, coin yellow `#FCE000`, green `#3DDC97`, black, white.
- **Type:** Press Start 2P (small: 22 to 44px, line height 1.5).
- **Shapes and texture:** Square pixel borders (the `px()` shadow), an RPG dialog box (black, white border, a pointer arrow), segment bars for progress, a hard 4px text shadow.
- **Motion:** Movement in whole steps with no easing (an 8 to 12 fps feel); a coin-blip sound on each beat.
- **Use for:** Progress ("world 1-1, day 24"), a yes / no choice, playful milestones.
- **Avoid:** Smooth gradients or soft shadows; text bigger than 44px.

# Retro terminal / CRT

A green-screen terminal: glowing monospace, scanlines, a dark vignette.

Reference tiles: `crt` in `remotion/src/lanes/styles/StyleSheet.tsx` (a headline, a chat and a stat). Build from them.

- **Colours:** Ground `#041a0a`, phosphor green `#39FF6A`.
- **Type:** VT323.
- **Shapes and texture:** Text glow `0 0 6px #39FF6A, 0 0 18px rgba(57,255,106,0.5)`, scanlines and vignette from `Scan`, reverse video (green block, dark text) for the key word, ASCII progress bars, a blinking `_` cursor.
- **Motion:** Typing character by character; the cursor blinks every 15 frames; a brief flicker on cuts.
- **Use for:** Showing what the agent does step by step, logs, numbers as a readout.
- **Avoid:** Any second colour; long paragraphs.

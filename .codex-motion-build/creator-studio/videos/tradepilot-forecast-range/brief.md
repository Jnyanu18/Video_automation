# Brief: This AI tool simulates the most likely paths for the next few candles

- **Funnel:** top (reach, one call to action)
- **Brand:** the TradePilot account (assumed from "post on this account", Vishnu 2026-11-04; confirm). Not Vishnu's personal channel.
- **Reference:** none. Vishnu's shape, 2026-11-04: "This AI tool uses XYZ to [show] what is most likely to happen in the next few candles,
  and get the link: ask TradePilot". 10 to 15 seconds.
- **Our twist:** one picture, no lesson: a price chart, the last candles real, then a fan of sixteen simulated paths (green high, blue
  middle, red low, TradePilot's own colours) growing out of the last candle, then the same chart's past stretches being replayed to check
  the model; the keyword TRADEPILOT at the end.
- **Facts and sources** (read 2026-11-04):
  - Code: trade-pilot backend/forecast/app.py and backend/src/services/copilot/tools/simulatePaths.ts. 16 sampled futures per
    simulation (the backend asks for PATHS = 16; the service allows 8 to 64), from the last 256 real bars, up to 60 candles ahead (20 by
    default), Kronos-mini (shiyu-coder/Kronos, MIT, a model trained on candlestick data), sampled at T=1.0, top_p=0.9. The track record
    replays the model on up to 6 past windows of the same chart (needs at least 4), 6 paths each, so 36 more samples and 52 in all per
    run, and reports how often it got the direction right and how often the real price landed inside its 10th to 90th percentile range.
    It answers "chances it reaches X" for up to 5 levels as the share of paths that reach them.
  - Brain: projects/tradepilot/decisions.md DEC-2026-001 (16 sampled paths, likely range, odds, track record in every reply; always a
    simulation, never a prediction; never "buy", "sell" or "make money"; "not trading advice") and current-state.md (since 2026-11-04).
  - Site: tradepilot.co.in.
- **Wording:** "simulates the most likely paths", never "predicts" or "will" (DEC-2026-001). No accuracy, win rate, return or edge claim.
  The model is Kronos, not Chronos. "Sixteen" is the forecast paths only; the 36 replay samples are "checks", not futures. No count of
  "combinations" is said: there is no real figure.
- **Compliance:** "This is a statistical simulation, not trading advice" in the caption and a small line on screen (not spoken: the cut
  is about 14 s).
- **Comment keyword TRADEPILOT:** the DM reply is the link to tradepilot.co.in (posts.md). No guide document.
- **Look:** the studio default (dark liquid glass) unless Vishnu names another; the quiet one-object style he approved for
  weight-space-programming suits one chart.
- **Music:** a library track.

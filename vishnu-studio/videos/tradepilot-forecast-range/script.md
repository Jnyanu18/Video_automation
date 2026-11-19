# This AI tool simulates the most likely paths for the next few candles

<!-- One paragraph per thought; each becomes one voice file. No em dashes, no "not X, not Y" chains. -->
<!-- Fifth version, 2026-11-04. Vishnu: after "checks itself on past stretches" add that, based on that accuracy, it gives the most likely
outcome, "a couple of lines more", and render directly. Accuracy of the claim: in the code (trade-pilot backend/forecast/app.py) the
track record is a replay of the model on up to 6 past windows of the same chart that reports how often it got the direction right and how
often the real price landed inside its 10th to 90th percentile range; it does NOT change the forecast, which is 16 sampled paths from the
real bars. So the script does not say the outcome is "based on" the accuracy; it says the accuracy shows how much to trust the most
likely outcome, which is what the code does and what DEC-2026-001 asks (the track record is stated with every simulation). 48 words,
about 16 s. "Simulate", never "predict" (DEC-2026-001). "Not financial advice" is in the caption and on screen. Keyword: TRADEPILOT. -->

This AI tool uses a model called Kronos to simulate sixteen futures for the next few candles.

Then it replays the chart's past and shows how often it got the direction right.

So you know how much to trust the most likely outcome.

Comment TRADEPILOT for the link.

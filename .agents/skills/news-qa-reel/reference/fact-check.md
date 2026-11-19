# Fact-check gate

Madhav: "fact-check me, keep me honest, remove things not aligning." The gate runs **after transcription and
before the spine**, and again whenever a script, chip or synthetic line changes.

## Method
1. List every checkable claim in the chosen spans (dates, numbers, who did what, "first ever", country rules,
   prices, product facts). Opinions and predictions are not checked but are labelled as his.
2. Check each against real sources (news outlets, official registers, the company's own post). Web search may be
   unavailable on some gateways: use a browser relay and record the URLs/outlets.
3. Status per claim: **true / false / unverified / opinion / outdated** (e.g. "next flight will catch both
   stages" became wrong framing once the flight slipped).
4. Treatment:
   - **false or unverified -> cut it from the spine**: drop or shorten that item's range in `clips.json`. Never
     rewrite his voice, never keep it "with a disclaimer".
   - **true but needs context -> an on-screen fact chip** in the world ("US tariff on Chinese EVs: 100%+",
     "Earth-to-Earth rocket travel is still a concept", "Next: Starship Flight 15, targeted for November 2026").
   - **his prediction or opinion -> a "Madhav's take" label** where natural.
5. **Record every cut** in CHECKPOINT.md: the quote, why, the source. Example: `examples/fact-check-log.md`.

## Rules
- Facts on screen = only what he says plus verified chips. No invented numbers; if a number would help but
  can't be verified, leave it out and say so.
- **No disclaimers** or safe-word lines ("this is not financial advice", "I don't speak for my employer"); he
  explicitly does not want them. Keep takes about his employer neutral and never show internal numbers.
- Synthetic lines (ElevenLabs) may say only verified facts, and each is Whisper-verified after generation.
- Hooks must be supported by the reel.
- Re-check time-sensitive facts on the day you deliver (news moves: a launch flies, a price changes).

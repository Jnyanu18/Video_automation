# Facts, simplifications and open checks

## Numbers on screen (checked)
- 2^50 = 1,125,899,906,842,624, about 1.13 quadrillion. Narration: "a quadrillion combinations". The screen rolls up the exact value.
- 2^300 is about 2.04 x 10^90. Estimates of atoms in the observable universe are about 10^78 to 10^82 (commonly about 10^80). So "more than the atoms in the universe" holds by roughly ten orders of magnitude. The screen shows only "300 QUBITS", not the exponent.
- A dilution refrigerator's mixing chamber runs at about 10-15 mK (about -273.14 °C). The cosmic microwave background, "outer space", is about 2.7 K (-270.45 °C). So "colder than outer space" holds by roughly 200x in kelvin. No number appears on screen.

## Simplifications (deliberate, flag if the presenter wants them softened)
- **"Tries every answer at once" is the myth.** The film says a measurement yields one outcome, random by the amplitudes. That is correct.
- **Coin analogy.** A qubit "is" a spinning coin, "a blend of heads and tails". Really a qubit state is α|0⟩ + β|1⟩ with complex amplitudes; a spinning coin is a classical, hidden-variable picture. This is a standard pop simplification. The film never says "both at once".
- **Maze and waves.** "Every possible answer is a wave" and "wrong answers cancel" is a picture of amplitude interference: well-designed algorithms arrange phases so that wrong outcomes interfere destructively. Two simplifications follow. (1) The maze makes it look as if the computer explores paths; really amplitudes over basis states interfere. (2) "Almost always get the right one" holds only for algorithms built for it (Grover, Shor, and similar), not for any problem you put in. The narration is approved; this note is for the record.
- **Entanglement.** "Link qubits together and they move as one" stands in for entanglement plus the 2^n state space. Entangled qubits don't literally move in lockstep, and the combination count comes from 2^n amplitudes, not from linking alone. The 2^n state-space claim is correct.
- **Uses.** "Won't make Instagram faster" is correct: there is no general speed-up for everyday apps. "Design new medicines" is an expected use (molecular simulation), not yet delivered at scale. "Crack codes" refers to Shor's algorithm against RSA/ECC on a large fault-tolerant machine, which does not exist yet. That is fine as "built to" phrasing, and the next video covers it.
- **Cold.** Only superconducting (and spin) qubit platforms need millikelvin dilution refrigerators. Trapped-ion and photonic machines don't, or not in the same way. "It only works colder than outer space" is true of the IBM/Google-style machine shown.

## Visual accuracy
- The chip follows superconducting processors: cross-shaped (Xmon-style) qubits on a 4x4 grid, couplers, meander readout resonators, wire bonds, and a gold-plated holder with SMP connectors. It is stylised and not a specific product.
- The chandelier has six gold plates narrowing to the mixing chamber, rods, coiled coax lines and the chip at the bottom, after IBM/Google cryostat photos. Plate count and proportions are stylised.
- The phone app is an original "Photogram" with an Instagram-like gradient story ring. No Instagram logo or wordmark is used. We avoided the real logo on purpose.
- The mice are an original design; no other studio's characters are used.

## Left out (unverified or unnecessary)
- No qubit counts of real machines, no company names, no dates.

## v2 additions (2026-10-13): new hook, ending, on-screen numbers
- **Willow benchmark (hook).** Google Quantum AI's Willow chip (announced Dec 2024, 105 qubits) ran a random-circuit-sampling benchmark in under five minutes; Google estimated about 10^25 years (10 septillion) for the Frontier supercomputer. It is a benchmark, not useful work; the film calls it what the chip "did" and the cover shows "5 MIN vs 10 septillion years". The screen names "Google Quantum AI" (Google's wordmark colours in Google Sans, editorial use) and "Willow chip". The drawn chip is a stylised 105-qubit square lattice in a gold sample holder, not a photo-accurate Willow.
- **10,000,000,000,000,000,000,000,000 years** = 10^25, shown exactly and frozen once its digits slot in (no rolling to fake digits).
- **"x 725 TRILLION" the age of the universe:** 10^25 / 1.38 x 10^10 = 7.25 x 10^14. Tape marks: 66 million years (dinosaurs' extinction), about 5 billion years (the Sun's remaining main-sequence life, after which it swells and dies), 13.8 billion years (age of the universe).
- **"2^300 > 10^80 atoms"** under 300 QUBITS: 2^300 is about 2.04 x 10^90; atoms in the observable universe about 10^78-10^82.
- **"NEXT: SHOR'S ALGORITHM"** (teaser): Shor's algorithm factors integers / solves discrete logs in polynomial time, which would break RSA and elliptic-curve encryption on a large fault-tolerant quantum computer that does not exist yet ("could break").
- **Ending line** "a machine that makes the wrong answers cancel themselves out" restates the interference simplification above (holds for algorithms designed for it).

## v5 (2026-10-20): fact-check of the presenter's real recording (audio/v5/vo-real.wav)
His words are kept as the audio. On-screen text and captions correct his slips; nothing he says is
re-recorded or altered.

| Time (s) | He says | Check | On screen |
|---|---|---|---|
| 0.0-8.0 | Google built a chip that solved a problem in 5 minutes that the world's fastest supercomputer would need 10 septillion years for | OK. Google Quantum AI, Willow (Dec 2024), random-circuit-sampling benchmark, < 5 min vs an estimated ~10^25 years on Frontier. A benchmark task, not useful work. | "5 MIN vs 10 SEPTILLION YEARS", odometer 10,000,000,000,000,000,000,000,000 (exact 10^25), footnote "Willow, Dec 2024 · benchmark task" |
| 8.0 | (10^25 years) | 10^25 / 1.38x10^10 = 7.25x10^14 | "× 725 TRILLION" (ages of the universe) |
| 10.5-13.0 | And in 60 seconds, you will actually understand it | His framing; the explanation runs longer (~100 s). No on-screen "60 s" claim; the stopwatch only re-arms. | - |
| 24.5-27.2 | It's when you do the operation when they're still spinning | Fair simplification: quantum gates act on qubits while they are in superposition (before measurement). | a hand nudges the spinning coin (a gate); caption verbatim |
| 43.4-45.7 | The wrong answer cancels each other out | Grammar only. | caption "The wrong answers cancel each other out" (meaning unchanged) |
| 51.8-71.6 | Pool: two waves of the same length combine into a bigger wave; that's the right answers; probability goes up | Constructive interference (in phase -> amplitudes add). The complementary half (wrong answers) is destructive interference (out of phase -> cancel); he implies it, the picture shows it. Probability = |amplitude|^2, so bigger amplitude -> higher probability of measuring that answer. Holds for algorithms designed to steer phases (Grover, Shor, etc.). | "in sync → bigger wave", "out of sync → cancel" (wrong answers), a probability bar rising for the right answer, no invented percentages |
| 75.1-77.0 | 50 qubits is like a quadrillion combinations | 2^50 = 1,125,899,906,842,624 ≈ 1.13 quadrillion ✓ | exact 2^50 rolls up |
| 77.9-80.9 | "300 more than would be like an atom in the universe" (garbled) | 2^300 ≈ 2.04x10^90 combinations; atoms in the observable universe ~10^78-10^82 (~10^80). | caption "300 qubits → more combinations than atoms in the universe."; on screen 300 QUBITS, 2^300 > 10^80 atoms |
| 81.4-83.0 | It won't make Instagram faster | Correct: no general speed-up for everyday apps. | caption verbatim |
| 83.1-85.6 | designing new medicine, cracking codes | Expected uses: molecular simulation (not yet delivered at scale); Shor's algorithm would break RSA/ECC on a large fault-tolerant machine that doesn't exist yet. | verbatim |
| 86.0-91.2 | any problem very hard to find the solution for, that's where quantum computers will come in | Overbroad if read literally: quantum speed-ups are known only for specific problem classes (simulation, factoring, some search/optimisation with modest gains). Kept as his framing; the picture shows named classes (molecules, routes, materials/batteries, codes). | labels only, no claim of solving all hard problems |
| 98.7-100.3 | Quantum computing could be the next AI wave | Opinion / forecast ("could"). Fine. | verbatim |
| 100.9-104.2 | AI is enabling those breakthroughs | Supportable: e.g. Google DeepMind's AlphaQubit (Nature, Nov 2024) is an AI decoder for quantum error correction; ML is also used for calibration and control. | small tag "e.g. AI-decoded error correction" |
| 105.2-108.7 | quantum computer would be the next thing you have to learn | Opinion. Fine. | verbatim |

Filler dropped from captions only (never from the audio): "Now," at sentence starts, "like" (where it
was filler), "a" in "runs on a billions" / "need a 10 septillion", "basically", "the" in "the interference",
"which are" in "any problem which are very hard".

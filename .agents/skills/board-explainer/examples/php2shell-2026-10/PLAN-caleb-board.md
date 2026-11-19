# Decode PHP2Shell, "Caleb board" version: plan for approval (2026-10-23)

Reference: Caleb Writes Code, "PHP security crisis explained.." (`analysis/ref-6VmA4x1lh1M/ANALYSIS.md`).
Same visual grammar (black iPad board, one diagram that grows, coloured marker strokes drawn at speech pace,
red stamp arrows, cut-aways to real artefacts), with original drawings and Madhav's script.

**F** = Madhav's real face + real voice (DJI take 0162, mic WAV), shown as a matted cut-out beside the board while the
drawing continues (the hook is full-frame). **V** = ElevenLabs Madhav Voice over the board (eleven_v4, stability 0.33,
similarity 1.0, **clone_strength 0.75**, via REST so clone strength actually applies). No HeyGen.

| # | Who | Take time / text | Board (drawn on as it's said) |
|---|---|---|---|
| 1 | F full-frame | 0:00.0–0:05.3 "PHP just had a bug that could let a total stranger run code on your server." | Title scribble "PHP2Shell" fades in at the end |
| 2 | F | 0:06.7–0:17.9 "PHP runs about 7 in 10 websites. On October 21st, it shipped an emergency fix. Two bugs, PHP2Shell, and I've spent like last 24 hours on just patching servers." | "7/10 sites" doodle, Oct 21 date, "2 bugs" |
| 3 | V | "PHP is the engine under WordPress, Drupal, Magento and Laravel. Both bugs are rated 9.2 out of 10, and Amazon's honeypots saw an attack attempt on October 17th, four days before the fix." | logos as hand-lettered names around a PHP logo, "9.2" in red, Oct 17 → Oct 21 mini timeline |
| 4 | F | 0:21.2–~0:29 "So how does it work? When you open a website, your browser sends a request. Think of it as a form. Your name, your email, and sometimes a file," | stick-figure user → "HTTP POST" arrow → cloud |
| 5 | F | 0:32.6–0:39.4 "Before the website's own code even wakes up, PHP tries to unpack that into the memory." | cloud → server tower + PHP logo → green RAM stick (blue "allocate" arrow) |
| 6 | V | "That form arrives as an HTTP POST. Before your code runs, PHP reads every field and builds it in RAM, keeping a little bookkeeping: how many slots it reserved and how many it has filled." | form card (name/email/file) + yellow "bookkeeping: reserved / filled" |
| 7 | F | 0:39.7–0:46.4 "Now picture this. Picture memory as a row of lockers. Gray is free and teal is in use." | RAM zooms into a row of lockers, grey vs teal |
| 8 | F | 0:46.9–0:59.6 shaadi album, 400 photos, 4K, "har mama-mami ka photo" | album doodle, "400 photos · 4K" |
| 9 | F | 1:00.4–1:19.3 "PHP needs 12 lockers … only memory for 10 … memory runs out halfway … 'sab ho gaya' … slide everything under the bed." | 10 lockers fill, 2 dashed ones; red "OUT OF MEMORY"; bed + junk doodle |
| 10 | F | 1:32.5–1:40.6 "Lockers 11 and 12 are never filled. So they are just leftover junk. And PHP uses that junk as real data, right." | red stamp arrow on lockers 11–12, "junk → used as real" |
| 11 | V | "Technically: PHP hits its memory limit while it's still building your form. The cleanup that runs next assumes the half-built data is complete, so it uses slots that were never set up. And the attacker gets to shape what sits in that junk." | "OOM" + "cleanup assumes done" annotations, red attacker figure |
| 12 | V | Bug 2 (not in the take): "Bug two is a use-after-free. When a request finishes, PHP frees its locker for the next one. But some leftover state still points at it, like an old sticky note with a locker number. The next request on the same PHP worker moves into that locker, and PHP follows the old note straight to the attacker's data." | second locker row; yellow sticky note "→ 7"; red request moves in; arrow follows the note |
| 13 | V | "Chain the two, and someone with no login can steer PHP into running their commands. A command line on your server. That's the 'shell' in PHP2Shell." | `stranger@your-server:~$` drawn in a terminal box |
| 14 | F | 2:29.6–2:42.0 "if you really use this exploit, you can basically open up a Pandora box where people can connect to your servers… So it's very big. It's very serious." | box doodle opening, red |
| 15 | F | 2:42.5–2:46.7 "That's why we had to like wake up in the middle of the night and fix this at all cost." | moon + coffee doodle |
| 16 | F | 2:46.9–2:54.0 "Now the good news: the public exploits so far don't work on default setup. They usually need a second bug in your app." | green ✓ "default setup" |
| 17 | V | "But the flaw itself is in every unpatched PHP since version 5.4, back in 2012. So don't wait for a better exploit to show up." | 2012 → 2026 line, "update anyway" |
| 18 | F | 3:08.1–3:10.6 "So here's what you need to do. Update your PHP immediately." | checklist header |
| 19 | F | 3:15.4–3:23.0 "They were supposed to release on 22nd, but they released it on 21st… upgrade the version of PHP, restart your Apache, restart your PHP, and you're good to go." | ① update ② restart ticks |
| 20 | V | "Check with php dash v. The fixed versions are 8.5.12, 8.4.27, 8.3.36 and 8.2.35. On 8.1 or older there's no official release, so upgrade or use your distro's patched package." | terminal `php -v`, version chips in green |
| 21 | F | 4:28.0–4:35.7 "…if you can't update the PHP, set the memory limit to minus one, that is one of the vendor's solutions." | stopgap note in yellow |
| 22 | V | "The other stopgap is turning off session upload progress. Both are partial. Updating is the real fix." | "partial!" in red; "UPDATE = real fix" in green |
| 23 | V | Analysis (Caleb-style closer): "One more thing. The researchers behind these finds say they used AI models to hunt for them. Expect bugs to be found faster, and patch windows to get shorter." | AI robot doodle → bug icons; shrinking calendar |
| 24 | F | 4:18.3–4:21.0 "There is nothing left in my eyes right now." | sleepy-eyes doodle |
| 25 | V | "Patch first. Panic never. Save this for your next deploy." | end board + CVE IDs + sources |

Estimated length ≈ 4 min (his face ≈ 2:05, VO ≈ 1:55).

## Lines from the take left out (and why)
- 1:40–2:28 and 3:23–4:12, the "overflow" explanation ("the last 2 MB goes above the memory… becomes real data… open a
  port"): not how this bug works (it's out-of-memory + half-built data, not an overflow). Covered correctly by V11.
- 4:06 "seven out of ten websites are vulnerable": 7 in 10 sites *run* PHP; not all are vulnerable or exploitable.
- 4:36–4:56 "limit the upload size to 8 or 16 million": not one of the vendor's listed mitigations.
- 2:54–3:08 "default setup is not a problem…": overstates the good news; V17 says it accurately.
- 4:13 "We worked 48 hours": conflicts with "last 24 hours" in line 2; kept the 24-hours line.

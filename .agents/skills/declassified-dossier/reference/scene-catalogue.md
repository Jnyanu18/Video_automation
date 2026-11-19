# Scene catalogue (source film, v6)

All scenes live in `src/world/scenes.tsx` (SVG, inside `Front`), the IG overlay in `src/world/ig.tsx`
(HTML), the caption in `src/world/world.tsx`. Cues are in `src/world/T.ts`; beat windows in `src/beats.ts`.
"Band" = top-band `Slot`, "column" = right-column `Slot` (`cx={755}`), "raw" = screen-space `Slot`.

| # | Component | Window (beats) | Band | Column | Marks on words |
|---|---|---|---|---|---|
| 1 | `Hook` | frame 0 -> `qwhy` (column -> `news`) | headline sheet: red strip "US NEWS · OCT 20", "The US just banned / a Chinese AI. / Was that fair?" | `WhalePhoto` (polaroid + clip) + "CHINESE AI" note | highlighter on "banned"; BANNED stamp on the photo; note fades in on "Chinese AI" |
| - | `IGQuestion` (ig.tsx) | `qwhy` -> `news`; `qthreat` -> `take` | anonymous IG DM card, exact question, key words recolour on their word | - | gold "DeepSeek"; cyan "security threat", gold "power struggle" |
| 2 | `News` | `news` -> `data` | dated news card: calendar page OCT 20 2026 (red pencil loop), typed "U.S. GOVERNMENT:", "Banning DeepSeek from the federal system" | "FEDERAL SYSTEM" monitor with the whale, "removed from use" | loop on "October"; typed on "government"; text on "banning"; highlighter + red text on "federal"; BANNED stamp on "banning" |
| 3 | `Data` | `data` -> `outside` (column -> `enigma`) | DeepSeek circle -> pencil arc with yellow data packets -> CHINA box, "SENSITIVE DATA / could be sent" | plain DHS shield badge, "THEIR WORRY: DATA -> CHINA" | typed "HOMELAND SECURITY SAYS:"; arc + packets on "sensitive"; CHINA on "China" |
| 4 | `Outside` | `outside` -> `enigma` | THEIR COUNTRY / BORDER (dashed red) / OUTSIDE; SENSITIVE DATA folder slides to the border | (DHS column held) | padlock pops on "outside"; STAYS HOME stamp on "country" |
| 5 | `Enigma` | `enigma` -> `restrict` | diorama: sky/earth, GERMANY bunker, FRONT LINE barbed wire, BRITISH bunker + roundel; WHAT IF? stamp | manila card: ENIGMA "WWII cipher machine" (rotors QXR, lampboard, keys), "ATTACK AT DAWN -> encrypted -> QXRTB ZM PLWVK" | WHAT IF? on "Enigma"; British on "British"; Germany on "fighting"; typed plaintext + cipher on "encrypt"; lamps flicker; raw `Slot`: HIDDEN WIRE drawn from machine to German bunker on "started", packets travel on "sending"; RECEIVED stamp on "Germany" |
| 6 | `Restrict` | `restrict` -> `qthreat` | paper world map (sea, manila land, China salmon, USA blue + pin) | "NOT JUST THE US" list 1-3 | pins pop + red labels on "South Korea", "Italy", "Germany"; RESTRICTING stamp |
| 7 | `QThreat` | `qthreat` -> `take` | (IG DM card) | SECURITY THREAT? / OR / POWER STRUGGLE? manila cards | each card pops on its words |
| 8 | `Take` | `take` -> `cars` | "MADHAV'S TAKE" header, two manila cards SECURITY THREAT / POWER STRUGGLE, OR between | Venn "IT'S BOTH", whale, "NOT OR. AND." | ticks on "security threat and" / "power struggle"; OR crossed on "not or"; AND pops on "and" |
| - | `ATag` | at `T.october`, `T.honest` (1.9 s) | - | red "A · MY ANSWER" tag over the caption (692, 1290) | opens each answer |
| 9 | `Cars` | `cars` -> `jobs` | "EXAMPLE: CARS", U.S. BORDER booth, road, BYD car (`CarSide`), barrier arm | yellow chip "US tariff on Chinese EVs: 100%+"; SECURITY RISK? card; POWER STRUGGLE stamp, "- Madhav's take" | car rolls in on "car market"; typed tariff line on "100%"; barrier drops on "tariff"; "Why do they do it?" typed; card on "security risk?", crossed on "no"; stamp on "power struggle" |
| 10 | `Jobs` | `jobs` -> `ailoss` (column from "employs") | typed "YOUR OWN AUTOMOTIVE INDUSTRY", YOUR MARKET, factory (smoke, lit windows), road, LOCAL car | THAT EMPLOYS PEOPLE + 4 workers -> grey, JOBS LOST stamp | workers pop on "employs"; cheap car + VERY CHEAP tag on "very cheap car"; shoppers walk over on "immediately move"; factory dark + CLOSED on "losing factories"; workers walk off on "losing people job" |
| 11 | `AILoss` | `ailoss` -> `war` (column from "employment") | "SAME WITH AI": MAKE AI card (factory + AI chip, typed "learn by building") -> arrow -> BUY AI crate "from someone else" | "YOU LOSE:" EMPLOYMENT / TECH FRONT / LEARNING checkboxes | MAKE AI on "make AI"; arrow on "rather than"; BUY AI on "buying"; each box X-ed on its word |
| 12 | `War` | `war` -> `plug` | `WarMap`: green strategy table, grid, river, dashed line, blue/red unit blocks; BATTLEFIELD label | `Terminal` (see 15) | IF THERE IS A WAR stamp on "if there is a war"; blue planning arrows on "strategize" |
| 13 | `Plug` | `plug` -> `stuck` | THEIR AI server rack, cable to the column, a paper hand; speech bubble "I'm not gonna give it to you." + typed "You're using it to attack my ally." | (terminal) | hand comes down on "the other person"; plug pulled + LEDs off on "I'm not gonna"; typed lines on "You're using it to" |
| 14 | `Stuck` | `stuck` -> `natsec` | the same map greyed, "?" on blue units | (terminal) | STUCK stamp on "stuck"; "You can't have that." strip |
| 15 | `Terminal` | `war` -> `verdict` | - | "YOUR STRATEGY AI" monitor: "> AI READY", "> PLANNING..." -> ACCESS DENIED; chip "someone else's AI" -> "cut off by its owner"; crack + BROKEN HARDWARE | typed on "strategize"; off on "I'm not gonna"; crack + stamp on "broken hardware" |
| 16 | `NatSec` | `natsec` -> `verdict` | "SO IT BECOMES": NATIONAL SECURITY / AND / POWER STRUGGLE cards | - | ticks on "national security" / "power struggle" |
| 17 | `Verdict` | `verdict` -> `healthy` | "MADHAV'S VERDICT": 1. BAN IT, 2. RESTRICT IT, 3. BUT ALLOW MORE COMPETITORS | "THE MARKET" dashed box: whale + three NEW PLAYER cards dropping in, MORE COMPETITORS | each line + tick on its word; highlighter + cards on "competitors" |
| 18 | `Healthy` | `healthy` -> `comment` | brass scale "US AI vs CHINA AI", pans with folders | COMPETITION / ALWAYS STAYS / HEALTHY, "- Madhav's take" | scale wobble settles level on "healthy"; highlighter on "healthy" |
| 19 | `Comment` | `comment` -> `end` | Instagram-style comment sheet: grey avatar (no username, no counts), "Would you ban it?", "Tell me in the comments", Add a comment... | BAN IT? / LET IT COMPETE? notes + pencil arrow | arrow on "comments" |
| 20 | `End` | `end` -> last frame | closed manila case file "CASE FILE: DEEPSEEK", CLASSIFIED stamp, "THE US JUST BANNED / A CHINESE AI." + "Was that fair?" | FOLLOW stamp, FOR MORE, AI NEWS stamp + highlighter, typed handle | stamps on the spoken outro ("Follow" / "AI news"); handle typed; static after |

Background (`world.tsx` `Back`): desk texture + lamp pool + vignette; never animates.
Captions (`world.tsx` `Caption`): memo strips (one per line, slight seeded rotation), Courier 46 -> 34 px by
character count, unspoken words at 28% opacity, emphasis words (`emph.ts`) in red, `STRONG` words get a
highlighter swipe as they are said. Hidden during the END beat.

Dropped along the way (patterns you can reuse): Federal Register notice with ripping `Redact` bars (v1),
red-string evidence board (`StringLine` + `Pin`, v1-v3), ORIGINATOR / PRODUCER cards, fenced local markets,
a "DHS ORDER" chip with quoted order text (replaced in v5 by the plain "THEIR WORRY: DATA -> CHINA" card; only
quote an official text if you reproduce it exactly from the source).

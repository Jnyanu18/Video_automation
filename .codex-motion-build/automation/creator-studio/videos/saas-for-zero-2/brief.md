# Brief: Your startup on 0 dollars, part 2

- **Funnel:** top (founders and builders shipping a SaaS)
- **Reference:** instagram.com/p/DeHYCIpColc (143 s, warm paper look, five tool layers stacking up, one made-up
  product shown through every chapter, chapter tabs, a running bill at $0.00 with a FREE stamp, a caption pill),
  studied in research/viral/DeHYCIpColc/card.md. Part 1 is our posted 08-saas-for-zero (GitHub, Cloudflare Pages, Neon,
  Resend, R2, PostHog, Zoho Mail, a domain about $10 a year).
- **Our twist:** a sequel. Five tools part 1 did not have, so the two parts add up to one full stack; about 50 s
  against their 143 s; our white keynote look (the 34-three-agents standard), each tool's real logo and our own take
  on its real interface; the bill in the corner stays at $0.00 the whole way through.
- **Facts and sources (checked 2026-11-07):**
  - Convex free plan: 1M function calls a month, 0.5 GB database storage, 1 to 6 developers (convex.dev/pricing).
  - Better Auth: open source, MIT, a TypeScript library that runs inside your app, 2FA, plugins, OAuth and social
    login (github.com/better-auth/better-auth).
  - Stripe: "does not charge setup fees, monthly fees, or any other hidden fees" (stripe.com/pricing). No card rate
    is said, because rates differ by country.
  - Sentry Developer plan: free, 1 user, 5,000 errors (sentry.io/pricing; the page does not say per month, so the
    script does not either).
  - UptimeRobot free plan: 50 monitors, 5-minute checks, "good for personal and commercial projects"
    (uptimerobot.com/pricing).
- **Music:** light, plucky, upbeat (the same family as part 1)
- **Ask:** comment STACK (same keyword as part 1). The DM sends a .docx with both parts' stacks and every link.

## Direction

Code: `remotion/src/lanes/animated/stack.tsx` (view `stackzero`). Voice 58.8 s. Logos in `raw/logos/` (Simple Icons
15.12.0; Convex from convex.dev's own colour logo, Neon from neon.com, UptimeRobot's app icon from uptimerobot.com).

| Time | Words | On screen | Moves | Sound |
| --- | --- | --- | --- | --- |
| 0.0 | Part 1 got over 11,000 views | part 1's reel card, its seven real logos | logos pop in; the view count rolls up to 11K+ | ding on views |
| 3.0 | so here's Part 2 | "Part *two.*" serif | the reel card shrinks to the corner | whoosh and sub |
| 5.0 | on $0 a month | MONTHLY BILL $0.00 | card springs in | |
| 7.5 | now as a real product | Ledgerly window, five dashed empty slots | slots fade in one by one | |
| 8.4 | First, Convex | plum world floods in, tab 01, Convex logo and name | flood from the centre | swish |
| 12.0 | your logic | the invoices table, LIVE pulse | rows land | |
| 15.3 | the screen updates by itself | the user's screen beside it; Northwind turns paid in both at once | check pops | pop |
| 18.2 | a million function calls | "1,000,000 calls a month · FREE" | stamp spins in | |
| 20.2 | Second, Better Auth | black world, tab 02, sign-in card | the email types itself | swish |
| 23.4 | Google sign in, two factor | Continue with Google; six code boxes fill | digits land one by one | typing |
| 25.5 | open source | "Open source · MIT · FREE" | | |
| 28.3 | your users stay in your own database | the users table, "Stays in your app" | rows land, check | |
| 30.3 | Third, Stripe | Stripe purple, tab 03, a checkout for Ledgerly Pro | | swish |
| 32.4 | no monthly fee, no setup fee | "What Stripe charges you": $0, $0 | lines slide in | |
| 36.4 | a customer pays you | Pay turns Paid; "a small fee, only when you get paid" | button press, check | cash |
| 37.2 | Fourth, Sentry | Sentry indigo, tab 04, a red caught error | | swish |
| 41.0 | before your users have to tell you | a user's angry email types, then falls away; "Fixed *before* they write" | | |
| 41.9 | 5000 errors, free | stamp | | |
| 43.9 | Fifth, UptimeRobot | green world, tab 05, ledgerly.app UP | heartbeat bars fill, one per check | swish |
| 48.6 | goes down | the last bar turns red, DOWN, the alert lands | | click |
| 49.5 | 50 monitors, free | stamp | | |
| 51.4 | Add the stack from Part 1 | white again: twelve real logos, part 2's five outlined | they snap in one by one | sweep |
| 54.0 | still $0 | the bill $0.00, stamped FREE | stamp slams | sub |
| 55.7 | comment stack | comment pill types STACK | | typing |
| 57.3 | both parts with every link | the guide card, six sections ticked | | |

Through every chapter: the tabs along the top, and the bill strip above the captions gaining "Tool $0" per chapter.
Captions are the keynote's clean ones, the spoken word in each world's accent. Voice cue: [excited] on the hook.

## Direction plan (written before the script was approved)

- **Look:** white keynote, chapter tabs 01 to 05 along the top (Backend · Login · Payments · Errors · Uptime), serif
  headlines with one italic word, captions with the spoken word in each tool's colour.
- **Hero:** one made-up product (an invoicing app, labelled ILLUSTRATIVE) that grows a new piece in every chapter:
  live data, a sign-in screen, a checkout, an error caught, a status page.
- **The bill:** a small receipt in the top corner. Each chapter adds a line at $0.00; the total never moves. It is
  stamped FREE at "still zero dollars".
- **Hook moment (0 to 2 s):** part 1's seven logos snap into a finished row, a "PART 2" tab drops on top, and five
  empty slots appear for what is coming.
- **Per tool:** the real logo lands, then our own version of its interface acts out the sentence: Convex's table
  updates the screen by itself; the Better Auth sign-in form with Google and a 2FA code; a Stripe checkout where the
  fee line only appears after "a customer pays you"; a Sentry error card caught in red; UptimeRobot's monitor going
  down and the alert firing.

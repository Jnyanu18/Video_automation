# Agency outreach videos (audits)

Each video is a short, personal audit of one real business. It goes to the owner as a video sales letter
and is posted on the Auralion Labs account. Target: two businesses a day.

Started 2026-10-22. The idea comes from an Instagram reel where someone "applies" to be a business's Google
marketing team and walks through the real problems on their site and Google profile.

## The rule that matters most

**Every claim about a business is something that can be shown on screen, with a dated screenshot in
`evidence/<business>/`.** No screenshot, no claim. This is the studio rule "never invent facts" applied to
someone else's business: a wrong claim on a named business, posted publicly, does real damage. Use the
`research` skill before any script that says something about a third party.

## Folders

| Path | What |
| --- | --- |
| `TARGETS.md` | Every business considered, one row each: where we found it, whether it passed, what was sent, what came back |
| `evidence/<business>/` | The dated screenshots and notes behind every claim in that business's video |
| `ready/<business>-<yymmdd>/` | The approved video, the paste-ready post text and the email, after Vishnu says ok |
| `D:\studio\videos\agency-<business>-<yymmdd>\` | The working files of each video (brief, script, voice, cuts, render). It lives with every other video so the existing commands work |

## Per business, in order

1. **Pick.** Active on Instagram (posted in the last 60 days or so), in the niche we are testing, not
   already contacted, not on a do-not-contact list. Add a row to `TARGETS.md`.
2. **Gather evidence.** What an agent can check from their own pages: title tag, meta description, word
   count, headings, a tap-to-call number, city pages, mobile layout, spelling. What Vishnu screenshots:
   their Google Business Profile, their Instagram, competitors' review counts and dates. Save it all in
   `evidence/`.
3. **Brief and script.** Brief names the brand (agency), uses at least one of `purple-cow` or
   `story-loops`, and lists every claim with its screenshot. The script is first person ("I"), no em
   dashes, problems in the order they hurt most, one clear next step at the end.
4. **Voice.** Vishnu records the voiceover himself. The free ElevenLabs plan cannot be used for anything
   posted on his accounts.
5. **Edit and check.** Stills and contact sheet checked by the agent, sound checked by Vishnu, every stage
   ticked in `CHECKS.md` only on his "ok". Copy the approved files to `ready/`.
6. **Send and log.** Email to an address found on their own site or Instagram bio, plus the tagged post.
   Fill in the row in `TARGETS.md`.

## Rules inherited from the studio

- Vishnu never runs a command. He records, approves, and posts.
- Every file he should open is given as a clickable link.
- Paste-ready text holds only the words to publish. Notes go above the block, never inside it.
- No em dashes. First person singular.
- Title and thumbnail are Vishnu's call: offer three.
- Never skip a check in `CHECKS.md`.

## Never

- Text a business. Texting a cell number for marketing has its own consent rules.
- Make a claim without evidence, or round a number up.
- Use an AI voice to make calls.
- Show client data, or name a client, without written permission.
- Publish a video the business owner has not had a fair chance to see first, if the audit is critical in tone.
  Decide per video with Vishnu.

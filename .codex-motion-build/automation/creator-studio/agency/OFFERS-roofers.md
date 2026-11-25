# What we can offer roofers, and how the video changes when they have no website

Written 2026-10-22. Prices are the draft ones from the offer doc ($997 setup + $97 a month for the website;
$1,997 + $497 a month with the AI receptionist) and are not final.

## What we can sell

### Can be delivered now

| Offer | What the roofer gets | Notes |
| --- | --- | --- |
| Website for roofers | Home page, one page per service (repair, replacement, storm damage), service-area pages for their cities, a gallery, a reviews section, a tap-to-call number, a quote request form | Real reviews are quoted word for word with the reviewer's first name. Only their own photos or licensed stock. Demo sites are not indexed by Google |
| Google Business Profile tidy-up | Description, services, hours, website link, photo list, answers to common questions | Needs the owner to give us manager access, or to do it with us on a call |
| AI receptionist | Answers every call, asks the right questions (leak? storm damage? address?), books a free inspection into their calendar, takes a message when needed | Same setup as Ava on Retell and Cal.com. Calls only: no texts |
| Online booking | A "book a free roof inspection" page | Cal.com |
| Website assistant | A chat on the site that answers questions and offers inspection times | Our own Verb product. Which Verb plan covers client sites is not decided |
| Review page and QR code | One link and a QR code (for a yard sign, invoice or business card) that sends happy customers straight to the Google review box | Works without texting |

### Needs something built or decided first

- A monthly report to the owner (calls answered, bookings made). The dashboard exists on this PC but is not hosted yet.
- Building the site automatically for each lead with SiteForge. It is not set up yet (needs its keys and a first run).
- Hosting the receptionist backend on EC2 for more than a handful of clients.

### Do not offer yet

- Any texting: a text back after a missed call, review requests by text, booking by text, owner alerts by text. Blocked on US carrier registration.
- A customer login to the dashboard.
- A money-back guarantee. Not decided.
- Rankings or "page one of Google". Nobody can promise that.

## Why roofers

- One missed call can be one whole job. The question "what happens to a call when you're up on a roof?" fits the trade exactly.
- Many roofers rely on word of mouth and a Facebook page, and do not have a website.
- The receptionist and the website reinforce each other: the site gets the visit, the receptionist and the booking page catch it.

## Our situation: none of the leads has a website

You cannot point at weak things on a site that does not exist, so the video changes shape. The weak thing is
that there is nowhere to send people, and the strongest moment is the fix. Every point below is something
that can be shown on screen with a dated screenshot in `evidence/<business>/`.

1. **Open on what they have.** Their Google rating and review count, on screen. The sheet says each lead
   showed no website button on 2026-10-06. Re-check on the day.
2. **What a homeowner sees today.** A screen recording of searching for them: the Maps listing, the reviews,
   and what is missing (no website button, no services list, no way to ask for a quote online).
3. **Three gaps, each with a screenshot.** Choose from: no website link on the profile; profile description
   empty; no photos of finished jobs; owner never replied to reviews; the Instagram bio has no link and no
   booking button; hours missing. Say only the ones that are true on the day.
4. **The reveal.** The site I built for them, with their real name, rating and review count. Scrolling it.
5. **One next step.** "I'll email you the link." No price in the video.

If there is no draft site to show, do not use this format. A video that says "I would build you a site" is
the weaker version, and it is not the one worth sending.

## Finding the right roofers

The Instagram check cannot be done by search: Instagram hides profiles from search engines (tried on the
ten best-rated roofers on 2026-10-22, nothing found, which proves nothing). Two ways:

- **From our leads.** `D:/Agency/AuralionLabs/roofers-to-check.html` (and the same list as `.csv`) has all 40, best first, with a link to their Maps page and a
  one-click Instagram search. A lead qualifies when it posted in the last 60 days. Fill in the columns.
- **From Instagram.** Roofers who post often but have no website are the best targets of all: they already
  spend effort on social and have nowhere to send the attention. Browse by hashtag and city, and note any
  profile whose bio has no website link. Add them to `TARGETS.md`, then check their Google profile.

Already phoned: Enterprise Roofing (St. Augustine, FL) got a voicemail on 2026-10-19. A video after that is
a second touch, which is fine, but tell me so the message and the video do not contradict each other.

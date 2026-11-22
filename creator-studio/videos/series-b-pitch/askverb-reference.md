# AskVerb: everything about it, for writing the pitch

A reference for any AI or person writing about AskVerb. Facts first, then the rules on how to talk about it,
then a sample 6-minute pitch and the questions to expect in the 4 minutes after it. Every number here is
real; do not add new ones. As of 2026-10-24.

## The one line

AskVerb gives any SaaS product its own AI agent: it sits inside the product, signed in as the user, and does
the work in their account after they say yes. Users ask; it gets done.

## The problem it solves

- Users of a SaaS product know a feature exists and still can't get it done: the path is long (a multi-step
  setup, dense settings, a hidden feature), so they click around, open the docs, give up, or leave.
- The product team spent years building those features; many users never reach them.
- AskVerb is a new capability the product gains. It is not a support tool and not a ticket deflector.

## Who it is for

- Any SaaS with active users today and a workflow those users get stuck in (multi-step setups, dense
  settings, features people ask for that already exist, flows people drop halfway).
- Best fit: products with little or no AI inside them yet. AI-first products tend to build their own.
- Not for founders still finding their first users: they have nobody to give an agent to.
- The help goes to the customer's users, not the customer's own staff.

## What it does, concretely

- An agent inside the product. The user types what they want, for example "move everything due this week for
  the Acme client to Monday and tell the team", or in an invoicing product "send a reminder to every client
  who hasn't paid this month".
- It works out the steps, shows the user exactly what it is about to change, and on their yes does it in their
  account, using the actions the product already has.
- It also answers questions from the product's own pages (pricing, FAQ, docs).
- It never touches money: no checkout, payments or cart, ever.

## How it works (in plain words)

- **Identity:** the agent acts as the signed-in user, inside that user's own permissions. A turn is bound to the
  person who started it.
- **What it may do:** the product team lists the allowed actions in one file, `verb.md`. Their own coding agent
  can write it through AskVerb's MCP (live for customers).
- **Confirmation:** before any change, the user sees a plain-language card of exactly what will change and says
  yes or no.
- **Checks before acting:** before a write runs, the record it is about to change is looked up again; if it has
  moved, changed or vanished, the action is held back.
- **Verified by the server:** whether an action really happened is judged from the product's own response, not
  from what the model says. A write that returns nothing is read back.
- **The model never holds real ids:** it works with handles and titles; the real identifiers stay on the server.
- **A record of everything:** every action is written down, so the team can see what it did and why.
- **Test before live:** every site has a test version to try it on before it reaches real users.
- **Cost and abuse limits:** hard caps on usage per site and across the platform, so a spike cannot run away with
  the bill.
- **Teams:** owner, admin and member roles, access to all sites or chosen ones, invitations by single-use link.
- **Scale:** built for scale from the start (lists page and filter on the server), and deploys swap with no
  downtime.
- **Model:** runs on a leading model through a router (today an OpenAI model via OpenRouter). The provider
  account's training switches are off.

## Setup

- **Quick start:** give it your website; it reads your important pages (pricing, FAQ, about, docs) and builds a
  read-only assistant in about 2 minutes, shown in a preview on a stand-in of your own site. (The 2 minutes is
  Vishnu's own measurement; it has not been timed by hand on production.)
- **Then:** check and edit what it wrote, put one snippet in the product, and list what it may do in `verb.md`.
- **Time:** integrated in under an hour in most cases. Never say "15 minutes" or "always".
- Setup went from about 10 steps to 3 or 4 before day 22 of the challenge.

## Offer and pricing

- A free 30-day pilot on one workflow. During it, track what it handled; afterwards, agree a price from the
  value it actually created. It is not free forever.
- No public prices right now.

## Traction (honest, as of day 23 to 24 of the challenge)

- A 30-day challenge, in public, to get the first 10 paying customers (started 2026-09-30).
- About 23 sign-ups since the challenge began, roughly one a day.
- 0 paying customers. One live install, from before the challenge.
- What people said when asked why they signed up and didn't install: it wasn't the number of steps; putting
  something into a live product needs a reason bigger than curiosity, and often someone else's approval. The
  response: show the agent working on their own product first, then ask them to install it.
- Live in production since 2026-08-21.

## The founder

- Vishnu, 22.
- Has shipped more than six apps; one has over 2,500 users and makes around 100 dollars a month.
- Runs an agency (Auralion Labs) that builds AI agents for clients, so he has built this kind of agent by hand
  many times and knows the hard part: permissions, confirming every change, and knowing what it did.
- Building AskVerb full time, in public, with daily posts and videos.

## Why now

- Models can now use tools reliably.
- Users have learned to ask instead of click elsewhere, and are starting to expect it inside the products they
  pay for.

## How to talk about it (rules)

- Lead with what the product gains: users ask and it gets done. Approval, permissions and the record of actions
  are why it can be trusted, and belong in the body, never the headline.
- Never call it a support tool, a chatbot, or a ticket deflector. Never compare it to a docs chatbot ("a
  chatbot answers, Verb does" is retired).
- Use multi-step examples, never a one-click action (a one-click example makes it look like a slower button).
- Never say "free while we launch". Never quote a daily request limit or any internal limit number.
- First person singular ("I", not "we"). No em dashes. No invented numbers, no market size without a source.

## Sample 6-minute pitch (spoken, nothing on screen)

About 690 words: about 5 minutes at a calm pace, leaving a minute for pauses.

**The problem.** Think about the last time you used a product and knew a feature existed, but couldn't find it.
You clicked around. You opened the docs. Maybe you asked support. And then you gave up. Every product in this
room has that moment. Your users know what they want to do. They just can't get the product to do it fast
enough. So they stall, they open a ticket, or they leave. You've spent years building those features, and a lot
of your users never reach them. Not because the feature is bad, but because finding it takes more effort than
they're willing to give on a busy day.

**What AskVerb is.** AskVerb gives your product its own AI agent. It sits inside your app. It's already signed in
as the user, so it sees exactly what they're allowed to see, and nothing more. The user just types what they
want: "move everything due this week to Monday and tell the team." The agent works out the steps, shows the user
exactly what it's about to change, and when they say yes, it does it, in their account, using the actions your
product already has. Or in an invoicing product: "send a reminder to every client who hasn't paid this month."
Today that's a filter, a list, and twenty emails. With AskVerb, it's one sentence and one yes. So the user
doesn't learn your interface. They ask, and it gets done.

**How it works for a team like yours.** You don't rebuild anything. First, it reads your website, your pricing,
your FAQ, your docs, and builds a read-only assistant in a couple of minutes, so you can see it answer correctly
before it touches anything. Then you decide what it's allowed to do. You list those actions in one file. Your
own coding agent can write it, through our MCP. Most teams are live in under an hour. And every action it takes
asks the user first, stays inside that user's permissions, and is written down, so you always know what it did
and why.

**Why now.** Two things changed. Models can now use tools reliably. And users have learned to ask instead of
click. They do it everywhere else now, and they're starting to expect it inside the products they pay for.

**Why me.** I'm 22. I've shipped more than six apps. One of them has over 2,500 users and makes around 100
dollars a month. Small, but it taught me what users actually do in a product, and where they get stuck. I also
run an agency that builds AI agents for clients. So I've built this kind of agent by hand, again and again, and
I've seen the same hard part every time. The model is easy. The permissions, the confirmation, and knowing what
it did are hard. AskVerb is that hard part, built once.

**Where I am, honestly.** I'm on day 24 of a 30-day challenge to get my first ten paying customers, in public. I
have about 23 sign-ups. I have zero paying customers. When I asked people why they signed up and didn't install
it, the answer was clear. It wasn't the number of steps. It's that putting something into your live product
needs a reason bigger than curiosity, and often someone else's approval. So I'm changing the order: show the
agent working on your own product first, then ask you to install it.

**The market and how it grows.** Every SaaS with real users and a workflow people get stuck in is a customer.
It scales because there's no custom work per customer. One snippet, one file, and the agent uses what the
product already does. I start with a free 30-day pilot on one workflow, and we agree the price after, from what
it actually handled. It grows through the products themselves: every user who gets something done by asking is
the demo for the next founder.

**The ask.** So here's my ask. If your product has a workflow your users get stuck in, give me that one
workflow. I'll run a 30-day pilot on it, and we'll measure what it handles. And if it's not for you, tell me
which founder you know who has that problem. I'm Vishnu. This is AskVerb. Thank you.

## The 4 minutes of questions: likely questions and answers

Answer in two or three sentences, then stop. A short answer leaves time for another question.

**Why wouldn't we just build this ourselves?**
You could build the agent in a few weeks. The part that takes a quarter is everything around it: acting only
inside each user's permissions, confirming every change, checking the record hasn't changed before acting, and
a record of what it did. That's what AskVerb is, already built and running.

**What happens if it does something wrong?**
It can only do the actions you listed, only inside the user's own permissions, and it asks before every change.
Whether something happened is checked from your product's response, not the model's word, and everything is
written down.

**How is this different from the AI assistants already out there?**
It works inside your product, signed in as your user, and uses your product's own actions. The user's task gets
done in their account.

**What's your traction?**
About 23 sign-ups since I started the challenge, zero paying, one live install from before. And I know why:
installing into a live product needs a reason bigger than curiosity, so I'm leading with a working agent on
their own product before asking them to install.

**Why only one live install after 23 sign-ups?**
I haven't split the sign-ups by source yet, but many came while I was posting in public, and my guess is a lot
of them are builders following along rather than teams with the problem today. That's why I'm here: you have
the users and the workflows.

**What do you charge?**
A free 30-day pilot on one workflow. We track what it handles, then agree a price from the value it created.

**How do you handle a big jump in usage?**
It was built for scale from the start: lists are paged and filtered on the server, deploys swap with no
downtime, and model cost has hard caps per site and across the platform, so a spike can't run away with the bill.

**Which model do you use, and is our data used for training?**
It runs on a leading model through a router. The provider account's training settings are off, so requests
aren't used to train models.

**What about security and data access?**
The agent never sees more than the signed-in user can. It never holds your real record ids; those stay on our
server. It never touches payments. And every action is recorded.

**Why you, at 22?**
I've shipped more than six apps, one with over 2,500 users, and I build AI agents for clients for a living. I've
hit the hard part of this problem many times; AskVerb is me solving it once.

**What would a pilot need from us?**
Your website, one workflow your users get stuck in, and someone who can add one snippet and one file. Most teams
are live in under an hour.

**Are you raising?**
Answer only what is true that day. If not raising: "Not right now. I'm focused on the first ten customers."

**What's the biggest risk?**
Adoption: getting teams to put it into a live product. That's why I lead with a pilot on one workflow and show
it working on their own product first.

# Harvey: the complete setup guide

Harvey is a free, open source sales agent that runs on your own laptop. It finds businesses, reads their websites, writes each one a cold email about something specific it found, reads the replies and drafts your answers. Nothing sends until you approve it.

The AI runs on the Claude Pro or Max plan you already pay for, through Claude Code, so there is no API bill.

Repo: https://github.com/ethanplusai/harvey

## What you need

Python 3.11 or newer. Check with python3 --version. A Mac ships with 3.9, so install a newer one first with brew install python@3.13.

A Claude Pro or Max plan, with Claude Code installed and logged in.

A mailbox to send from. Gmail or Google Workspace works best, about $7 a month, on a separate domain bought just for sending (for example getyourbrand.com, never your main domain). Microsoft 365 works too.

A warm-up service for that mailbox. The README recommends TrulyInbox. A new mailbox that sends cold email on day one lands in spam.

> The commands below are for Mac and Linux. On Windows, use WSL2, or use the easy way in Step 1, where Claude does the setup for you.

## Step 1: Get Harvey

### The easy way: let Claude set it up

Open a terminal and run these three lines:

```
git clone https://github.com/ethanplusai/harvey.git
cd harvey
claude
```

Then type: set up Harvey for me

The repo comes with instructions that turn Claude Code into a setup wizard. It checks what you have, installs what's missing, asks for what it needs and trains Harvey on your product. If you go this way, skip to Step 6.

### Or do it yourself

```
git clone https://github.com/ethanplusai/harvey.git
cd harvey
python3.13 -m venv .venv && source .venv/bin/activate && pip install -e .
```

## Step 2: Add your settings

```
cp .env.example .env
```

Open the new .env file in any text editor and fill it in. Every setting has a note saying where to get it.

## Step 3: Teach it your product

Point Harvey at your company website:

```
harvey train https://your-company.com
```

It reads the site and writes down what you sell and who you sell to.

## Step 4: Choose what makes a good prospect

Harvey can collect 29 signals about a business, and collects none of them until you say so. One of them is a business with no online booking page. To turn on every signal that costs nothing (26 of them):

```
harvey signals --confirm free
```

To see the full list first, with what each one costs, run harvey signals.

## Step 5: Find businesses

```
harvey discover
```

The default source is free and needs no account.

## Step 6: Open the dashboard and start it

```
harvey dashboard
harvey run
```

The first line prints a private link to your dashboard at 127.0.0.1:5555. Open that exact link; it only works on your own laptop. The second line starts Harvey. It wakes up every 15 minutes and works through the pipeline.

## Step 7: Approve your emails

Every email waits in the Outbox until you approve it. Open one, read it, then press A to approve or R to reject. J and K move between emails.

From the terminal:

```
harvey outbox
```

To stop all sending at once:

```
harvey sending pause
```

> Autopilot (sending without your approval) is off by default. You can turn it on in Settings, but start with approval until you trust what it writes.

## Before you send for real

Set up SPF, DKIM and DMARC on your sending domain. Without all three, Gmail sends you to spam.

Warm the mailbox up for 2 to 4 weeks before real volume.

Start slow: 10 to 20 emails a day per mailbox, adding about 5 a day.

Check if your domain is ready:

```
harvey warmup
```

It ends with READY or NOT READY.

Add your postal address under compliance.postal_address in harvey.yaml before your first campaign. US law (CAN-SPAM) requires it in cold email, and Harvey adds it with an opt-out line under every cold email.

## If something goes wrong

"command not found: harvey": run source .venv/bin/activate first.

Claude calls fail: run claude login and check your plan is active. Test it with claude -p "say hi".

Dashboard says locked: open the link harvey dashboard printed, or run harvey dashboard --url to print it again.

Discovery finds nothing: confirm your signals first with harvey signals --confirm free.

Emails land in spam: it's almost always the domain. Check SPF, DKIM and DMARC, make sure warm-up ran, and halve your volume.

Harvey does nothing during the day: check its quiet hours and daily usage cap. harvey status shows what it's doing.

Full README, with every setting: https://github.com/ethanplusai/harvey

## More from me

OpenJarvis: your own AI assistant that runs on your laptop and briefs you every morning on your inbox, calendar and the news. Comment GUIDE on that video and I'll send you its setup guide.

AskVerb: what I'm building. An AI agent that lives inside your product and does the work for your users. https://askverb.com

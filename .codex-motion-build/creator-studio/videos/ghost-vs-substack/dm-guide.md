# Leave Substack, keep your list: the Ghost setup guide

Ghost is free, open-source publishing software (MIT): a blog, email newsletters and paid memberships in one place, and Ghost takes no cut of your subscription revenue. Substack keeps 10% of every paid subscription.

Repo: https://github.com/TryGhost/Ghost

> Everything here is from Ghost's own docs and pricing page, read on 2026-11-07. Stripe's card fees still apply wherever you publish.

## Step 1: get Ghost running

You have two ways to do it.

**Self-host it (free software, you pay only for the server).** Ghost's official guide uses an Ubuntu server (22.04, 24.04 or 26.04) with at least 1GB of memory, MySQL 8, NGINX and Node.js 22, plus a domain whose DNS A-record already points at the server.

On the server, as a normal user with sudo (not one called "ghost"), after installing NGINX, MySQL and Node.js as the guide shows:

```
sudo npm install ghost-cli@latest -g
sudo mkdir -p /var/www/sitename
sudo chown $USER:$USER /var/www/sitename
sudo chmod 775 /var/www/sitename
cd /var/www/sitename
ghost install
```

The installer asks for your site address (use the full https:// address), your MySQL login, and whether to set up NGINX, SSL and systemd. Say yes to all three.

Full guide: https://docs.ghost.org/install/ubuntu

Ghost also has a Docker install, still marked as a preview: https://docs.ghost.org/install/

**Or let Ghost host it (Ghost(Pro)).** No server to run. Paid memberships need the Publisher plan or higher; the cheapest Starter plan doesn't include them. Ghost(Pro) still takes no transaction fees. Pricing: https://ghost.org/pricing/

## Step 2: bring your Substack over

Ghost has a built-in Substack migrator. Log in to Substack first, then in Ghost Admin go to **Settings → Advanced → Import/Export**.

1. **Connect Stripe in Ghost first, if you have paid subscribers.** Use the same Stripe account that's connected to your Substack.
2. Enter your Substack URL and click **Continue**.
3. Click **Open Substack Settings**, then **Create new export**, and download the zip file.
4. Upload the zip in Ghost.
5. Download your **free subscribers** CSV from Substack and upload it.
6. Download your **paid subscribers** CSV and upload it.
7. Check the post and member counts, then click **Import content and subscribers**.

Guide: https://docs.ghost.org/migration/substack

## Step 3: turn on paid memberships

Your paid members move with Stripe, so their payments keep going. Then:

- **Stop Substack's 10%.** Substack keeps charging 10% on existing paid subscriptions until that's sorted. Ghost offers help with removing those fees at concierge@ghost.org.
- **Fix the bank statement name.** Readers' statements may still say "Substack". Change it in Stripe under your public details.
- **Keep old links working.** If you used a custom domain on Substack, add the redirects from Ghost's guide so old /p/ links still open.

## What to expect

- **Self-hosting means you're the admin:** updates, backups and the server bill are yours. Ghost(Pro) takes that off your hands.
- **Stripe's card fees apply on every platform.** What you save is the 10% platform cut.

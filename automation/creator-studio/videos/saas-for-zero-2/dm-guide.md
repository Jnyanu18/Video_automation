# The $0 startup stack: both parts

Everything from part 1 and part 2 in one place: twelve tools, what each one does, and what the free plan gives you. Together they cover a real product: code, hosting, a backend and database, logins, payments, email, files, analytics, error tracking and uptime alerts.

The one thing you pay for is your domain, about $10 a year.

> Free plans change. Check each one before you build on it. Numbers below were read from each tool's own pricing page on 2026-11-07.

## Part 1: get it online

**GitHub: your code**
Free private repositories.
https://github.com/pricing

**Cloudflare Pages: your website**
Connect your GitHub repo and every push deploys your site, with SSL, a global network and your own domain.
https://pages.cloudflare.com

**Neon: a Postgres database**
A free tier for your first database.
https://neon.com/pricing

**Resend: sending email**
3,000 emails a month, 100 a day, free.
https://resend.com/pricing

**Cloudflare R2: file storage**
10 GB of storage free, and no fee when people download your files.
https://www.cloudflare.com/developer-platform/products/r2/

**PostHog: product analytics**
1 million events a month free.
https://posthog.com/pricing

**Zoho Mail: business email**
Free for up to 5 users on your own domain.
https://www.zoho.com/mail/zohomail-pricing.html

## Part 2: make it a real product

**Convex: backend and database**
Your data and your logic in one place, and the screen updates by itself when the data changes. The free plan includes 1 million function calls a month, 0.5 GB of database storage and up to 6 developers.
https://www.convex.dev/pricing

**Better Auth: logins**
Email and password, Google and other social sign-in, two-factor and more through plugins. Open source (MIT), runs inside your own app, and your users stay in your own database.
https://www.better-auth.com
https://github.com/better-auth/better-auth

**Stripe: payments**
No setup fee and no monthly fee. You pay a small fee per payment, only when a customer pays you.
https://stripe.com/pricing

**Sentry: error tracking**
The free Developer plan includes 5,000 errors for 1 user, so you hear about a bug before your users do.
https://sentry.io/pricing/

**UptimeRobot: uptime alerts**
50 monitors checked every 5 minutes, free, and allowed for commercial projects. It tells you the moment your site goes down.
https://uptimerobot.com/pricing/

## In what order

1. Push your code to GitHub.
2. Deploy the front end on Cloudflare Pages and point your domain at it.
3. Add Convex for the backend and data (or Neon if you want plain Postgres).
4. Add Better Auth for sign-up and login.
5. Add Stripe when you are ready to charge.
6. Turn on Sentry and UptimeRobot before your first users arrive.
7. Add Resend, R2, PostHog and Zoho Mail as you need them.

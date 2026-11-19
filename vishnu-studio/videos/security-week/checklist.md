# The one page security checklist: week of 21 October 2026

Five things broke this week. Here is exactly what to check, update and restart, in about 30 minutes.

## 1. Node.js

Four high severity fixes on 21 October, including one that lets an attacker run code through a compressed (Brotli) response.

- Check: `node -v` on your laptop, your server, your Docker images and your CI.
- Update to at least: **v22.23.4**, **v24.22.1** or **v26.12.1**, whichever line you are on.
- Older than v22? It no longer gets fixes. Move to v22 or v24.
- Then restart every Node process. A running app keeps the old version in memory until it restarts.

## 2. PHP (WordPress, Laravel, Drupal, anything on PHP)

Two critical flaws ("PHP2Shell") let anyone run code on your server without logging in. Every version back to 5.4 is affected, and attacks started within hours.

- Check: `php -v`.
- Update to at least: **8.5.12**, **8.4.27**, **8.3.36** or **8.2.35**.
- On 8.1 or older: there is no official fix. Use your host's or your Linux distribution's patched package, or upgrade.
- Then restart PHP-FPM or your web server.
- Using managed hosting? Ask them today whether they have patched.

## 3. LiteLLM (if you build with AI)

Version **1.107.0** was poisoned on 21 October, on PyPI and Docker Hub, for about two hours. It ran every time Python started, and stole cloud keys, SSH keys, env files and AI provider keys.

- Check: `pip show litellm`, and any `litellm` Docker image you pulled on 21 October.
- If 1.107.0 was ever installed or run: treat that machine as compromised. Rebuild it, and rotate every secret it could read.
- Pin to **1.106.2** or a later release the LiteLLM team marks as safe.

## 4. Certificates (eMudhra)

Eight certificate authority keys that browsers trusted were guessable for about 17 months. Chrome, Firefox and Apple have blocked them.

- Update your browsers and operating systems.
- On servers, update the certificate store: `sudo apt update && sudo apt install --only-upgrade ca-certificates` on Ubuntu or Debian.
- Update apps that carry their own certificate list (Node.js, Go, Java), which steps 1 and 5 cover.

## 5. Your packages (npm, pip)

Malicious packages are still being published, and some are still live on npm.

- Commit your lockfile and install from it (`npm ci`, `pnpm install --frozen-lockfile`).
- Don't install a brand new release the day it comes out. Wait a few days unless it is a security fix.
- Run `npm audit` or `pnpm audit` and read what it says.
- Keep secrets out of machines that install packages but don't need those secrets.

## The habit that covers next week too

Once a week, ten minutes: check the versions above, apply security releases, and restart what you updated.

## Sources

- Node.js security releases, 21 October 2026: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- PHP2Shell, Patchstack: https://patchstack.com/articles/php-major-vulnerability-alert-10-2026/
- LiteLLM incident report: https://docs.litellm.ai/blog/security-incident-oct-21-2026
- LiteLLM, Help Net Security: https://www.helpnetsecurity.com/2026/10/22/litellm-compromised-supply-chain-attack-pypi-docker/
- eMudhra, Mozilla: https://blog.mozilla.org/security/2026/10/20/protecting-firefox-users-following-the-compromise-of-emudhra-intermediate-certificates/
- eMudhra, Google: https://blog.google/security/protecting-chrome-and-android-users-from-compromised-emudhra-intermediate-ca-certificates/
- Malicious npm packages, The Hacker News: https://thehackernews.com/2026/10/malfex-npm-package-imgdecode-hides.html

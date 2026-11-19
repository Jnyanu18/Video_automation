# Free business email on your own domain: the setup

OpenInbox is free and open source (MIT): github.com/sums001/OpenInbox. It runs inside your own Cloudflare account on the free plan. Everything here is from its README, read on 9 November 2026.

It's in beta. Try it on a spare domain before you move important mail to it.

## What you need

- A free Cloudflare account, with your domain on Cloudflare's nameservers.
- A GitHub account.
- A free account with a sending provider, such as Resend or Brevo. You only need this to send; receiving works without one.

## Set it up

1. Click "Deploy to Cloudflare" on the GitHub page, then Deploy. Keep the default names.
2. Open the Worker's workers.dev address. If there isn't one, turn it on in the Worker's Settings, Domains & Routes.
3. The setup page asks for a Cloudflare API token. Click Create token: Cloudflare opens with the permissions filled in, so you click Continue to summary, then Create Token, and paste it back.
4. Save the recovery key it shows you, in a password manager. It's shown once, and it's the only way back into the owner account.
5. Follow the setup page: it creates your admin account and connects your domain. It writes the mail records (SPF, DKIM, DMARC) for you.
6. In Admin, Integrations, connect your sending provider. Add a second one too: when the first hits its free limit, mail goes out through the next.

## Then

- Add users and mailboxes: support@, sales@, one for everyone. No per-seat cost.
- Search with from:, has:attachment and before:, plus labels, filters, snooze, scheduled send and undo send.
- It's for everyday email, not newsletters or bulk sending.

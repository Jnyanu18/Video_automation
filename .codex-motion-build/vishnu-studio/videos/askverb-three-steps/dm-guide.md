# AskVerb setup guide: an AI assistant inside your product

AskVerb gives your product its own AI assistant. Your users ask for what they need in plain words; it answers from
your product, and once you connect your codebase it can do the task for them inside their own account, after they
confirm with one click. It works on almost any stack, for websites and web apps, and in most cases you're live in
under an hour.

> **Note:** AskVerb is free during the pilot period. When we launch a paid plan, it will be updated here.

## The full setup

**1. Sign up**
Go to askverb.com and sign up with your email. You get a one-time code, no password and no card.

**2. Read your site**
Type your website address. AskVerb reads your home page and up to 7 key pages linked from it (pricing, features, FAQ,
docs, about) and drafts:
- what your assistant knows about your product, in short labelled paragraphs;
- three questions a new customer would ask, which become starter cards;
- your icon.

You can see which pages were read. Fix the name or anything in the draft that's off, then press
**"Looks right, show me my assistant"**.

**3. Try it**
Your assistant opens in a preview on a stand-in of your site, with your icon on the button and your three questions as
starter cards. Ask it anything. Choose:
- a side panel or a popup;
- the text in the bubble beside the button;
- whether your icon shows on the button.

Each change reloads the preview, so you see it as your users will.

**4. Put it in your product**
Copy the prompt for your coding agent (the gold button) and run it in your editor, or copy the one script line and add
it to your app yourself. If someone else does the coding, **"Email this to my developer"** sends it to them. The step
ticks itself the moment the assistant loads in your app.

From here your assistant answers your users' questions inside your product. It is read-only: it can't change anything
yet.

**5. Tell it how your users sign in**
Answer **"Do your users sign in?"**. If they do, every action the assistant takes later runs as the user who asked,
with their own access, never as an admin.

**6. Connect the Verb MCP to your coding agent**
- **Claude Code:** run `claude mcp add --transport http verb https://app.askverb.com/api/mcp`
- **Cursor, VS Code or Windsurf:** add `https://app.askverb.com/api/mcp` as an MCP server in your editor's MCP settings.

The first time your agent uses it, a browser tab opens and asks you to sign in to AskVerb and approve access. There is
no API key to copy or store.

**7. Let it write your verb.md**
Ask your coding agent: *"Read my codebase, write a verb.md for my app's main actions, review it and import it."*
`verb.md` is a plain file you own that lists what your users can ask for (for example: export invoices, add a teammate,
move an order) and how each action calls your app. AskVerb runs a safety review on it before anything is saved, then
imports the actions to your test site and your live site.

**8. Test it on your test site**
Everything lands on your test site first. Ask it to do real tasks. Every change shows a confirm card with the exact
details (which records, what changes), and nothing runs until the user clicks Confirm. You can switch any action on or
off at any time.

**9. Go live**
Add your live domain and confirm it. Your assistant only runs on the domains you approve, so nobody else can put it on
their site.

## After you're live

- **Keep it in sync:** when your app changes, ask your coding agent to run the Verb MCP's sync prompt (in Claude Code,
  `/mcp__verb__sync`). It compares your codebase with your actions and proposes what to add, switch off or rewrite,
  changing nothing without your yes.
- **Change how it looks or what it says:** name, greeting, colours, placement and starter cards are all in your site's
  settings, or ask your coding agent through the Verb MCP.
- **Turn it off instantly:** every site has an on/off switch at the top of its page.

Stuck at any step? Reply to my message and I'll help you set it up.

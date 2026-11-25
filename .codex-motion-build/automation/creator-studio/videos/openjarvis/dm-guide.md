# Your own Jarvis: the complete setup guide

OpenJarvis is a free, open source AI assistant that runs on your own laptop. It was built at Stanford by Hazy Research and the Scaling Intelligence Lab, and it has over 12,000 stars on GitHub.

This guide takes you from nothing to a Jarvis that briefs you every morning on your inbox, your calendar and the news.

Repo: https://github.com/open-jarvis/OpenJarvis

Docs: https://open-jarvis.github.io/OpenJarvis/

## What you need

Laptop: a Mac, Windows or Linux laptop. The AI model runs on your machine, so a newer laptop (Apple Silicon or a graphics card) runs it faster. Jarvis checks your hardware and picks a model that fits.

Internet: for the install, about three minutes on good internet.

Google account: only if you want your Gmail and Calendar in the briefing.

## Step 1: Install Jarvis (one command)

### On a Mac

Part 1: Open Terminal. Press Cmd + Space, type Terminal, press Enter.

Part 2: Paste this line and press Enter:

curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash

### On Windows

Part 1: Open PowerShell. Press the Windows key, type PowerShell, press Enter.

Part 2: Paste this line and press Enter:

irm https://open-jarvis.github.io/OpenJarvis/install.ps1 | iex

### On Linux (or WSL2 on Windows)

Open a terminal and paste the same line as the Mac:

curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash

### What the installer does

It sets everything up for you: Python tools, Ollama (the engine that runs the AI on your laptop) and a starter AI model. Bigger models keep downloading in the background after it finishes.

### Prefer an app?

Download the desktop app from https://github.com/open-jarvis/OpenJarvis/releases. Pick .dmg for Mac, .exe for Windows, or .deb, .rpm or .AppImage for Linux. The app connects to the Jarvis engine on your laptop, so start the engine first.

## Step 2: Say hello

In the same terminal, type:

jarvis

That opens a chat with Jarvis right in your terminal. Ask it anything.

Prefer a proper chat window? Type this instead, and it opens in your browser:

jarvis gui

To see what is still downloading in the background, type:

jarvis doctor

To see which AI models your laptop can run and how much memory each one needs, type:

jarvis model list

## Step 3: Connect your Google account

One connection covers Gmail, Google Calendar and Google Tasks. Run:

jarvis connect gdrive

Jarvis asks for Google client credentials (a client ID and a client secret). You make these once in the Google Cloud Console. There are five parts.

Part 1: Go to https://console.cloud.google.com and create a new project. Any name works, for example "Jarvis".

Part 2: Open "APIs & Services", then "Library", and turn on the Gmail API, the Google Calendar API and the Google Tasks API.

Part 3: Open "OAuth consent screen", choose External, fill in the app name and your email, and add your own Google address as a test user.

Part 4: Open "Credentials", click "Create credentials", then "OAuth client ID", and follow the type Jarvis asks for.

Part 5: Copy the client ID and client secret and paste them into Jarvis when it asks.

Your browser then opens. Sign in to Google and allow access. That's it: Jarvis can now read your inbox, calendar and tasks.

To check what is connected at any time, type:

jarvis connect --list

## Step 4: Turn on your morning briefing

Load the morning briefing setup for your machine. Use only the line for your laptop.

On a Mac:

jarvis init --preset morning-digest-mac --force

On Linux:

jarvis init --preset morning-digest-linux --force

On Windows, or if you want the minimal version:

jarvis init --preset morning-digest-minimal --force

Heads up: --force replaces your current Jarvis settings, so do this before you customise anything.

Now hear your first briefing:

jarvis digest --fresh

Jarvis reads your inbox, your calendar and the news, writes your briefing, and plays it out loud. You can also just type "Good morning" in the chat.

### About the voice

The AI model is free and runs on your laptop. The spoken voice comes from a voice service, Cartesia or OpenAI, which you pay for as you use it with your own key. Add one of these before you run the briefing.

On Mac or Linux, for Cartesia:

export CARTESIA_API_KEY=your-key-here

On Mac or Linux, for OpenAI:

export OPENAI_API_KEY=your-key-here

On Windows (PowerShell), for Cartesia:

$env:CARTESIA_API_KEY="your-key-here"

Want it completely free? Skip the voice and read your briefing instead:

jarvis digest --fresh --text-only

## Step 5: Get it every morning, automatically

Tell Jarvis when to brief you. This sets 7 AM every day:

jarvis digest --schedule "0 7 * * *"

Change the 7 to the hour you want. It uses the 24-hour clock: 6 for 6 AM, 8 for 8 AM.

Set your time zone in your Jarvis settings file at ~/.openjarvis/config.toml, under [digest], for example:

timezone = "America/New_York"

To see your schedule, type:

jarvis digest --schedule

To turn it off, type:

jarvis digest --schedule off

## Make it yours

Voice: with Cartesia, Jarvis can sound like Alistair, Benedict, Harrison or Sterling (British voices). With OpenAI, pick onyx, nova, alloy or shimmer.

What it covers: the briefing has sections for health (Oura, Apple Health, Strava), messages (Gmail, Tasks, Slack, Notion, GitHub), calendar, the world (weather, Hacker News, news feeds) and music. Choose which ones appear, and in what order, in ~/.openjarvis/config.toml.

More connections: jarvis connect oura, jarvis connect spotify and jarvis connect strava work the same way as Google.

Past briefings: type jarvis digest --history

## If something goes wrong

"jarvis: command not found": put uv run in front of the command, for example uv run jarvis.

Mac says the app is "damaged": run xattr -cr /Applications/OpenJarvis.app in Terminal, then open it again.

"No digest for today": run jarvis digest --fresh.

Empty sections in the briefing: run jarvis connect --list to check your connections. Google tokens refresh on their own the next time Jarvis uses them.

No sound: check your Cartesia or OpenAI key is set and that the account has credit.

Weather not showing: new OpenWeatherMap keys can take up to two hours to start working.

Full docs, including every setting: https://open-jarvis.github.io/OpenJarvis/

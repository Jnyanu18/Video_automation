# Turn your old Echo into your own AI assistant: the setup

Hermes Voice is free and open source (MIT): github.com/majorminorlabs/hermes-voice. It lets you talk to your own Hermes agent through an old Amazon Echo, instead of Alexa. Everything here is from its README, read on 9 November 2026.

## 1. Check your Echo first

Only some older Echos can be unlocked. Find the model number printed under the base, and check the software version too: a newer Amazon update can block the unlock even on a listed model.

These work:

- Echo Dot 2nd gen (2016): RS03QR
- Echo 2nd gen (2017): XC56PY
- Echo Dot 3rd gen (2018): D9N29T
- Echo Input (2018): C1125P
- Echo Show 5 1st gen (2019): H23K37
- Echo Show 8 1st gen (2019): C7H6N3
- Echo Show 5 2nd gen (2021): C76N8S
- Echo Show 8 2nd gen (2021): A8H3N2

These don't: the Echo Dot 3rd gen 2019 refresh (C78MP8) and the Echo Dot with clock (36EBT3).

Buying a used one? Ask the seller for a photo of the model label and the full software version first.

## 2. What you need

- Hermes Agent, installed and working: github.com/NousResearch/hermes-agent
- A model for it. Hermes works with any model provider or your own endpoint. Run a model on your own computer and the whole setup stays free.
- Home Assistant. The setup can install it in Docker for you, or use one you already run.
- The Echo, unlocked with echo-dot-assist: github.com/Gamer92000/echo-dot-assist (follow the guide for your exact model).

## 3. Install Hermes Voice

The one-command skill install is blocked by Hermes' security scanner for now, so use the manual install. Don't turn the scanner off.

1. Make a voice profile for Hermes and start its API server. The repo's docs/voice-profile.md walks through it.
2. In Home Assistant: HACS, then Custom repositories, add the hermes-voice repository as an Integration, install Hermes Voice and restart Home Assistant.
3. Settings, Devices & services, Add integration, Hermes Voice. Give it your Hermes gateway URL and the profile's API key.
4. Settings, Voice assistants, your pipeline: set the conversation agent to the new Hermes entity, with speech-to-text and text-to-speech (Whisper and Piper).
5. On the Echo, switch the wake word to "Hey Hermes".

## 4. Choose what it's allowed to do

- safe: web search and memory
- home: plus control of your smart home
- full: plus terminal, files and code, for coding by voice

Start with safe. Move up only when you trust it.

## 5. On an Echo Show

The screen shows what it heard, the tools it's using and the answer as it's written. With Hermes Eye it can look through the camera; a REC badge shows whenever the camera is on, and the shutter or mute button always turns it off.

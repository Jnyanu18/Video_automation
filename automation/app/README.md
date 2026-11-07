# Reels Automation app (Expo / React Native)

One codebase for web, iOS and Android. Talks only to the dashboard backend (`../docs/backend-api.md`).

- `npm install`
- Web dev: `npm run web` (backend must be reachable; run `npm run dev:stack` in `..` first, password `dev-password`)
- Phone: `npm start`, scan the QR with Expo Go. On the sign-in screen enter your backend address
  (Android emulator: `http://10.0.2.2:8787`; a real phone needs your computer's LAN IP or a deployed https URL).
- Production web: `npm run build:web` writes into `../web/dist`, which the backend already serves.

Layout: `src/app` routes, `src/components` UI kit, `src/api` client + types, `src/state` auth/live/data hooks, `src/theme` design tokens.

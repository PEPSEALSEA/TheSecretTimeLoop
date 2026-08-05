# The Secret Time Loop

Pirate-themed live score desk for 8 teams. Host controls the big screen; 8 staff desks score their own team; TVs listen to Firebase Realtime Database (`onValue`) — no polling.

## Stack

Vite + React + TypeScript, Tailwind, Framer Motion, Howler, Firebase RTDB, GitHub Pages.

## Theme

Inspired by the event poster: parchment scroll center, sky and ocean frame, gold accents, pirate red highlights.

Fonts: **Kanit** (headlines), **Mali** (body), **Pirata One** (English pirate accent).

## Scoring

- Wrong: `score - bet`
- Correct: `score + (bet × multiplier)`
- Multipliers: 0.5 – 1.5 (per question)
- Staff can also set their team's score directly

## Dev

```bash
cp .env.example .env
# edit .env with your Firebase key and admin password
npm install
npm run dev
```

Open `http://localhost:5173/TheSecretTimeLoop/` (Vite `base` matches GitHub Pages).

## Routes

- `/` — public home
- `/display/all` — host screen (question → wait → reveal → scores)
- `/admin` — host control only (advance phases on big screen)
- `/staff/:teamId` — staff desk for one team (`/staff/1` … `/staff/8`)

Hidden routes; open directly and enter `VITE_ADMIN_PASSWORD`.

## Game flow

1. Host starts game → big screen shows question + timer
2. Time ends → question clears; host clicks to reveal (no auto-next)
3. Reveal → host opens scoreboard
4. Each staff at `/staff/N` submits their team; host sees e.g. `3/8`
5. Host presses next → next question

Questions and per-question `durationSec` live in `src/lib/questions.ts` (edit there for now).

## Environment

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_ADMIN_PASSWORD` | Staff login password for admin routes |

For GitHub Actions deploy, add both as repository secrets.

## Deploy

Push to `main` runs `.github/workflows/deploy.yml`. Enable GitHub Pages (Source: GitHub Actions) in repo settings.

If `database.rules.json` changes, deploy Firebase rules:

```bash
npx -y firebase-tools@latest deploy --only database --project secret-timeloop-2026
```

# The Secret Time Loop

Pirate-themed live score desk for 8 teams. Staff manage scores on one admin page; TVs listen to Firebase Realtime Database (`onValue`) — no polling.

## Stack

Vite + React + TypeScript, Tailwind, Framer Motion, Howler, Firebase RTDB, GitHub Pages.

## Theme

Inspired by the event poster: parchment scroll center, sky and ocean frame, gold accents, pirate red highlights.

Fonts: **Kanit** (headlines), **Mali** (body), **Pirata One** (English pirate accent).

## Scoring

- Wrong: `score - bet`
- Correct: `score - bet + (bet × multiplier)`
- Multipliers: 1.1 – 1.5
- Admin can also set any team's score directly

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
- `/admin` — staff control + scoring (**hidden**, password required)

Admin is not linked from public pages. Open `/admin` directly and enter `VITE_ADMIN_PASSWORD`.

## Game flow

1. Admin starts game → host shows question + timer (top-right)
2. Time ends → question clears; admin must click to reveal (no auto-next)
3. Reveal answer → admin goes to scoreboard
4. Admin edits any team; progress shows e.g. `3/8`
5. Admin presses next → next question

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

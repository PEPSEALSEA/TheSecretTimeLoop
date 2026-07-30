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
- `/display/all` — all-teams live scoreboard
- `/admin` — staff desk (**hidden**, password required, direct link only)

Admin is not linked from public pages. Open `/admin` directly and enter `VITE_ADMIN_PASSWORD`.

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

# The Secret Time Loop

Pirate-themed live score desk for 8 teams. Staff enter bets on admin pages; TVs listen to Firebase Realtime Database (`onValue`) — no polling.

## Stack

Vite + React + TypeScript, Tailwind, Framer Motion, Howler, Firebase RTDB, GitHub Pages.

## Scoring

- Wrong: `score - bet`
- Correct: `score - bet + (bet × multiplier)`
- Multipliers: 1.1 – 1.5

## Dev

```bash
npm install
npm run dev
```

Open `http://localhost:5173/TheSecretTimeLoop/` (Vite `base` matches GitHub Pages).

## Routes

- `/` — home
- `/admin/:teamId` — staff (1–8)
- `/display/:teamId` — TV board
- `/display/all` — all teams

## Deploy

Push to `main` runs `.github/workflows/deploy.yml`. Enable GitHub Pages (Source: GitHub Actions) in repo settings.

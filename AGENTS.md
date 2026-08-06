# AGENTS.md

## Cursor Cloud specific instructions

Cloud Agents use `.cursor/environment.json` (install + Vite terminal on port 5173).

### Local verification in the VM

```bash
npm run lint
npm run build
npm run dev -- --host 0.0.0.0 --port 5173
```

App URL: `http://localhost:5173/` (dev `base` is `/`).

### Secrets (Dashboard → Cloud Agents → Secrets)

Add these so admin routes and Firebase work in the cloud VM:

| Secret | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_ADMIN_PASSWORD` | Password for `/admin` and staff gates |

Do not commit `.env` or real secret values. Client Firebase config in `src/lib/firebaseConfig.ts` is OK.

### Deploy from Cloud Agents

Follow the checklist below. Prefer pushing to `main` so GitHub Actions deploys Hosting + Pages. For RTDB rules/config changes only, use the Firebase database deploy command in step 4. Manual Firebase hosting deploy is optional if Actions already ran.

## After finishing work (always)

Before you stop on any meaningful change, do this checklist in order:

1. **Recheck errors first**
   - Run `npm run build` (TypeScript + Vite production build).
   - Fix any type errors, lint issues, or build failures before continuing.
   - Do not commit or push a broken build.

2. **Commit**
   - Stage relevant files and create a git commit with a clear message.
   - This project expects commits after completed work; follow the repo commit style.
   - Never commit secrets (`.env`, credentials). Firebase web config in `src/lib/firebaseConfig.ts` / `firebase-js-config.json` is OK (client config).

3. **Deploy via GitHub Actions**
   - Push the commit to `main` (`git push`) so `.github/workflows/deploy.yml` runs.
   - Every push deploys to **both**:
     - Firebase Hosting (primary / reliable): https://secret-timeloop-2026.web.app/
     - GitHub Pages via `gh-pages` branch (kept trying): https://pepsealsea.github.io/TheSecretTimeLoop/
   - If push fails, fix the issue and push again; do not leave local-only commits when deploy was expected.

4. **Update Firebase RTDB when needed**
   - If `database.rules.json`, `firebase.json` (database section), or other Firebase config changed, deploy with:
     ```bash
     npx -y firebase-tools@latest deploy --only database --project secret-timeloop-2026
     ```
   - Hosting is deployed by GitHub Actions on push to `main` (Firebase + Pages).
   - For a manual Firebase hosting deploy: `npx -y firebase-tools@latest deploy --only hosting --project secret-timeloop-2026`
   - Skip database deploy when only the React/Vite app changed and RTDB rules/config are untouched.

## Order (mandatory)

```
recheck errors → commit → push (Firebase Hosting + GitHub Pages) → Firebase database deploy (if applicable)
```

Do not push before the build is clean. Do not skip Firebase database deploy when rules/config changed.

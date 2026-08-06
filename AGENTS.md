# AGENTS.md

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
   - Push the commit to `main` (`git push`) so `.github/workflows/deploy.yml` runs and deploys to Firebase Hosting.
   - If push fails, fix the issue and push again; do not leave local-only commits when deploy was expected.
   - Live site: https://secret-timeloop-2026.web.app/

4. **Update Firebase RTDB when needed**
   - If `database.rules.json`, `firebase.json` (database section), or other Firebase config changed, deploy with:
     ```bash
     npx -y firebase-tools@latest deploy --only database --project secret-timeloop-2026
     ```
   - Hosting is deployed by GitHub Actions on push to `main`.
   - For a manual hosting deploy: `npx -y firebase-tools@latest deploy --only hosting --project secret-timeloop-2026`
   - Skip database deploy when only the React/Vite app changed and RTDB rules/config are untouched.

## Order (mandatory)

```
recheck errors → commit → push (GitHub Actions / Firebase Hosting) → Firebase database deploy (if applicable)
```

Do not push before the build is clean. Do not skip Firebase database deploy when rules/config changed.

# Kroo development handoff (Codex memory)

Last reviewed: 2026-08-27  
Repository: `https://github.com/Joshep-ai-dev/Stampo.git`  
Active branch: `feature-dev`  
Reviewed commit: `7357a03` (`review update`)  
Working tree at review time: clean before this document was added

This file is the durable context for continuing development on another computer. It deliberately contains no secret values.

## Project at a glance

Kroo (the repository and native identifiers still use the older name **Stampo**) is a travel passport app built with Expo SDK 54, React Native, TypeScript, Expo Router, and Redux Toolkit. Users can track visits, browse countries/cities/sights, complete attractions and collections, compare leaderboard progress, add friends, receive arrival suggestions, and purchase Kroo+ through RevenueCat.

The checked-out repository is currently the **mobile/frontend repository only**. It consumes a versioned HTTP API whose base URL is configured with `EXPO_PUBLIC_API_URL` and defaults in code to `http://localhost:8000/api/v1`.

Important naming that has not yet been normalized:

- Product/UI name: `Kroo`
- GitHub repository and Expo slug: `Stampo`
- iOS bundle ID and Android package: `com.darkhorse9372.Stampo`
- Redux persistence key: `stampo.app-state.v1`

## Current technology baseline

- Expo `~54.0.37`
- React Native `0.81.5`
- React `19.1.0`
- React Native Web `~0.21.0`
- Expo Router `~6.0.24` with typed routes
- TypeScript `~5.9.2`
- Redux Toolkit + React Redux
- AsyncStorage for persisted application state
- Expo SecureStore for the bearer token
- RevenueCat (`react-native-purchases` and `react-native-purchases-ui`) for Kroo+
- Expo Location, Task Manager, Notifications, Camera, and Image Picker

Expo SDK 54 requires Node.js 20.19.x or newer and targets React Native 0.81 / React 19.1. Keep all Expo package changes aligned with the exact SDK 54 documentation at `https://docs.expo.dev/versions/v54.0.0/`; use `npx expo install` for Expo-managed packages.

## Frontend architecture

### Routing

`app/_layout.tsx` loads fonts, hydrates Redux, initializes background arrival monitoring, mounts subscription synchronization, and owns the root stack.

Main tab routes:

- `app/(tabs)/index.tsx` — home dashboard, scores, recent/highlight content
- `app/(tabs)/explore.tsx` — travel discovery and country exploration
- `app/(tabs)/community.tsx` — global/friends leaderboard
- `app/(tabs)/visits.tsx` — visit history and visit management
- `app/(tabs)/passport.tsx` — passport, stamps, statistics, and country navigation

Stack/detail routes:

- `app/country/[code].tsx`
- `app/city/[id].tsx`
- `app/sight/[id].tsx`
- `app/collection/[id].tsx`
- `app/country-atlas.tsx`
- `app/profile.tsx`
- `app/add-friends.tsx`
- `app/kroo-plus.tsx`
- `app/gift-kroo-plus.tsx`

### State and persistence

`store/index.ts` combines five slices:

- `travel` — visits, completed sights, wishlist, rewards, challenge points, collection progress
- `profile` — authentication and profile details
- `dashboard` — calculated home data
- `countryDetail` — cached remote country/catalog data
- `subscription` — Kroo+ entitlement/customer state

The store hydrates local data first and then attempts server reconciliation. A temporary network failure intentionally preserves the local session. The entire Redux state is serialized to AsyncStorage after initialization. The auth token is kept separately in SecureStore.

### API boundary

`services/api.ts` is the frontend contract/adapter. It:

- prefixes requests with `EXPO_PUBLIC_API_URL`;
- attaches the bearer token;
- converts server error payloads into `ApiError`;
- normalizes backend city, sight, country, collection, and leaderboard payloads;
- polls while country catalog enrichment is in progress;
- exposes authentication, profile, visits, travel-state, dashboard, catalog, community, friends, and collection operations.

The current API family is `/api/v1`, including frontend paths such as `/catalog/countries/:code`. Relative image paths are resolved against the API origin.

### Device/native services

- `services/arrival-monitoring.ts` and `services/gps-verification.ts` implement location-based visit verification and background arrival suggestions.
- `services/subscriptions.ts` wraps RevenueCat paywalls, restore, customer center, and entitlement checks.
- `components/subscription-sync.tsx` keeps the Redux subscription state synchronized with RevenueCat.
- Camera permission is used for friend QR scanning; image picker/camera permission is used for profile photos.

Because the app includes native RevenueCat and background-location behavior, Expo Go is not sufficient for all production behavior. Use a development build when testing those paths.

## Backend status — critical handoff note

There is **no backend implementation on `feature-dev`**.

Commit `4a252ae` (`leadership`, 2026-08-25) deleted the former Node/TinyHTTP/LowDB backend:

- `server/index.mjs`
- `server/providers.mjs`
- `server/lib/catalog.mjs`
- `server/lib/http.mjs`
- `server/admin.html`
- `server/db.json`

The old implementation is still present in Git history and on `origin/main`, `origin/v2`, and `origin/feature`. It can be inspected without changing branches, for example:

```bash
git show origin/main:server/index.mjs
git ls-tree -r --name-only origin/main server
```

Do not restore that backend blindly. The current frontend was changed to consume a newer `/api/v1` contract, and `.env.example` describes the backend as Laravel. The actual Laravel/backend repository, deployment instructions, database migration/seed process, queue/scheduler setup, and server test commands are not present here. Obtain and clone that repository separately when moving computers.

`README.md`, `docs/backend-api.md`, the `npm run server` script, importer scripts, and tests still describe/import the deleted Node backend. They are stale and currently misleading.

## Review findings and known risks

### Highest priority

1. **Backend is missing from this repository.** A fresh clone cannot run the documented local full stack.
2. **Tests are broken by the backend deletion.** `npm test` fails before running assertions because `server/providers.mjs` and `server/lib/catalog.mjs` do not exist.
3. **`.env` is tracked by Git.** It contains configured API/import/subscription values. Even public mobile SDK keys should be managed deliberately, and backend credentials must not live in frontend Git history. Rotate any private credentials that have been committed, stop tracking `.env`, add `.env` to `.gitignore`, and keep only sanitized placeholders in `.env.example`.
4. **Documentation contradicts the code.** README/API docs say the backend is a local server at port 3001, while `services/api.ts` defaults to port 8000 under `/api/v1`, and EAS preview/production use `https://krootravel.com/api/v1`.

### Maintainability and release risks

- The product is partly renamed from Stampo to Kroo; identifiers and persistence keys need a deliberate migration plan rather than ad-hoc replacement.
- `services/api.ts` is a large, central contract file. Changes should be checked against the real backend response schema.
- Redux persistence writes the whole state on every store update. Large country caches can increase storage/write cost; consider selective/debounced persistence.
- Background location, notifications, RevenueCat, deep links, and camera flows require real-device/development-build verification. Passing TypeScript is not enough.
- The repository contains many large PNG stamps plus a 5 MB city CSV. Clone/build size and asset memory should be monitored; image optimization may be worthwhile.
- There is no CI configuration visible in this checkout. Add lint, TypeScript, tests, and an Expo configuration/dependency check once the test ownership is resolved.

## Validation snapshot (2026-08-27)

Run from commit `7357a03` with Node `24.15.0`:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | Expo ESLint completed with no reported violations |
| `npx tsc --noEmit` | Pass | No TypeScript errors |
| `npx expo install --check` | Pass with limitation | Local SDK map says dependencies match; network was disabled, so Expo warned validation was less reliable |
| `npm test` | Fail | Two test files cannot import deleted `server/` modules; 0 tests pass, 2 files fail to load |

No end-to-end backend, Android, iOS, RevenueCat, or real-device location test was performed during this review.

## Recent development history

The active work is on `feature-dev`. Recent commits are terse, so the file changes provide the best available history:

- `7357a03` — latest review/UI update: tab layout, collection detail, country detail, passport-back asset
- `d9a3c35` — home/country UI and API adapter update; app icon update
- `f542374`, `ebf4d8a` — homepage refinement and fixes; collection/country/subscription UI integration
- `3a9438f`, `6b30d6f` — detail modal, travel state, passport/country/collection UI, travel statistics
- `0855474` — stamp updates and zoom-related fixes across explore, home, passport, collections, and country detail
- `94d3b76` — explore and collection/catalog integration
- `3366bd7` — local-data and visit-flow updates
- `037bb66`, `d3a5129`, `063475a` — community, passport, collection, country, API, and store review updates
- `4a252ae` — removed the former Node backend and website from this branch

Branch state at handoff:

- `feature-dev` tracks `origin/feature-dev` and was synchronized at `7357a03` before this file
- local `main` is behind `origin/main`
- local `v2` has diverged from `origin/v2`
- do not merge or reset branches merely to recover the old backend; first confirm where the current Laravel backend lives

## Moving to another computer

### 1. Preserve current work

On this computer, commit and push this handoff and any intended source changes:

```bash
git status
git add codex.md
git commit -m "docs: add development handoff"
git push origin feature-dev
```

Review `git status` before committing. Do not add generated folders, local build output, credentials, or machine-specific files.

### 2. Clone and install

On the new computer:

```bash
git clone https://github.com/Joshep-ai-dev/Stampo.git Kroo
cd Kroo
git switch feature-dev
node --version
npm ci
```

Use Node 20.19 or newer. Node 20 LTS is the conservative Expo SDK 54 choice.

### 3. Recreate environment configuration

Do not copy secrets through Git or paste them into this document. Transfer them through a password manager or secret manager and create a local `.env` from `.env.example`.

Frontend variables currently expected:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- optional `EXPO_PUBLIC_GIFT_CHECKOUT_URL` (used by gift flow but missing from `.env.example` at review time)

The import credentials and pacing variables in `.env.example` belong with the backend/importer environment, not a distributed frontend environment:

- `RESTCOUNTRIES_API_KEY`
- `GEONAMES_USERNAME`
- `IMPORT_BATCH_SIZE`
- `IMPORT_DELAY_MS`

For a physical phone, `localhost` means the phone itself. Use a backend URL/IP reachable from the phone. Production/preview EAS profiles currently point to `https://krootravel.com/api/v1`.

### 4. Restore external services and native tooling

The Git clone alone does not transfer account access. Confirm access to:

- Expo/EAS project `46f28005-a7f2-4ebd-8725-c96863062837`
- Apple Developer / App Store Connect for `com.darkhorse9372.Stampo`
- Google Play Console for `com.darkhorse9372.Stampo`
- RevenueCat project, entitlement `kroo_plus`, offering, products, and Customer Center
- deployed API/domain and the separate Laravel backend repository
- backend database, storage, queue/scheduler, and any provider credentials

Use `eas login` (or an organization token in CI) and verify project ownership before creating builds. Do not commit signing credentials.

### 5. Verify the new machine

```bash
npm run lint
npx tsc --noEmit
npx expo install --check
npx expo start --clear
```

`npm test` will remain broken until the obsolete backend tests are removed/moved or the appropriate historical backend is restored intentionally.

Then test on a development build/real device:

- sign up, sign in, session restore, and sign out
- profile image and profile edits
- country, city, sight, and collection loading
- visits and GPS verification
- background arrival suggestion and notifications
- global/friends leaderboard and QR friend flow
- Kroo+ paywall, purchase, restore, and Customer Center
- cold start/offline state followed by server reconciliation

## Recommended next work

1. Locate and document the current Laravel backend repository and its exact deployment/database setup.
2. Remove `.env` from tracking, rotate committed private credentials, and update `.gitignore` safely.
3. Rewrite `README.md` and `docs/backend-api.md` for the real `/api/v1` backend.
4. Move or replace the obsolete Node-backend tests so `npm test` is meaningful again.
5. Add `EXPO_PUBLIC_GIFT_CHECKOUT_URL` to `.env.example` if gift subscriptions remain supported.
6. Add CI for lint, TypeScript, tests, and Expo dependency/config validation.
7. Perform a real-device release checklist for location, notifications, deep links, and RevenueCat.

## Instructions for the next Codex session

Start by reading, in order:

1. `AGENTS.md`
2. this `codex.md`
3. `package.json`, `app.json`, and `eas.json`
4. `services/api.ts` and the relevant route/slice for the task

Before writing Expo code, read the exact SDK 54 documentation at `https://docs.expo.dev/versions/v54.0.0/` as required by `AGENTS.md`.

Do not assume `docs/backend-api.md` describes the deployed backend. Confirm API behavior against the current Laravel source or a documented/staging endpoint. Preserve unrelated working-tree changes, never expose `.env` values, and update this file after substantial architecture, environment, deployment, or feature changes so it remains the project memory.

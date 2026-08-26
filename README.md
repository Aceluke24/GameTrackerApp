# Game Vault 🎮

Your personal game backlog tracker — a desktop app built with Electron + React + Supabase, with your own account and library synced across every device you install it on.

## Features

### Accounts & Sync
- Sign up / sign in with email + password, powered by Supabase Auth — shown as a tabbed toggle so it's clear at a glance which mode you're in
- Confirming your email brings you straight back into the app via deep link (`gamevault://`), not a dead browser tab
- "Forgot password?" on the Sign In tab sends a reset email — clicking it deep-links back into the app to a dedicated "set a new password" screen (with a "Skip and Sign In" option if you'd rather not change it after all)
- Change your password any time from Settings, without needing the email flow
- Each account's library is private, enforced by Postgres Row Level Security (not just app-level filtering)
- Your library syncs across every device you're signed into — no more per-device local database
- Logging in always lands on the games view, regardless of which page you were on when you last signed out
- Errors and confirmations use in-app toasts and dialogs instead of native browser popups, with plain-language wording for common cases (wrong password, reusing your old password, duplicate accounts, etc.) instead of raw technical error text
- A persistent banner appears whenever you're offline or Supabase/IGDB can't be reached, and clears itself automatically once you're back — every network call has a timeout so a bad connection fails fast instead of hanging

### Game Tracking
- Duplicate detection warns before adding a game that's already in your vault, whether added manually or via Steam import
- Bulk add — pick one console, paste a list of game names (one per line or comma-separated), and each is matched against IGDB automatically. A results summary afterward shows what was added vs. skipped (already in your vault, duplicated in the list, blank lines) or couldn't be matched on IGDB
- Track games by status — 12 editable slots per account (label + emoji, edited in place via an "Edit Statuses" popup below the sidebar's status list), seeded with the defaults (Backlog, Playing, Finished, Play Again, Abandoned, Wishlist, Live Service). Backlog can't be cleared since it's the fallback other slots' games fall back to when cleared.
- Multi-select mode — tap games individually or hit "Select All" to grab everything currently shown (respects the active search/filter, e.g. search "Switch" then Select All to grab just those), then bulk-update status, bulk-update platform, or delete them all at once
- Search by title, platform, or genre — one search bar, no separate filter UI
- Sort by title, time-to-beat, or recently added, plus a quick time-range filter (under/over X hours) — both live in the grid header, which stays pinned to the top as you scroll
- Pin a game to the top of the list with the 🔥 marker on its card — pinned games get a "Next Up" badge and amber highlight so they're easy to spot; only applies to the default Title (A–Z) sort with no active search, so it doesn't fight an explicit sort or search
- Editable genre tags per game, picked from a curated list matching IGDB's taxonomy
- Stats dashboard — backlog time remaining, completion rate, genre/platform breakdown, a random "what to play" recommendation

### Steam & IGDB Integration
- Steam library import, enriched with HowLongToBeat completion times via IGDB — each account uses its own Steam API key + Steam ID (entered via a popup on Import, saved to Settings for next time), never one shared key
- Shared IGDB metadata cache — completion-time/rating lookups are cached in Supabase and reused across all users, so the same game isn't re-fetched from IGDB every time someone adds it
- IGDB access tokens auto-refresh in the background — no manual token regeneration every ~60 days
- Steam import and bulk add both end with a results summary (added / already in vault / couldn't match / failed) instead of a single toast — and a failure partway through a batch no longer drops the games that already saved successfully

### Settings & Customization
- Settings page — account info, change password, sign out, account deletion, delete-all, and appearance controls
- Export your library as JSON or CSV — a personal backup independent of your Supabase account
- Light/dark mode, plus independent Main (background) and Accent color pickers (5 x 6 presets, hand-tuned for both modes)

## Stack
- **Electron** — desktop shell (packages to .exe / .dmg / .AppImage)
- **React + Vite** — frontend UI
- **Supabase** — hosted Postgres database + Auth (accounts, per-user data via Row Level Security)
- **IGDB API** — game search, cover art, time to beat data

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Get your IGDB API keys (free)
1. Go to https://dev.twitch.tv/console → create an app
2. Copy your **Client ID** and **Client Secret**
3. Copy `.env.example` to `.env` and paste both values in:
```bash
cp .env.example .env
```
The app fetches and auto-refreshes its own IGDB access token using these —
no manual token generation, and `.env` is gitignored so the secret never
gets committed.

### 3. Set up Supabase (free tier)
1. Create a project at https://supabase.com/dashboard
2. From the project's **Connect** dialog, grab your **Project URL** and **anon/publishable key**, and add them to `.env` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. Run the schema against your project (creates the `games`, `igdb_cache`, and `user_settings` tables, Row Level Security policies, table grants, and a self-service account-deletion function):
```bash
psql "<your Postgres connection string from Connect → Session pooler>" -f supabase/migrations/0001_init.sql
psql "<same connection string>" -f supabase/migrations/0002_grants.sql
psql "<same connection string>" -f supabase/migrations/0003_delete_own_account.sql
psql "<same connection string>" -f supabase/migrations/0004_user_settings.sql
psql "<same connection string>" -f supabase/migrations/0005_next_up.sql
psql "<same connection string>" -f supabase/migrations/0006_user_statuses.sql
```
   (Only needed once per Supabase project — not required for every developer machine, just whoever's setting up that project.)
4. In the dashboard, go to **Authentication → URL Configuration → Redirect URLs** and add `gamevault://auth-callback`. This is what lets the "Confirm your email" link bring you back into the app directly (see Deep Linking below) instead of a dead browser tab.

### 4. (Optional) Get your Steam API key
Not required for setup — each user pastes their own key + Steam ID into the app itself (via the popup on Settings → Import Steam), which links directly to https://steamcommunity.com/dev/apikey and https://store.steampowered.com/account/ to help you find both.

---

## Running

### Development (browser preview, no Electron)
```bash
npx vite
# Open http://localhost:5173
# Note: no auth/sync without Electron — falls back to mock data
```

### Development (full Electron app)
```bash
npm run dev
```

### Build a distributable installer
```bash
npm run dist
# Output goes to /release folder
# Windows: .exe installer
# Mac: .dmg
# Linux: .AppImage
```

---

## Project Structure

```
game-vault/
├── electron/
│   ├── main.js          ← Electron entry point, window creation, IPC handlers
│   ├── preload.js       ← Secure bridge between React and Node.js
│   ├── database.js      ← All Supabase queries (games, IGDB cache, user settings) live here
│   ├── auth.js          ← Supabase Auth wrapper (sign up/in/out, session)
│   ├── supabaseClient.js ← Main-process-only Supabase client
│   └── secureStore.js   ← Encrypted local store — auth session + cached IGDB token
├── supabase/
│   └── migrations/       ← SQL schema, RLS policies, and grants (run once per project)
├── build/
│   └── icon.png        ← Source app icon for electron-builder
├── public/
│   └── icons8-*.png     ← App icon (favicon, dock/window icon)
├── src/
│   ├── api/
│   │   ├── igdb.js       ← IGDB game search + time to beat, with cache read-through
│   │   ├── steam.js      ← Steam library import
│   │   └── errors.js     ← Strips Electron's IPC error boilerplate for display
│   ├── components/
│   │   ├── TitleBar        ← Custom window title bar
│   │   ├── Sidebar         ← Navigation + status filters
│   │   ├── GameGrid        ← Main game card grid + search bar
│   │   ├── LoginPage        ← Sign up / sign in screen + forgot password
│   │   ├── ResetPasswordPage ← Set a new password after clicking the recovery link
│   │   ├── AddGameModal     ← Search IGDB + add game
│   │   ├── BulkAddModal     ← Add many games at once by console + name list, matched via IGDB
│   │   ├── BulkResultsModal ← Shared added/skipped/failed summary for bulk add + Steam import
│   │   ├── GameDetailModal  ← View/edit game details + genres
│   │   ├── SteamImportModal ← Per-user Steam credentials + import trigger
│   │   ├── ChangePasswordModal ← Change password from Settings
│   │   ├── Toast            ← In-app success/error notifications
│   │   ├── ConfirmDialog    ← In-app replacement for native confirm()
│   │   ├── StatsPage        ← Backlog stats + recommendation
│   │   └── SettingsPage     ← Account, password, account deletion, delete-all, theme/color pickers
│   ├── App.jsx         ← Root component, auth gating, state management
│   ├── theme.js        ← Main/Accent color presets
│   └── styles.css      ← Global CSS variables + base styles
├── index.html
├── vite.config.js
└── package.json
```

---

## Deep Linking
Confirming your email brings you straight back into the running app via a custom `gamevault://` URL
scheme, instead of leaving you on a browser tab. `electron/main.js` registers the scheme (automatic for
packaged builds via the `protocols` entry in `package.json`; dev mode needs the app relaunched through
Electron manually, handled there too) and hands off to `electron/auth.js` to establish the session from
the tokens Supabase includes in the redirect.

**Note for dev mode:** `npm run dev` starts a fresh process each time, and OS-level protocol registration
can be flaky against a moving dev binary — if clicking the email link doesn't bring the app to the front,
it's most reliable to test this against a packaged build (`npm run dist`) instead.

---

## Roadmap

### Possible future ideas
- **Price-drop / wishlist tracking** — notify when a Wishlist game drops in price, similar to Opera GX's deal-finder. Needs a new external data source (e.g. CheapShark or IsThereAnyDeal's API) — a genuinely new integration, not an extension of anything already here.
- **Local-only guest mode** — a "Continue without an account" option that falls back to a local SQLite database (no sync, no login), for anyone who'd rather not create an account. Would mean maintaining two parallel data-layer implementations (Supabase + SQLite) and re-adding `better-sqlite3` as a native dependency.
- **Custom SMTP provider for auth emails** — Supabase's default email sender caps out at 2 auth emails/hour (shared across signup, password reset, etc.), which is fine for personal/small-group use but could get annoying. Configuring a provider like Resend or SendGrid in the dashboard raises that limit if it ever becomes a problem.
- **Time-played tracking** — record actual hours played per game, not just HLTB estimates. Steam already returns `playtime_forever` from the same `GetOwnedGames` call the Steam import uses (`api/steam.js`) — it's just discarded today. Would need a `steam_appid` column (to re-query a specific game later) and a `time_played` column, plus something to periodically refresh it — since this is a desktop Electron app rather than an always-on server, "run every night" really means either a Supabase Edge Function + `pg_cron`, or a simpler refresh-on-launch for games in the "Playing" status. Non-Steam platforms (e.g. Switch) don't have an official public API for this — Nintendo does track it, but only unofficial/reverse-engineered APIs expose it, which is fragile and a ToS gray area — so manual entry is the realistic fallback there.

---

## Learning Resources
- [Electron docs](https://www.electronjs.org/docs/latest)
- [IGDB API docs](https://api-docs.igdb.com/)
- [Supabase docs](https://supabase.com/docs)
- [Vite docs](https://vitejs.dev/)

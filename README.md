# Game Vault 🎮

Your personal game backlog tracker — a desktop app built with Electron + React + Supabase, with your own account and library synced across every device you install it on.

## Features

### Accounts & Sync
- Sign up / sign in with email + password, powered by Supabase Auth — shown as a tabbed toggle so it's clear at a glance which mode you're in
- Confirming your email brings you straight back into the app via deep link (`gamevault://`), not a dead browser tab
- Each account's library is private, enforced by Postgres Row Level Security (not just app-level filtering)
- Your library syncs across every device you're signed into — no more per-device local database
- Logging in always lands on the games view, regardless of which page you were on when you last signed out

### Game Tracking
- Track games by status (Backlog, Playing, Finished, Play Again, Abandoned, Wishlist, Live Service)
- Search by title, platform, or genre — one search bar, no separate filter UI
- Editable genre tags per game, picked from a curated list matching IGDB's taxonomy
- Stats dashboard — backlog time remaining, completion rate, genre/platform breakdown, a random "what to play" recommendation

### Steam & IGDB Integration
- Steam library import, enriched with HowLongToBeat completion times via IGDB — each account uses its own Steam API key + Steam ID (entered via a popup on Import, saved to Settings for next time), never one shared key
- Shared IGDB metadata cache — completion-time/rating lookups are cached in Supabase and reused across all users, so the same game isn't re-fetched from IGDB every time someone adds it
- IGDB access tokens auto-refresh in the background — no manual token regeneration every ~60 days

### Settings & Customization
- Settings page — account info, sign out, account deletion, delete-all, and appearance controls
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
│   │   └── steam.js      ← Steam library import
│   ├── components/
│   │   ├── TitleBar        ← Custom window title bar
│   │   ├── Sidebar         ← Navigation + status filters
│   │   ├── GameGrid        ← Main game card grid + search bar
│   │   ├── LoginPage        ← Sign up / sign in screen
│   │   ├── AddGameModal     ← Search IGDB + add game
│   │   ├── GameDetailModal  ← View/edit game details + genres
│   │   ├── SteamImportModal ← Per-user Steam credentials + import trigger
│   │   ├── StatsPage        ← Backlog stats + recommendation
│   │   └── SettingsPage     ← Account, account deletion, delete-all, theme/color pickers
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

### Up next
1. **Password reset** — a "Forgot password" flow. Right now there's no way to recover a forgotten password short of deleting and recreating the account.
2. **Data export/backup** — let a user export their own library (CSV/JSON) as a personal backup, independent of whatever happens to the app's Supabase project.
3. **Duplicate detection on manual "Add Game"** — Steam import already checks for existing titles before importing; the manual add-game search doesn't.
4. **Sorting options** — currently hardcoded to alphabetical (`App.jsx`). Add sort by completion time, rating, and a time-range filter (e.g. "under/over X hours").
5. **"Next Up" queue** — a small marker/checkbox per game that pins it to the top of the list, so it's easy to see what's up next. Only applies to the default view — an active sort or search takes priority over the pin.
6. **Offline/network-failure handling** — a deliberate look at what happens when Supabase or IGDB is unreachable, rather than relying on whatever falls out of the existing try/catch + `alert()` pattern.

### Possible future ideas
- **Price-drop / wishlist tracking** — notify when a Wishlist game drops in price, similar to Opera GX's deal-finder. Needs a new external data source (e.g. CheapShark or IsThereAnyDeal's API) — a genuinely new integration, not an extension of anything already here.
- **Local-only guest mode** — a "Continue without an account" option that falls back to a local SQLite database (no sync, no login), for anyone who'd rather not create an account. Would mean maintaining two parallel data-layer implementations (Supabase + SQLite) and re-adding `better-sqlite3` as a native dependency.

---

## Learning Resources
- [Electron docs](https://www.electronjs.org/docs/latest)
- [IGDB API docs](https://api-docs.igdb.com/)
- [Supabase docs](https://supabase.com/docs)
- [Vite docs](https://vitejs.dev/)

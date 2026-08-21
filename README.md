# Game Vault 🎮

Your personal game backlog tracker — a desktop app built with Electron + React + Supabase, with your own account and library synced across every device you install it on.

## Features
- Accounts — sign up / sign in with email + password, powered by Supabase Auth. Each account's library is private, enforced by Postgres Row Level Security (not just app-level filtering)
- Your library syncs across every device you're signed into — no more per-device local database
- Track games by status (Backlog, Playing, Finished, Play Again, Abandoned, Wishlist, Live Service)
- Search by title, platform, or genre — one search bar, no separate filter UI
- Editable genre tags per game, picked from a curated list matching IGDB's taxonomy
- Stats dashboard — backlog time remaining, completion rate, genre/platform breakdown, a random "what to play" recommendation
- Steam library import, enriched with HowLongToBeat completion times via IGDB
- Shared IGDB metadata cache — completion-time/rating lookups are cached in Supabase and reused across all users, so the same game isn't re-fetched from IGDB every time someone adds it
- IGDB access tokens auto-refresh in the background — no manual token regeneration every ~60 days
- Settings page — account info, sign out, account deletion, Steam import, delete-all, and appearance controls
- Logging in always lands on the games view, regardless of which page you were on when you last signed out
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
3. Run the schema against your project (creates the `games` and `igdb_cache` tables, Row Level Security policies, table grants, and a self-service account-deletion function):
```bash
psql "<your Postgres connection string from Connect → Session pooler>" -f supabase/migrations/0001_init.sql
psql "<same connection string>" -f supabase/migrations/0002_grants.sql
psql "<same connection string>" -f supabase/migrations/0003_delete_own_account.sql
```
   (Only needed once per Supabase project — not required for every developer machine, just whoever's setting up that project.)

### 4. (Optional) Get your Steam API key
1. Go to https://steamcommunity.com/dev/apikey
2. Open `src/api/steam.js` and paste your key + Steam ID

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
│   ├── database.js      ← All Supabase queries (games + IGDB cache) live here
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
│   │   ├── StatsPage        ← Backlog stats + recommendation
│   │   └── SettingsPage     ← Account, Steam import, delete-all, theme/color pickers
│   ├── App.jsx         ← Root component, auth gating, state management
│   ├── theme.js        ← Main/Accent color presets
│   └── styles.css      ← Global CSS variables + base styles
├── index.html
├── vite.config.js
└── package.json
```

---

## Roadmap / known limitations
- **Email confirmation redirect** — Supabase's confirmation email currently links to a blank `localhost` page instead of back into the app; sign-in still works manually afterward, but the redirect needs a proper landing page or deep link.
- **Steam import isn't per-user yet** — the Steam API key and Steam ID are currently hardcoded in `src/api/steam.js` (one personal account), so importing only works for whoever's key is pasted in there. Needs to move into Settings as a per-user input instead.

---

## Learning Resources
- [Electron docs](https://www.electronjs.org/docs/latest)
- [IGDB API docs](https://api-docs.igdb.com/)
- [Supabase docs](https://supabase.com/docs)
- [Vite docs](https://vitejs.dev/)

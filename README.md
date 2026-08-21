# Game Vault 🎮

Your personal game backlog tracker — a desktop app built with Electron + React + SQLite.

## Features
- Track games by status (Backlog, Playing, Finished, Play Again, Abandoned, Wishlist, Live Service)
- Search by title, platform, or genre — one search bar, no separate filter UI
- Editable genre tags per game, picked from a curated list matching IGDB's taxonomy
- Stats dashboard — backlog time remaining, completion rate, genre/platform breakdown, a random "what to play" recommendation
- Steam library import, enriched with HowLongToBeat completion times via IGDB
- Settings page — Steam import, delete-all, and appearance controls
- Light/dark mode, plus independent Main (background) and Accent color pickers (5 x 6 presets, hand-tuned for both modes)

## Stack
- **Electron** — desktop shell (packages to .exe / .dmg / .AppImage)
- **React + Vite** — frontend UI
- **SQLite (better-sqlite3)** — local database, no server needed
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
3. Run this to get an access token:
```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_ID&client_secret=YOUR_SECRET&grant_type=client_credentials"
```
4. Open `src/api/igdb.js` and paste your Client ID and access token

### 3. (Optional) Get your Steam API key
1. Go to https://steamcommunity.com/dev/apikey
2. Open `src/api/steam.js` and paste your key + Steam ID

---

## Running

### Development (browser preview, no Electron)
```bash
npx vite
# Open http://localhost:5173
# Note: game data won't persist without Electron (uses mock data)
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
│   ├── main.js        ← Electron entry point, window creation, IPC handlers
│   ├── preload.js     ← Secure bridge between React and Node.js
│   └── database.js    ← All SQLite queries live here
├── build/
│   └── icon.png        ← Source app icon for electron-builder
├── public/
│   └── icons8-*.png     ← App icon (favicon, dock/window icon)
├── src/
│   ├── api/
│   │   ├── igdb.js       ← IGDB game search + time to beat
│   │   └── steam.js      ← Steam library import
│   ├── components/
│   │   ├── TitleBar        ← Custom window title bar
│   │   ├── Sidebar         ← Navigation + status filters
│   │   ├── GameGrid        ← Main game card grid + search bar
│   │   ├── AddGameModal     ← Search IGDB + add game
│   │   ├── GameDetailModal  ← View/edit game details + genres
│   │   ├── StatsPage        ← Backlog stats + recommendation
│   │   └── SettingsPage     ← Steam import, delete-all, theme/color pickers
│   ├── App.jsx         ← Root component, state management
│   ├── theme.js        ← Main/Accent color presets
│   └── styles.css      ← Global CSS variables + base styles
├── index.html
├── vite.config.js
└── package.json
```

---

## Adding Features (ideas)
- **PSN import**: use the `psn-api` npm package
- **Xbox import**: use the OpenXBL API (https://xbl.io)
- **Export to CSV**: add an IPC handler in `electron/main.js`
- **Auto-refresh IGDB tokens**: store tokens in SQLite, refresh when expired
- **Custom accent colors**: extend `src/theme.js` beyond the preset swatches to a full color picker

---

## Learning Resources
- [Electron docs](https://www.electronjs.org/docs/latest)
- [IGDB API docs](https://api-docs.igdb.com/)
- [better-sqlite3 docs](https://github.com/WiseLibs/better-sqlite3)
- [Vite docs](https://vitejs.dev/)

# VaultLog 🎮

Your personal game backlog tracker — a desktop app built with Electron + React + SQLite.

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
vaultlog/
├── electron/
│   ├── main.js        ← Electron entry point, window creation, IPC handlers
│   ├── preload.js     ← Secure bridge between React and Node.js
│   └── database.js    ← All SQLite queries live here
├── src/
│   ├── api/
│   │   ├── igdb.js    ← IGDB game search + time to beat
│   │   └── steam.js   ← Steam library import
│   ├── components/
│   │   ├── TitleBar   ← Custom window title bar
│   │   ├── Sidebar    ← Navigation + status filters
│   │   ├── GameGrid   ← Main game card grid
│   │   ├── AddGameModal    ← Search IGDB + add game
│   │   └── GameDetailModal ← View/edit game details
│   ├── App.jsx        ← Root component, state management
│   └── styles.css     ← Global CSS variables + base styles
├── index.html
├── vite.config.js
└── package.json
```

---

## Adding Features (ideas)
- **Steam import**: call `importSteamLibrary()` from `src/api/steam.js` — already wired up
- **PSN import**: use the `psn-api` npm package
- **Xbox import**: use the OpenXBL API (https://xbl.io)
- **Stats page**: total hours in backlog, games per platform, completion rate
- **Export to CSV**: add an IPC handler in `electron/main.js`
- **Auto-refresh IGDB tokens**: store tokens in SQLite, refresh when expired

---

## Learning Resources
- [Electron docs](https://www.electronjs.org/docs/latest)
- [IGDB API docs](https://api-docs.igdb.com/)
- [better-sqlite3 docs](https://github.com/WiseLibs/better-sqlite3)
- [Vite docs](https://vitejs.dev/)

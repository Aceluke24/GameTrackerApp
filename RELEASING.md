# Releasing Game Vault

How to cut a new build of the desktop app and get it to people, plus the
background you need when you come back to this after a few months away.

- [Mental model](#mental-model)
- [The release flow](#the-release-flow)
- [Versioning](#versioning)
- [Keeping the installers](#keeping-the-dmg-files)
- [What is baked into a build](#what-is-baked-into-a-build)
- [The Supabase side](#the-supabase-side)
- [Building for Windows / Intel Macs](#building-for-windows--intel-macs)
- [Code signing (currently skipped)](#code-signing-currently-skipped)
- [Gotchas](#gotchas)
- [Troubleshooting](#troubleshooting)
- [Auto-update](#auto-update)

---

## Mental model

There are **three independently deployable things** in this project. Changing
one usually does *not* require redoing the others:

| Thing | Lives | Ship it by | Users get it when |
| --- | --- | --- | --- |
| **The desktop app** | `electron/`, `src/` | `npm run dist` → hand out the `.dmg` | they download and reinstall |
| **The IGDB Edge Function** | `supabase/functions/igdb/` | `supabase functions deploy igdb` | immediately (server-side, all app versions) |
| **The database schema** | `supabase/migrations/` | run the new migration's SQL against the project | immediately |

So: a bug fix in the React UI = new `.dmg` only. A change to how IGDB
lookups work = redeploy the function only (no new `.dmg`). A new column =
run a migration, and usually a new `.dmg` that uses it.

The app talks to **one shared Supabase project** (ref `xqlvducitbenqphuvjch`).
Every installed copy, old or new, points at it.

---

## The release flow

Run everything from the repo root (`~/GameTrackerApp`).

```bash
# 1. Make your changes. Commit them normally — one commit or several.
git add -A
git commit -m "Describe the change"

# 2. (Recommended) Build locally and smoke-test before tagging:
#    - fully quit `npm run dev` first (see Gotchas)
#    - npm run dist  ->  open release/*.dmg, drag to Applications
#    - right-click -> Open the first time (unsigned; see Code signing)
#    - sign in, load your library, search for a game
npm run dist

# 3. Bump the version. This edits package.json's "version", commits that
#    change, and creates a git tag (e.g. v1.1.1) — all in one command.
#    Use "patch" for fixes, "minor" for new features. (See Versioning.)
npm version patch

# 4. Push the commit AND the tag. Pushing the tag is what kicks off the
#    build — GitHub Actions builds macOS, Windows, and Linux installers
#    (see .github/workflows/release.yml).
git push --follow-tags

# 5. Watch the build: repo -> Actions tab. ~10-15 min for all three.

# 6. Finish the release: repo -> Releases. The workflow created a DRAFT
#    release for the tag with all the installers attached. Edit it:
#    - add release notes (what's new + the macOS "right-click -> Open" tip)
#    - leave "pre-release" unchecked, "latest release" checked
#    - click "Publish release"
```

Publishing the release is also what turns it on for auto-update — installed
apps only see published (non-draft) releases.

Local `npm run dist` still works any time for a throwaway test build; it just
doesn't publish anything.

### What the build actually does

`npm run dist` → `npm run build && electron-builder` (local, no upload)
`npm run release` → same, plus `--publish always` — a manual fallback for
publishing from your own machine if CI is unavailable.

1. `npm run build` → `vite build` bundles `src/` (the React UI) into `dist/`.
2. `electron-builder` wraps `dist/` + `electron/` + `node_modules/` into the
   app and packages it — `.dmg` + `.zip` on macOS, `.exe` on Windows,
   `.AppImage` on Linux — into `release/`, alongside `latest*.yml`
   update-metadata files.

Normally you don't run either of these for a release — CI does it (below).

Config for step 2 is the `"build"` block in `package.json`:

- `appId`: `com.aceluke24.gamevault` — the macOS bundle identifier. **Keep it
  stable forever.** Changing it makes macOS treat every build as a brand-new
  app (new data folder, new keychain identity → everyone logged out).
- `productName`: `Game Vault` — the display name.
- `directories.output`: `release` — where builds land.
- `mac.identity: null` — disables code signing (see that section).
- icons are generated automatically from `build/icon.png` (1024×1024).

### CI build (GitHub Actions)

[`.github/workflows/release.yml`](.github/workflows/release.yml) runs on every
`v*.*.*` tag push (or manually from the Actions tab). Three stages:

1. **test** — runs `npm test` on Linux. If a unit test fails, the build
   never starts (no point spending macOS runner minutes on a broken tree).
2. **build** — one job per OS builds its installers and uploads them as
   workflow artifacts. No job touches the GitHub Release.
3. **release** — one job downloads all the artifacts and creates a single
   **draft** GitHub Release for the tag.

Every job reads its Node version from [`.nvmrc`](.nvmrc) (currently 24), so
CI and your machine stay on the same version — run `nvm use` in the repo to
match it locally.

The single-release-job design is deliberate: an earlier version had each
build job publish directly, and parallel jobs raced to create the release —
producing two or three duplicate drafts. If you ever see duplicate drafts,
that regressed.

**Cost (private repo):** GitHub gives 2,000 Actions minutes/month free, but
macOS runners bill **10×** (Windows 2×, Linux 1×). A full build is roughly
~100 billed minutes, so ~20 releases/month before hitting the cap. Making the
repo public removes the limit entirely.

### Housekeeping

Local `release/` keeps old-version installers from previous builds — it is
**not** cleaned automatically. Either wipe it before a build (`rm -rf release
&& npm run dist`) or ignore the clutter. `release/` is gitignored — never
commit build output. CI runners are always clean, so this only affects local
builds.

---

## Versioning

The version in `package.json` is the single source of truth. `npm version`
bumps it, commits, and tags.

| Command | 1.2.3 → | Use for |
| --- | --- | --- |
| `npm version patch` | 1.2.**4** | bug fixes, tiny tweaks |
| `npm version minor` | 1.**3**.0 | new features, still backward-compatible |
| `npm version major` | **2**.0.0 | big rewrites, breaking changes |

For a solo app: `patch` for fixes, `minor` for features. Don't overthink it.

**Why bump every release:** electron-builder names the file from the version
(`Game Vault-1.0.1-arm64.dmg`). If you don't bump, every build overwrites
`Game Vault-1.0.0-arm64.dmg` and nobody — including you, three weeks later
debugging someone's problem — can tell which build they're running. It's
also a hard requirement for auto-update later (versions must increase).

**The git tag is your real version control for releases.** To rebuild any
past version exactly:

```bash
git checkout v1.0.1
npm run dist
git checkout main
```

---

## Keeping the .dmg files

**Do not put `.dmg` files in git.** They're build artifacts — they bloat the
repo and can be regenerated from a tag. Git versions the *source*.

**But do keep the actual built files somewhere**, because:

- Rebuilding from a tag *usually* works, but "it definitely worked when I
  shipped it" is worth having on disk.
- If a new version breaks for someone, you want to hand them the previous
  one *right now*, not after a rebuild.

Recommendation:

- **Minimum:** keep the current release + the previous known-good one.
- **Better:** keep every version you actually gave to anyone. ~117 MB each;
  a dozen releases ≈ 1.4 GB. Put them in `~/GameVault-releases/` or a cloud
  drive folder. electron-builder names them by version, so the folder
  self-documents.

Keep a one-line note per release (a `NOTES.txt` in that folder is fine):
what changed, and whether it needed a function redeploy or a migration.

Since CI publishes the installers to GitHub Releases, "keeping them" is
mostly automatic now — every published release keeps its attached files
forever. The local `~/GameVault-releases/` folder is a convenience for
grabbing the *previous* version fast when something breaks.

---

## What is baked into a build

A packaged app has **no `.env` file**. These values are compiled in instead:

- **Supabase URL + publishable key** — hardcoded in
  [`electron/config.js`](electron/config.js). Safe to ship: the publishable
  key is designed to be public, and Row Level Security is what actually
  protects each user's data. `electron/config.js` reads `process.env` first
  (so your local `.env` still wins in `npm run dev`) and falls back to the
  baked-in production values.

Things that are **NOT** in the build:

- **The Twitch / IGDB client secret** — server-side only, as a secret on the
  `igdb` Edge Function. See the next section.
- Your `.env` file — not in the `files` list, never packaged.

If you ever move to a different Supabase project, update `electron/config.js`
and cut a new build.

---

## The Supabase side

### The IGDB Edge Function

IGDB lookups go: **app → Edge Function → IGDB**. The function holds the
Twitch client secret and mints the IGDB access token server-side. It's
`verify_jwt`-protected, so only signed-in Game Vault users can call it.

You only redeploy it when you change **the function's own code**
(`supabase/functions/igdb/`):

```bash
supabase functions deploy igdb
```

Examples that need a redeploy: adding an IGDB endpoint to the allowlist in
[`index.ts`](supabase/functions/igdb/index.ts), changing retry/caching
logic. Examples that don't: anything in the React UI or Electron code, or
rotating the Twitch secret (that's `supabase secrets set`, and the function
reads it fresh).

The function is independent of the app version — fix a bug in it and every
installed copy gets the fix immediately.

To change the Twitch credentials:

```bash
supabase secrets set IGDB_CLIENT_ID=<id> IGDB_CLIENT_SECRET=<secret>
```

### Database migrations

Schema changes are `.sql` files in `supabase/migrations/`, numbered in
order. To apply a new one to the shared project:

```bash
psql "<Postgres connection string from Supabase → Connect → Session pooler>" -f supabase/migrations/000N_whatever.sql
```

Run each migration **once per project**. There's no automatic runner — it's
manual. Keep migrations forward-only (new file per change; don't edit old
ones that have already been applied).

### Auth emails (do this before real distribution)

Supabase's built-in email sender is capped at **2 auth emails per hour,
total** across all users. Real signups will silently hit this. Fix: add a
provider (Resend, free tier) in the dashboard under
**Authentication → Emails → SMTP Settings**.

---

## Building for Windows / Intel Macs

**CI already builds Windows (`.exe`) and Linux (`.AppImage`)** on every tag —
that's the whole point of the GitHub Actions workflow. You don't need a
Windows machine.

A local `npm run dist` on your Mac only builds for the Mac it's running on
(currently Apple Silicon / arm64). That's fine — local builds are just for
your own quick testing; the real cross-platform installers come from CI.

**Intel Macs:** the CI `macos-latest` runner is Apple Silicon, so it
produces an arm64 build. To also cover Intel Macs, change `mac` in
`package.json` to `"target": { "target": ["dmg", "zip"], "arch": ["arm64",
"x64"] }` — CI will then produce both. Skip it unless a friend has a
pre-2021 Mac.

---

## Code signing (currently skipped)

`mac.identity: null` means builds are **not signed or notarized**. Effect on
users:

- **macOS:** first launch is blocked. They must **right-click the app →
  Open → Open** (plain double-click gives no override button). After that it
  runs normally. A `.dmg` downloaded via a browser also gets a
  quarantine flag that makes this worse; `curl`/AirDrop is cleaner.
- **Windows:** SmartScreen shows "Windows protected your PC" → **More info →
  Run anyway**.

To remove the warnings later you need:

- **macOS:** an Apple Developer account ($99/yr), then set `mac.identity` and
  add notarization config.
- **Windows:** a code-signing certificate (~$100–400/yr).

Fine to skip for friends-and-family. Worth doing before any wider release.

**Also:** because the app is unsigned, each new build can get a different
ad-hoc signature, and macOS may not let the new build decrypt the previous
build's saved login (`secure-store.bin`). Result: users may have to sign in
again after updating. Signing fixes this too.

---

## Gotchas

### Quit `npm run dev` before opening the installed app

Both the dev app and the installed app use the same data folder
(`~/Library/Application Support/vaultlog`) and Electron's
single-instance lock is keyed to it. If `npm run dev` is running, launching
the installed **Game Vault** makes it immediately quit — no window, no
error. Fully stop dev first:

```bash
# Ctrl-C in the dev terminal, then confirm nothing lingers:
pgrep -fl "GameTrackerApp/node_modules/electron"   # should print nothing
```

Running two copies against the same saved login can also trip Supabase's
refresh-token reuse detection and revoke your session (you'll get logged
out and have to sign back in).

### `npm version` needs a clean working tree

Commit (or stash) everything first, or it errors out.

### The installed app is not updated by `npm run dist`

`npm run dist` only writes to `release/` in the repo. `/Applications/Game
Vault.app` stays on the old version until you open the new `.dmg` and drag
it over.

### User data survives everything

`~/Library/Application Support/vaultlog` (login session + a leftover
`games.db` from the old local-storage era) is independent of the app binary.
Reinstalling, rebuilding, or deleting the app doesn't touch it. The real
library lives in Supabase anyway.

---

## Troubleshooting

**Blank white window on launch (packaged app).**
`isDev` resolved wrong and it's trying to load the dev server. It should key
off `!app.isPackaged` in [`electron/main.js`](electron/main.js). Confirm
that, rebuild.

**"All my games are gone" + a JWT/JWS error, fixed by signing out and back
in.**
A stale login token that the silent refresh couldn't recover. The app is
supposed to detect this and drop to the login screen on its own (see
`query()` in [`electron/database.js`](electron/database.js) and
`onSessionExpired` in [`src/App.jsx`](src/App.jsx)). If it's happening
repeatedly, you're probably running two copies of the app against one saved
login — see Gotchas.

**App opens once, then won't reopen.**
Check for a running or stuck Electron process holding the single-instance
lock:

```bash
pgrep -fl -i "game vault\|GameTrackerApp/node_modules/electron"
```

Kill any strays, try again.

**IGDB search fails in the app but the app otherwise works.**
The Edge Function is unreachable or erroring. Check its logs:

```bash
supabase functions logs igdb
```

And confirm the secrets are set: `supabase secrets list`.

**`supabase` commands say "Access token not provided."**
Run `supabase login`.

---

## Auto-update

`electron-updater` is wired into [`electron/main.js`](electron/main.js)
(`checkForUpdates()`): a packaged app checks the GitHub Releases for a newer
version on launch, downloads it in the background, and installs it on next
quit. Config comes from the `build.publish` block in `package.json`.

**It is not fully active yet.** Two things gate it:

1. **Repo is private.** Release assets on a private repo can't be downloaded
   without a token, and shipping a token inside the app is a bad idea. The
   update check fails and is caught/ignored. **It starts working the moment
   you make the repo public — no code change.**
2. **macOS needs code signing.** macOS refuses to install a self-downloaded
   update unless the app is signed (see Code signing). So once the repo is
   public, **Windows and Linux users get auto-update; Mac users keep
   downloading the `.dmg`** until there's an Apple Developer certificate.

Auto-update only sees **published** (non-draft, non-pre-release) releases,
and needs versions to only ever increase — `npm version` guarantees that.

### Making the repo public (when ready)

1. Repo → **Settings → General → Danger Zone → Change repository visibility
   → Make public**.
2. Nothing else to change — `build.publish` and the workflow already point
   at `Aceluke24/GameTrackerApp`.
3. Verify: next release, install it, then publish a newer release and
   confirm a Windows install picks it up.

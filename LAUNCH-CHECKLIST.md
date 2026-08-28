# Launch checklist

The remaining work to hand Game Vault to other people. Do steps 1 and 2.
Steps 3–5 are "when you need them." Delete this file once you're done.

Run all commands from `~/GameTrackerApp`.

---

## Step 1 — Handle signup emails

**The problem:** Supabase's built-in email sender allows only **2 emails per
hour, total, across all users**. With email confirmation on, if a few
friends sign up around the same time, some won't get their confirmation
link and can't finish.

Pick **one** of these:

### Option A — Turn off email confirmation (simplest, recommended for a friends app)

1. Go to https://supabase.com/dashboard/project/xqlvducitbenqphuvjch/auth/providers
2. Under **Email**, turn **off** "Confirm email".
3. Click **Save**.

Result: signing up logs the person straight in, no email involved. The app
already handles this — no code change needed.

- [ ] Done

### Option B — Add a real email provider (keep confirmation, verified emails)

1. Make a free account at https://resend.com
2. In Resend, add and verify a domain (or use their test domain to start).
3. Create an API key in Resend.
4. Go to https://supabase.com/dashboard/project/xqlvducitbenqphuvjch/settings/auth
5. Scroll to **SMTP Settings** → enable **Custom SMTP** and fill in:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your Resend API key
   - Sender email / name: whatever you want it to say
6. Click **Save**.

- [ ] Done

---

## Step 2 — Build the version you'll share

The `.dmg` currently in `release/` is old and missing the session-refresh
fix. Build a fresh one.

1. Make sure everything's committed and `npm run dev` is **fully stopped**:
   ```bash
   git status                                        # should say "working tree clean"
   pgrep -fl "GameTrackerApp/node_modules/electron"   # should print nothing
   ```
2. Bump the version and build:
   ```bash
   npm version minor
   npm run dist
   ```
3. Test the result:
   - Open `release/Game Vault-1.1.0-arm64.dmg`
   - Drag **Game Vault** to Applications
   - **Right-click the app → Open → Open** (first launch only; it's unsigned)
   - Sign up as a brand-new test account, confirm the library loads, search
     for a game
4. Archive the `.dmg` you just tested:
   ```bash
   mkdir -p ~/GameVault-releases
   mv "release/Game Vault-1.1.0-arm64.dmg" ~/GameVault-releases/
   ```

- [ ] New build tested and archived

_(Full details on this flow: [RELEASING.md](RELEASING.md))_

---

## Step 3 — Get it to people

### For 2–3 people: just send the file

- AirDrop the `.dmg` from `~/GameVault-releases/`, or put it in a shared
  Google Drive / Dropbox folder.
- Tell them: **right-click → Open → Open** the first time (a plain
  double-click won't show the "Open anyway" button).
- Prefer AirDrop over a download link — files downloaded through a browser
  get an extra macOS quarantine flag that makes the warning stickier.

- [ ] Sent

### For more than that: GitHub Releases

1. Create a new **private** repo at https://github.com/new (name it
   `GameTrackerApp`, no README/gitignore/license — the repo already has them).
2. Connect and push:
   ```bash
   git remote add origin https://github.com/Aceluke24/GameTrackerApp.git
   git push -u origin main
   git push --tags
   ```
3. On GitHub: **Releases** → **Draft a new release** → pick tag `v1.1.0` →
   drag in the `.dmg` from `~/GameVault-releases/` → **Publish release**.
4. Send people the release page link. They download the `.dmg` from there.

- [ ] Repo created and first release published

---

## Step 4 — Intel Mac support (optional)

Only if a friend has a pre-2021 (Intel) Mac. Today's build won't run on one.

1. In `package.json`, change the `"mac"` block to:
   ```json
   "mac": {
     "target": { "target": "dmg", "arch": ["arm64", "x64"] },
     "identity": null
   }
   ```
2. Commit, `npm version patch`, `npm run dist`.
3. You now get two files — `...-arm64.dmg` (Apple Silicon) and `...-x64.dmg`
   (Intel). Send people the right one, or just send both and let them pick.

- [ ] Done (or: not needed)

---

## Step 5 — Windows support (optional)

Only if someone needs Windows. electron-builder **cannot** build a Windows
`.exe` from a Mac.

Easiest path: on a Windows PC, install [Node.js](https://nodejs.org), then:
```
git clone <your repo>
cd GameTrackerApp
npm install
npm run dist
```
The `win` config (`nsis`) is already in `package.json`. Output is a
`Game Vault Setup 1.1.0.exe` in `release/`.

(The cleaner long-term answer is GitHub Actions building all platforms
automatically — worth setting up if Windows becomes a regular need.)

- [ ] Done (or: not needed)

---

## Not doing (deliberately)

- **Code signing** — skipped. Users click past a one-time warning
  (right-click → Open on Mac, "More info → Run anyway" on Windows).
- **Auto-update** — not set up. Every new version means people reinstall
  manually. Revisit after you're on GitHub Releases (needs `electron-updater`).

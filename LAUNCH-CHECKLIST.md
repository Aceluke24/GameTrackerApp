# Launch checklist

Getting Game Vault into other people's hands. Most of this is done — see the
status below. Delete this file once the "Left to do" list is clear.

Run commands from `~/GameTrackerApp`. Full detail on the release process is in
[RELEASING.md](RELEASING.md).

---

## Done

- [x] **Supabase config baked into the build** — `electron/config.js`, so a
  packaged app knows which project to talk to without a `.env` file.
- [x] **IGDB secret moved server-side** — the `igdb` Supabase Edge Function
  holds the Twitch secret; deployed and working.
- [x] **Email confirmation turned off** — signups log straight in. (Password
  resets still use Supabase's built-in 2/hour sender, which is fine — see
  "Password resets" below.)
- [x] **v1.1.0 built, tested, and released** on GitHub with the macOS `.dmg`.
- [x] **GitHub Actions CI** — [`.github/workflows/release.yml`](.github/workflows/release.yml)
  builds macOS + Windows + Linux on every version tag and uploads them to a
  draft release.
- [x] **Auto-update wired in** — `electron-updater` in `electron/main.js`.
  Dormant until the repo is public (see "Left to do").
- [x] **Distribution** — invite friends to the private repo; they download
  installers from the Releases page.

---

## Left to do

### 1. Prove the CI pipeline works

You added the workflow but haven't run it yet. Next release will test it:

```bash
# after committing whatever changes:
npm version patch          # or minor
git push --follow-tags
```

Then: repo → **Actions** tab → watch the three build jobs. When they finish,
repo → **Releases** → there's a new **draft** with `.dmg`, `.exe`, and
`.AppImage` attached. Add notes, publish it.

- [ ] A tag push produced a draft release with all three installers

### 2. Get the Windows build onto your PC

Once step 1 has produced a Windows `.exe`:

1. On your Windows machine, download the `Game Vault Setup <version>.exe` from
   the release (you'll need to be signed into GitHub with repo access).
2. Run it. SmartScreen will warn — **More info → Run anyway**.
3. Sign in, confirm your library loads and game search works.

- [ ] Windows build installed and working

### 3. (When ready for a wider audience) Make the repo public

This is what switches auto-update on. The code is safe to open up — the only
committed Supabase value is the publishable key (public by design), and the
Twitch secret is server-side only.

1. Repo → **Settings → General → Danger Zone → Change repository visibility →
   Make public**.
2. Nothing else changes — the workflow and `build.publish` already point at
   `Aceluke24/GameTrackerApp`.
3. After this: **Windows and Linux users get auto-update**. Mac users still
   download the `.dmg` manually (see step 4).

- [ ] Repo public, auto-update confirmed working on a Windows install

### 4. (Optional) Code signing

Needed for: no scary warnings on first launch, **and** macOS auto-update.

- **macOS:** Apple Developer account ($99/yr). Then set `build.mac.identity`
  and add notarization.
- **Windows:** code-signing certificate (~$100–400/yr). Optional — the
  "Run anyway" click is mild.

Skip until the app has real reach. Documented in RELEASING.md → Code signing.

- [ ] Not doing yet

---

## Reference: password resets

Email confirmation is off, but "Forgot password?" still emails through
Supabase's built-in sender (2/hour cap). Fine because:

- Logged-in users change their password in Settings (no email).
- Resets are one-at-a-time; the 2/hour cap is a burst problem.
- If a reset email doesn't arrive: Supabase dashboard → Authentication →
  Users → pick the person → set a new password or send a recovery link.

If resets ever outgrow this, set up custom SMTP (Gmail as SMTP server, or
Resend/Mailgun with a ~$10/yr domain). Not worth it now.

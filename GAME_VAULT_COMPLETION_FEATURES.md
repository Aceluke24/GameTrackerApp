# Game Vault — "Actually Finish Your Games" Feature Ideas

## The problem this is solving
Game Vault is great at tracking *what* you own and *what state* it's in. It does nothing right now to help you actually make progress on it — the only assist toward completion is the "Play Next" recommendation on the Stats page. Everything below is aimed at closing that gap: turning the backlog from a list into something that nudges you toward finishing.

Core philosophy from our conversation: **low friction over precision.** No time tracking, no "you played for 47 minutes." Just: did you show up this week, yes or no, a few times.

## Design philosophy: the Four Laws of Behavior Change (Atomic Habits)

Every feature below should be built with these four laws in mind — they're the actual mechanism by which "track your backlog" turns into "finish your backlog." When we drill into any individual idea later, it's worth explicitly checking it against all four; a feature that only hits one or two of these is probably missing something.

- **1st Law — Cue: Make it obvious.** Surface the habit so it's impossible to forget it exists. The trigger for "play something" should be sitting in plain sight, not buried behind a click.
- **2nd Law — Craving: Make it attractive.** Pair playing with something the user already wants — visible progress, a streak, a satisfying UI moment — so opening the backlog feels appealing, not like a chore.
- **3rd Law — Response: Make it easy.** Every action tied to a habit (logging a session, checking progress, adjusting a goal) needs to be as close to zero-friction as possible. If it takes more than a click or two, it won't stick.
- **4th Law — Reward: Make it satisfying.** Give immediate, visible proof that the action mattered — a checkmark, a filled bar, a streak ticking up — so the brain associates "I played" with a small hit of positive feedback right away.

A rough first pass at how the ideas below map onto the four laws — this'll get more precise once we drill into each one individually:

| Idea | Cue (obvious) | Craving (attractive) | Response (easy) | Reward (satisfying) |
|---|---|---|---|---|
| Weekly Play Goals | Goal visible on card | — | — | Streak count, "hit your goal" moment |
| One-Tap Check-In | — | — | The whole point — one click, no form | Immediate progress-bar/counter update |
| Reminders & Notifications | The whole point — surfaces the cue itself | — | Action button = check in from the notification | — |
| Calendar-Aware Scheduling | Suggestion appears without digging for it | Framed as "here's an easy win this week," not a demand | Removes the friction of *deciding* when to play | — |
| Weekly recap | Shows up automatically | Small positive summary, not a scolding | — | The recap itself is the reward — a look back at wins |
| Focus view (Currently Playing) | Dedicated obvious home base | Clean, motivating view of active goals | — | Progress bars, at-a-glance completion |
| Streak visualization | — | Visually appealing, game-like | — | This *is* the reward mechanism — the classic "don't break the chain" habit tracker |
| Stale-backlog nudge | Surfaces games otherwise forgotten | Reframes starting as easy, not daunting | Could pair with a Two-Minute-Rule-style prompt ("just try it once") | — |

Blank cells aren't a problem — most features are really built to serve one or two of the laws well, not all four equally. The table's meant to catch gaps, not force every idea into every box.

---

## 1. Weekly Play Goals (session-count based)
*Primarily serves: Cue, Reward*

The foundation. Instead of "finish this game by March 1st" with hour-based pacing math, a goal is simply: **play this game N times this week.**

- Per-game, user sets a weekly target (e.g. "Hades — 3x this week")
- No minimum session length — a 10-minute session counts the same as a 2-hour one. The goal is *showing up*, not *grinding*
- Goals reset weekly; track a simple streak ("4 weeks in a row you've hit your Hades goal")
- Could support a general/ambient goal too, not tied to one game — "play something 3x this week" — for people who don't want to commit to a single title
- Open question: does a goal apply only to games in "Playing" status, or can you set one on anything (including Backlog, as a way to actually start it)?

## 2. One-Tap "I Played This" Check-In
*Primarily serves: Response, Reward*

The mechanism that makes goals actually work — has to be nearly frictionless or nobody logs anything consistently.

- A single button on the game card (or in the game detail modal) — "Log a session" — one click, done, no form
- Should also be triggerable **from a notification itself** (native notification action buttons — no need to even open the app)
- Immediately updates progress toward that week's goal, visible right on the card ("2/3 this week")
- Optional, never required: a tiny note field, in case someone wants to jot "beat the second boss" — but the whole flow must work with zero typing
- Possibly a system tray / dock quick-action for "log a session" without opening the main window at all, since Electron supports both

## 3. Reminders & Notifications
*Primarily serves: Cue — with a Response assist via in-notification check-in*

Native desktop notifications (Electron's built-in `Notification` API — no new backend needed for this part).

- **Stale-game nudge**: "You haven't played *Elden Ring* in 12 days" — for anything sitting in "Playing" status untouched a while
- **Goal-progress nudge**: "You're aiming for 3x this week on Hades — you're at 1 with 2 days left"
- Notifications should carry the check-in action directly (see #2) so a reminder can be resolved without opening the app
- Needs a settings panel of its own — quiet hours, how naggy vs. gentle, which games/goals to notify about, ability to snooze a specific goal for a week without guilt (missing a week on a hobby shouldn't feel like a punishment — an easy "skip this week" beats silently failing a goal you forgot about)

## 4. Calendar-Aware Smart Scheduling
*Primarily serves: Craving (a right-sized goal feels achievable, not demanding) and Response (removes the "when do I even fit this in" friction)*

The most ambitious piece, and worth splitting into two very different levels of effort:

**A. Read-only calendar awareness (the version we should actually build first)**
The app requests **read-only** access to your calendar (Google Calendar / Apple Calendar) — no write permissions, no auto-created events, much simpler auth than a full sync. With that, it can:
- Look at how booked a given week is and suggest adjusting the goal accordingly — "Looks like a busy week — maybe aim for 1–2 sessions instead of 3" or "Pretty open this week — want to bump it to 4, or go longer per session?"
- Optionally suggest *when* your free pockets are, without creating anything on the calendar itself — just a suggestion inside the app ("You've got open evenings Tue/Thu")
- This is the version that gets you almost all the value (a schedule-aware app) for a fraction of the engineering cost of two-way sync

**B. True two-way calendar sync (a possible later step, not a first build)**
Auto-creating/adjusting actual calendar events for play sessions. Real OAuth write access, event conflict handling, and — worth being honest about — a real risk that it starts to feel like the app is scheduling chores rather than supporting a hobby. If we ever build this, it should be strictly opt-in and easy to turn off per-game.

---

## Other ideas worth having on the list (not yet discussed, but adjacent)

- **Weekly recap** — a small digest (in-app, or as a notification) each Sunday/Monday: "This week: 3/3 on Hades, 0/2 on Elden Ring, 2 backlog games sitting untouched"
- **A dedicated "Currently Playing" focus view** — just your in-progress games with goal progress bars front and center, separate from the full grid
- **Auto-suggest a goal for stale Backlog games** — instead of only nudging about games you've started, occasionally surface "You've had *Hollow Knight* in your backlog for 8 months — want to set a goal to finally start it?"
- **Session streak visualization** — a lightweight habit-tracker-style grid (like a mini contribution graph) per game or overall
- **Tie into the existing "Next Up" pin** — pinning a game could optionally prompt "want to set a weekly goal for this too?"
- **Social/accountability layer** — sharing goal progress with a friend or partner who also uses the app. Bigger lift (the app is single-account today), and probably a "someday" idea rather than near-term, but worth having on paper

---

## Rough technical footprint (just to size things, not a spec)

- New tables likely needed: something like `goals` (user_id, game_id, target_sessions_per_week, created_at, active) and `session_log` (user_id, game_id, logged_at, optional note)
- Weekly reset logic — needs a clear definition of "week" (calendar week? rolling 7 days?) — worth deciding early since it affects the schema
- Notifications: Electron's `Notification` API, purely local — no new backend service needed for #2/#3
- Calendar read access: Google Calendar API (readonly scope) and/or Apple Calendar via EventKit — this is the one piece needing real external OAuth integration and its own settings/consent flow

---

## Not decided yet — open questions for when we prioritize
- Does a "week" run Mon–Sun, Sun–Sat, or a rolling 7 days from when the goal was set?
- Do goals apply per-game only, or can there be a library-wide ambient goal too?
- Should missed goals be visible/tracked at all, or only successes — i.e., is there any downside shown, or is this purely positive reinforcement?
- For calendar awareness: Google Calendar first, Apple Calendar first, or both from the start?

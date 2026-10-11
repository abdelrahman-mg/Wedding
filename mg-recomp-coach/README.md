# MG Recomp Coach

An offline Android app that coaches MG through a 12-week fat-loss and recomposition block. It covers daily meal and workout checklists, set-by-set logging with automatic progression, weight and waist tracking, a weekly rules engine that adjusts the plan from the data, Plan B swaps for anything unavailable, and local phone reminders.

There is no backend, no login, no ads and no analytics. Everything is stored on the phone. The only network call is the optional AI coach, which only runs if you add your own API key and press Send.

> This app is not medical advice. It is a training and nutrition plan built for MG. Get your blood pressure, blood tests and snoring checked by a doctor. Stop exercising and seek care for chest pain, fainting, severe dizziness, unusual breathlessness or palpitations.

---

## 1. Install the APK on your phone (the short version)

**Ready-made APK:** download [`release/MG-Recomp-Coach-1.2.0.apk`](release/MG-Recomp-Coach-1.2.0.apk) on your phone and install it. It installs over 1.0.0 and 1.1.0 and keeps your data. To build your own instead, use one of the options below.

**Option A: cloud build with EAS (easiest, no Android SDK needed)**

```bash
cd mg-recomp-coach
npm install
npm i -g eas-cli
eas login                                   # free Expo account
eas build -p android --profile preview      # builds an .apk (not .aab)
```

When the build finishes (about 10-20 minutes), EAS prints a link and a QR code.

1. Open the link on your Android phone and download the `.apk`.
2. Tap the downloaded file. Android asks you to allow **Install unknown apps** for your browser or file manager. Allow it.
3. Tap **Install**, then open **MG Recomp Coach**.

On the first build, EAS asks to create an Android keystore. Answer **yes** and it stores the key for you. Keep using the same Expo account for future builds so updates install over the old app and your data is kept.

**Option B: build locally with Gradle**

Requirements:

- Node 20 or newer, and `npm install` already run.
- Java 17 (JDK 17 is the safe choice; JDK 21 also works with this Gradle version).
- The Android SDK with platform 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. Android Studio installs these, or use `sdkmanager`.
- `ANDROID_HOME` pointing at the SDK (for example `export ANDROID_HOME=$HOME/Android/Sdk`).

```bash
cd mg-recomp-coach
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK is written to:

```
android/app/build/outputs/apk/release/app-release.apk
```

Copy it to the phone (USB, Drive, or `adb install android/app/build/outputs/apk/release/app-release.apk`) and install it as in Option A.

The generated `android/` folder is not committed. It is regenerated from `app.json` by `npx expo prebuild`. The local release build is signed with the debug key from the Expo template. That is fine for personal use, but if you later switch to EAS builds, uninstall the local build first, because the two use different signing keys (export a backup before you uninstall).

---

## 2. Run it in development

```bash
cd mg-recomp-coach
npm install
npx expo start
```

Scan the QR code with **Expo Go** on Android. Every module the app uses ships with Expo Go, so the app runs there. Scheduled local reminders work in Expo Go; push notifications are not used. For behaviour identical to the installed app, use the APK.

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Jest: engine unit tests plus render and interaction tests for every screen |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run doctor` | `npx expo-doctor` (dependency and config checks) |
| `npm run build:apk` | `eas build -p android --profile preview` |

---

## 3. What is in the app

Bottom tabs: **Home, Food, Gym, Log, Progress**. **Plan & settings** opens from the Plan button at the top right of every tab.

- **Home.** A dashboard: score and targets, water, the next meal (Ate it / Plan B), today's workout, the coach's headline and pending changes, the weekly rings, and Log / Check-in buttons.
- **Food.** Today's meals (tap the circle when eaten; tap a row for Plan B or Skip), extra food eaten outside the plan, the weekly meal plan by day, the full meal library (including the B5 Granola bowl and the no-cooking meals), and links to shopping, meal prep, swaps and the plan editor.
- **Gym.** Today's session (start, minimum version, walk fallback), then **All workouts**: every session with every exercise, this week's sets × reps, rest, RIR, cue, alternatives, your last numbers and the next progression step, and a "Start now" button. Also cardio, warm-up, mobility, history and the strength tests.
- **Log.** Submit anything, anytime: each input (weight, steps, water, cardio, sleep, energy and hunger, waist, blood pressure, note, food) has its own Submit. A timeline lists everything submitted that day with an undo button.
- **Progress.** Stats and charts, plus **Coach review** (the weekly rules engine and its Apply / Not now cards) and **Ask coach** (offline topics, the optional AI coach and the API key setup).

The sections below describe each feature in detail.

- **Onboarding (5 steps).** Welcome and privacy, baseline (175 cm, 110 kg, waist 115 cm, body fat about 37% marked as an estimate, age 26, start date), health checklist, reminder toggles and notification permission, the 12-week summary with the honest 1 kg per week ceiling.
- **Today.**
  - Header with greeting, date arrows to log past days, week, phase, day type and streak.
  - Targets card: kcal, protein, steps and water in 250 ml glasses.
  - Weekly goal rings: workouts (4), days on plan (7), average steps vs target, and weigh-ins.
  - Meal slots with **Ate it**, **Plan B** and **Skip**. Plan B is a bottom sheet with same-slot alternatives sorted by closeness, the emergency meals, the ingredient table and "Log something else", all with a live kcal and protein comparison and the effect on the day total.
  - Meals are compact rows: tap the circle when eaten, tap the row for details, Plan B or Skip. The next meal opens by default.
  - All notices (demo mode, BP, deload, holiday) sit together in one alert card.
- **Log.** One place for every input:
  - Body (weight, waist), activity (steps, cardio minutes and type, post-lift walk), recovery (sleep, energy, hunger) and notes, saved with one Save button.
  - Water and oil counters, blood-pressure readings with the BP status, and the craving, "Something hurt" and "Something feels wrong" buttons.
  - A last-7-days table: tap a day to edit it.
  - Morning check-in before 11:00 and the end-of-day check-in.
- **Train.**
  - Today's session with the phase banner, estimated duration and progress bar.
  - Exercise cards with cue, last session, progression suggestion and set rows (kg, reps or seconds, RIR 0 to 4+, done). Ticking a set saves it, buzzes lightly and starts the rest timer. The floating rest pill survives navigation and buzzes at zero.
  - "Not available / busy?" swaps (Just today or From now on), checked against the joint-safety rules.
  - Minimum version (30 min, 70% credit), the walk fallback (40% credit) and a session switcher that blocks back-to-back lower sessions.
  - The optional 20-minute walk after lifting (+2 bonus points), warm-up and mobility checklists, the cardio timer on rest days, the baseline test in week 1 and the final test in week 12, and workout history.
- **Progress.**
  - Weight chart with daily dots, a 7-day average, the shaded expected band and a start-weight line. Tap the chart to read a value.
  - Charts for waist, estimated strength per main lift (Epley), weekly steps, days on plan and sleep.
  - Stats cards, a weekly summary table, badges, progress photos (weeks 1, 4, 8 and 12, stored privately, side-by-side compare), the plan-change timeline with undo, and the pain log.
  - **Copy weekly report** in the exact text format from the brief.
- **Coach.**
  - The weekly review ("What the data says", with rate, distance from the band and the week-12 projection).
  - Proposal cards with **Apply** and **Not now**, the early-deload trigger, pain referral, BP status, labs and snoring cards.
  - "Ask the coach" with offline scripted answers for the six quick chips, plus the optional AI coach.
- **Plan.**
  - The 12-week roadmap with the current week highlighted, and holiday/social week mode.
  - Editors for meals (including moving the treat day) and workouts (session days, permanent swaps, the leg-extension opt-in after week 6), and the Targets screen (all edits validated against the hard limits).
  - Shopping list, meal prep, guides (ingredient Plan B, eating out, supplements with creatine locked until kidney labs are normal), health checks and the BP log, reminders, settings, and safety.

Design: Nile-teal and emerald primary colors with an amber accent for streaks and achievements. The background is off-white in light mode and teal-black in dark mode. Space Grotesk is used for headings and Inter for body text. The app follows the system theme, with a manual override, and there is a "reduce motion" switch that also follows the system setting. Tap targets are at least 48 dp, and status is never shown by color alone.

---

## 4. Decisions I made (and why)

| Topic | Decision |
| --- | --- |
| Stack | Expo SDK 57, React Native 0.86, TypeScript, `expo-router` 57, `zustand` with `persist` to AsyncStorage. |
| Storage | One JSON document (`AppData`) in AsyncStorage under the key `mg-recomp-coach`, with a `schemaVersion` and a migration table (`src/engine/defaults.ts`). AsyncStorage survives restarts and app updates, and it is simpler to back up as JSON than SQLite. |
| Program week vs stats week | The program week is `floor(daysSinceStart / 7) + 1`, as specified. Weekly statistics use Sunday to Saturday weeks. A stats week takes the program week of its Saturday, so a partial first week counts as week 1. |
| Triggered deload | A triggered deload lasts 7 days, `deloadUntil` is its last day, and +150 kcal applies only during those days (`adjust.deloadKcal`). |
| "Strength drops on 3+ exercises" | This reads as: 3 or more exercises whose last two sessions each dropped versus the session before (lower top weight, or the same top weight with fewer total reps). |
| Below-the-range rule | One session below the range: hold the weight. Two in a row: reduce about 7.5% (inside the 5-10% band), rounded to 0.5 kg. |
| Stall rule | Uses estimated strength (Epley) for loaded lifts and total reps or seconds otherwise. A stall is 3 sessions in a row that do not beat the best before them. If there has been no new best for 42 days or more, the app also suggests swapping. Deload sessions are ignored. |
| Kcal cuts | A proposal must pass both rules: the plan average plus the adjustment stays at 1,700 or more, and the adjustment stays at -250 or above. With the default plan (about 1,955 kcal), that allows one -150 cut. After that the coach says the hard limits are reached and recommends a doctor and lab review. |
| Doctor clearance | You need to tick "Doctor reviewed my labs and BP" in Health checks and then confirm in Settings. Clearance relaxes the limits a little (1,500 kcal floor, 15,000 steps, 60 min cardio). The no-HIIT, no-running, no-jumping and no-supplement rules never relax. |
| Units | kg/lb and cm/in apply to body weight, waist, charts and the band. Gym loads always stay in kg. |
| Health Connect | Not bundled. It needs an extra native library and a permissions flow I could not test here. The toggle exists, and steps fall back to manual entry with a clear note. |
| Reminders | DATE triggers for the next 14 days, built from each day's planned meal names. They are rescheduled on every app open and after any plan or setting change (debounced). The four Android channels are meals, training, check-ins and sleep. "Snooze all 24 h" is supported. A water nudge within 20 minutes of another reminder is dropped so notifications never stack. |
| Post-lift walk | The optional 20-minute walk after lifting is a toggle in Train on gym days, worth +2 bonus points (the day score still caps at 100). |
| Shopping list | Default quantities from the brief. If you edit the plan, the countable items (eggs, yogurt, whey, bread, bananas, apples, sweet potatoes) are rescaled from per-meal counts. Other items show the default with a note. |
| AI coach | Off by default. Connect it in Coach > Ask the coach (or Settings): open the Anthropic Console, create a key, paste it, and tap Save and test (the app checks the key with a free model lookup). The key is stored in `expo-secure-store`. Calls use the official `@anthropic-ai/sdk` with low effort and server-side refusal fallbacks. The app sends a compact 14-day JSON summary to the Anthropic Messages API (`claude-sonnet-5-5`). If the reply contains a `CHANGE:` line, it becomes a normal Apply / Not now card validated against the hard limits. Replies that mention forbidden content (HIIT, fat burners and so on) get a warning appended. |
| Demo mode | Settings > Demo mode stashes your real data under a separate key, loads 4 weeks of generated logs, and restores the real data untouched when you turn it off. Anything you log while in demo mode is discarded. |

---

## 5. Project structure

```
mg-recomp-coach/
  app.json, eas.json            app config (package com.mg.recompcoach, icons, splash, plugins, minSdk 26)
  assets/                       generated icon, adaptive icon layers, monochrome, splash, notification icon
  src/app/                      expo-router routes
    _layout.tsx                 fonts, theme, splash, stack, global rest-timer pill, celebrations
    (tabs)/                     index (Today), train, progress, coach, plan
    onboarding, checkin, edit-meals, edit-workouts, targets, shopping, prep, guides,
    reminders, settings, safety, health, badges, photos, history, strength-test
  src/data/                     source-of-truth plan data (meals, plan, sessions, phases, guides, messages, badges, coach scripts)
  src/engine/                   pure, tested logic
    dates.ts                    timezone-safe YYYY-MM-DD helpers, Sunday-Saturday weeks
    targets.ts                  expected weight and band, step and cardio targets
    nutrition.ts                planned slots, totals, eaten totals, kcal target, protein fix
    phase.ts                    ease-in and deload sets, RIR, deload loads
    progression.ts              double progression, stall, PRs, history by exercise name
    scoring.ts                  day score, streak with grace day, levels
    limits.ts                   hard limits, joint-safety keyword rules, forbidden advice filter
    rules.ts                    weekly review, early deload, pain referral, BP status
    selectors.ts                day context, day summary, week stats, badges, daily message
    report.ts                   weekly report text
    shopping.ts                 shopping list rescaling
    defaults.ts                 initial data and the versioned migrations
  src/store/useApp.ts           zustand store, persistence, demo-mode stash/restore
  src/services/                 notifications, backup/import/photos, AI coach, demo data
  src/features/                 Plan B sheet, workout view, quick log, safety sheets
  src/ui/                       theme tokens, components, SVG icons, line chart, overlays, units
  __tests__/                    Jest tests
```

### Data model (`src/engine/types.ts`)

`AppData` holds:

- `profile`, `settings`, `plan` (meals per weekday, session days, treat day, permanent exercise swaps) and `adjust` (stepsAdjust, kcalAdjust, cardioAdjust, proteinTarget, deloadUntil, deloadKcal, optional base kcal).
- `dayLogs[date]`: meals per slot with a status of eaten, planB, custom or skipped; steps, water, sleep, energy, hunger, oil, note, cardio minutes, session override, cravings and check-in flags.
- `body[date]` (weight and waist), `bp[]`, `workouts[]` (sets with `exerciseId`, `nameUsed`, weight, reps or seconds, RIR, done), `painFlags[]`, `redFlags[]`.
- `planChanges[]` (date, type, old, new, reason, undone), `dismissed` proposals, `badges`, `photos[]`, `checklist`, `strengthTests` (baseline and final), `messageHistory`, `shoppingChecked`, `celebrations`, `planBCount` and `coachChat`.

To change the schema, bump `SCHEMA_VERSION` in `src/engine/defaults.ts` and add a migration from the old version to the new one. Never edit an old migration. Settings > "Export database (debug)" exports the raw stored JSON.

---

## 6. How the rules engine works

All of it is pure functions in `src/engine/`. Screens call `runReview(data, today)`, `earlyDeload(data, today)`, `painStatus(...)` and `bpStatus(...)`.

1. **Expected band.** `expected(t) = W0 - (2.0 + 0.9 * (t - 1))`, with a band of ±1.5 kg, for t = 1 to 12.
2. **Weekly stats.** For each completed Sunday to Saturday week, the app computes:
   - the average of that week's weigh-ins (only with 3 or more, otherwise it asks you to log more);
   - waist, days on plan (kcal within ±150 of the target, protein at least 140 g and a day score of at least 70);
   - average steps, sleep, energy and hunger;
   - workout credit (full = 1, minimum = 0.7, walk = 0.4), pain flags and holiday status.
3. **Review** (`weeklyReview`). It uses only weekly averages.
   - Weeks 1-2: report only.
   - Inside the band: on track.
   - Above the band 2 weeks in a row:
     - With 85% adherence or more: steps +1,500 (capped at 12,000 total), else kcal -150 if the floor allows, else "hard limits reached, see a doctor".
     - Between 70% and 85%: a mild message, no change.
     - Under 70%: fixes, never cuts.
   - Below the band, or losing more than 1.3 kg/week two weeks in a row: kcal +200 and a strength and energy check.
   - Waist down 1 cm or more over 2 weeks while weight is flat or in the band: "recomposition is working".
   - Holiday weeks pause the band check.
   - The review always reports the rate (kg/week over the last 2 weeks), the distance from the band and a linear week-12 projection labeled as an estimate.
4. **Applying changes.** Every proposal is a card. Apply validates against the hard limits (`validateChange`), writes to `adjust` and logs to `planChanges`. Undo restores the previous value of the most recent change. A negative `kcalAdjust` appears on Today as "target X minus 150", with suggested removals (rather than silently shrinking portions).
5. **Recovery and safety** (any day):
   - **Early deload:** 3 or more exercises with consecutive drops, average sleep under 6 h over 5 days, or energy 1-2 on 3 of the last 5 days. It is proposed as a 7-day deload with +150 kcal.
   - **Pain flags:** the same body part twice in 14 days triggers a referral, plus an option to pause shoulder or knee exercises until you are cleared.
   - **Red-flag symptoms:** stop the workout, seek care, and for chest pain or fainting, a prompt to call 123 (Egypt ambulance).
   - **BP:** 3 readings at or above 130/80 means "see a doctor soon"; 180/120 or more, or high with symptoms, means "urgent". A persistent yellow banner stays until a doctor checks your BP.
6. **Progression** (`suggestProgression`), per exercise name, so a swapped exercise keeps its own history:
   - All sets at the top of the range with RIR 2 or more: add load (+2.5 kg upper, +5 kg lower, plus "next pin" wording on machines).
   - Any set below the range: hold the weight (reduce after twice in a row).
   - Otherwise: +1 rep.
   - Timed exercises: +5 s per session until the top of the range, then add a set (max 4).
   - Plus the stall rule and the first-time message.
7. **Phase logic:** weeks 1-2 use `min(sets, 2)` at RIR 3-4. Deload weeks (6, 12 or triggered) use `ceil(sets / 2)`, about 90% loads and RIR 4.

---

## 7. Editing the plan data

Everything numeric lives in `src/data/` as typed constants:

- `meals.ts`: the meal library and emergency meals (kcal, protein, descriptions).
- `plan.ts`: the default weekly plan, session days and treat day. `DAY_TOTAL_FIXTURES` are the expected totals that the tests check.
- `sessions.ts`: exercises, sets, rep ranges, rest, RIR, cues and alternatives, plus the minimum version, warm-up and mobility.
- `phases.ts`: the 12-week targets and hard limits.
- `guides.ts`: ingredient Plan B, shopping, meal prep, eating out, supplements, the health checklist and the disclaimers.
- `messages.ts`, `coachScripts.ts`, `badges.ts`: copy.

After editing, run `npm test`. The day-total tests fail if a meal change breaks the documented plan totals. Update the fixtures on purpose if you changed the plan on purpose.

On first launch, the plan is copied into the user's data, so in-app edits never touch these files. **Plan > Weekly meal plan > Reset plan to original** reloads them.

---

## 8. Backup and restore

- **Settings > Export backup (JSON)** writes `mg-recomp-backup-YYYY-MM-DD.json` and opens the Android share sheet (save to Drive, Files, email and so on).
- **Settings > Import backup** opens the file picker. It accepts a backup from this app, migrates it if it is older, and asks before replacing everything.
- Progress photos live in the app's private folder and are not included in the JSON (only their paths are). Keep the photos in your gallery too if you want them to survive a reinstall.
- Uninstalling the app deletes its data. Always export first.

---

## 9. Tests

`npm test` runs:

- `dates`: Sunday to Saturday weeks, program weeks, DST-safe arithmetic.
- `nutrition`: computed day totals match the table, PG only on gym days, eaten totals, shopping rescaling.
- `targets`: `expected(t)` and the band for t = 1 to 12, step and cardio caps.
- `rules`: every weight-band outcome, the 1,700 kcal floor, learning phase, too few weigh-ins, the waist message, metrics, holiday, pain referral, BP levels.
- `progression`: add load upper/lower, hold, reduce, +1 rep, first time, ignored sessions, timed, bodyweight, stall and swap, deload reference, PRs, the minimum version.
- `phase`: ease-in, deload sets, triggered deload and its +150 kcal, sleep, energy and strength triggers.
- `scoring`: score parts, penalties, training credit, the on-plan rule, streaks with the grace day, levels.
- `limits`: every hard limit, doctor clearance, joint-safety keywords (all built-in exercises pass), migrations, AI change parsing.
- `notifications`: 14 days of reminders with that day's meal names, gym reminders only on gym days, no water nudge stacked on another reminder, snooze, disabled reminders.
- `layout`: boots the real `src/app` tree (root stack, tabs, the onboarding redirect).
- `screens`: renders all 21 screens with demo data and with a fresh install, and drives three flows (log a set and see the rest timer start, then finish and save a workout; a Plan B swap; a blocked unsafe custom swap).

---

## 10. Troubleshooting

- **"App not installed" on the phone.** An older build signed with a different key is installed. Export a backup, uninstall the old app, install the new APK, then import the backup.
- **No reminders.**
  - Allow notifications (Plan > Reminders shows a banner if they are blocked).
  - On Xiaomi, Oppo, Realme and Samsung, set the app's battery mode to **Unrestricted** or "No restrictions" so alarms are not killed.
  - Reminders are scheduled 14 days ahead and refreshed each time you open the app, so open it at least every two weeks.
  - On Android 14+, exact timing may need "Alarms & reminders" permission in the app's system settings; without it, reminders can arrive a few minutes late.
- **`eas build` asks about a keystore.** Answer yes to generate one. Build the same way every time so updates install over the existing app.
- **Gradle: "SDK location not found".** Set `ANDROID_HOME` or create `android/local.properties` with `sdk.dir=/path/to/Android/Sdk`.
- **Gradle: NDK or CMake missing.** Install `ndk;27.1.12297006` and `cmake;3.22.1` with the SDK manager.
- **Gradle: wrong Java.** Use JDK 17 (`java -version`). Set `JAVA_HOME` to it.
- **Metro cache issues.** Run `npx expo start -c`.
- **Dependency mismatch warnings.** Run `npx expo install --fix`, then `npx expo-doctor`.
- **The app looks empty after turning on demo mode.** Demo data starts 27 days ago, so it shows when you open the app. Turn demo mode off in Settings to get your data back.

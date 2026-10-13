# MG Recomp Coach

An offline Android app that coaches MG through a 12-week fat-loss and recomposition block. It covers daily meal and workout checklists, set-by-set logging with automatic progression, weight and waist tracking, a weekly rules engine that adjusts the plan from the data, Plan B swaps for anything unavailable, and local phone reminders.

There is no backend, no login, no ads and no analytics. Everything is stored on the phone. The only network call is the optional AI coach, which only runs if you add your own API key and press Send.

> This app is not medical advice. It is a training and nutrition plan built for MG. Get your blood pressure, blood tests and snoring checked by a doctor. Stop exercising and seek care for chest pain, fainting, severe dizziness, unusual breathlessness or palpitations.

---

## 1. Install the APK on your phone (the short version)

**Ready-made APK:** download [`release/MG-Recomp-Coach-1.5.0.apk`](release/MG-Recomp-Coach-1.5.0.apk) on your phone and install it. It installs over any earlier version and keeps your data. To build your own instead, use one of the options below.

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

Three tabs: **Today, Gym, Me**.

- **Today.** The whole day in one scroll, top to bottom:
  - Your score and targets, and water (+/−).
  - Meals: tap the circle when eaten; tap a meal for Plan B or Skip; "Add food you ate" for anything extra. The next meal opens by itself.
  - The workout card, which opens the Gym tab.
  - Your numbers, each with its own Submit: weight, steps, sleep, energy and hunger. "More" adds cardio, waist, blood pressure and a note.
  - The craving, "something hurt" and "feel unwell" buttons, and the list of what you submitted today (with undo).
  - The coach's headline, the weekly rings and the end-of-day check-in.
- **Gym.** Today's session (start, 30-minute minimum version, walk fallback), then every workout and exercise with this week's sets, reps, rest, cues, alternatives, your last numbers and the next step. Also cardio, warm-up, mobility, history and the strength tests.
- **Me.**
  - **Progress:** stats and charts.
  - **Coach:** the weekly review with Apply / Not now, and "Ask a question", which also holds the AI key setup.
  - **Plan:** edit meals and workouts, targets, shopping, meal prep, guides, health checks, reminders, settings, then the 12-week roadmap, this week's meals and the meal library.

The sections below describe each feature in detail.

- **Onboarding (5 steps).** Welcome and privacy, baseline (175 cm, 110 kg, waist 115 cm, body fat about 37% marked as an estimate, age 26, start date), health checklist, reminder toggles and notification permission, the 12-week summary with the honest 1 kg per week ceiling.
- **Today.**
  - Header with greeting, date arrows to log past days, week, phase, day type and streak.
  - Targets card: kcal, protein, steps and water in 250 ml glasses.
  - Weekly goal rings: workouts (3), days on plan (7), average steps vs target, and weigh-ins.
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
  - Exercise cards with cue, a **Watch tutorial** button, last session, progression suggestion and set rows (big minus/plus steppers for kg and reps, "Last time: 60 kg × 5" under every set, done). One tap marks the form as clean or not for the whole exercise. Ticking a set saves it, buzzes lightly and starts the rest timer. The floating rest pill survives navigation and buzzes at zero.
  - "Not available / busy?" swaps (Just today or From now on), checked against the joint-safety rules.
  - Minimum version (30 min, 70% credit), the walk fallback (40% credit) and a session switcher that blocks squat day and deadlift day on back-to-back days.
  - The optional 20-minute walk after lifting (+2 bonus points), warm-up and mobility checklists, the cardio timer on rest days, the baseline test in week 1 and the final test in week 12, and workout history.
- **Progress.**
  - **Weekly check-in** card at the top: last week's average vs the week before, the 0.3-0.7 kg/week target, and a calorie suggestion. A big stepper saves today's smart-scale weight without typing.
  - Weight chart with daily dots, a 7-day average, the shaded target path (0.3-0.7 kg a week) and a start-weight line. Tap the chart to read a value.
  - **Lifts over time**: one chart per main lift (squat, bench, deadlift, overhead press, barbell row) with the heaviest set of each session. Also waist, weekly steps, days on plan and sleep charts.
  - Stats cards, a weekly summary table, badges, progress photos (weeks 1, 4, 8 and 12, stored privately, side-by-side compare), the plan-change timeline with undo, and the pain log.
  - **Copy weekly report** in the exact text format from the brief.
- **Coach.**
  - The weekly review ("What the data says", with the weekly change, the 0.3-0.7 kg target and the week-12 projection).
  - Proposal cards with **Apply** and **Not now**, the early-deload trigger, pain referral, BP status, labs and snoring cards.
  - "Ask the coach" with offline scripted answers for the six quick chips, plus the optional AI coach.
- **Plan.**
  - The 12-week roadmap with the current week highlighted, and holiday/social week mode.
  - Editors for meals (including moving the treat day) and workouts (session days and permanent swaps), and the Targets screen (all edits validated against the hard limits).
  - Shopping list, meal prep, guides (ingredient Plan B, eating out, supplements with creatine locked until kidney labs are normal), health checks and the BP log, reminders, settings, and safety.

Design: six color schemes (Nile teal, Ocean blue, Graphite, Sunset, Plum, Forest), each with a light and a dark version. Pick one in Me > Plan > Colors and theme; it applies instantly. The default is Nile teal and emerald with an amber accent for streaks and achievements. The colors of "done", warnings and dangers stay the same in every scheme. The background is off-white in light mode and teal-black in dark mode. Space Grotesk is used for headings and Inter for body text. The app follows the system theme, with a manual override, and there is a "reduce motion" switch that also follows the system setting. Tap targets are at least 48 dp, and status is never shown by color alone.

---

## 3b. Version 1.5.0: powerlifting program, portions and weekly check-in

- **Program (replaces the old 4-day split).** Powerlifting-focused full body, 3 days: **Friday squat day** (squat 4x5, Romanian deadlift 3x8, leg press 2x10, plank 3 sets), **Saturday bench day** (bench press 4x5, overhead press 3x6-8, barbell row 3x8, biceps curl and triceps pushdown 2x10-12), **Tuesday deadlift day** (deadlift 3x5, light squat 2x5, light bench 3x5, lat pulldown 3x8-10). Rest days keep the easy cardio. Moving days in Me > Plan > Workouts still works.
- **Watch tutorial.** Every exercise card and every exercise in the Gym library has a button. Add your own links in `src/data/tutorials.ts`; an exercise without a link opens a YouTube search for it, so the button always works.
- **Logging.** Weight (kg) and reps for every set with big minus/plus buttons (no typing needed, but you can type), and the last session's numbers next to every set. RIR is gone. One tap says whether form was clean.
- **Auto progression.** See section 6, point 6. The first 3 weeks show the learning banner. Two misses in a row suggest a 10% deload.
- **Weekly check-in.** Me > Progress opens on it: weekly average vs the previous week, the 0.3-0.7 kg/week target, calorie suggestions (faster loss: eat a little more; flat for 2 weeks: trim a little), the weight trend chart and a chart per main lift.
- **Food by portion, no scale.** Today has a protein tracker with big one-tap buttons (palm of chicken, protein shake, egg, yogurt), and **Add by portion** opens Egyptian foods grouped as palms of protein, fists of carbs, cupped hands of veg and thumbs of fats, with spoon, cup and piece counts. No fish. The protein shake comes in water or milk versions. Portions you add count toward calories and protein.
- **Busy day mode.** One big button on Today swaps the screen for three simple meals (eggs, foul and bread; chicken, rice, salad; tawook plate) plus the protein target. Nothing else.
- **Existing data.** Old workouts are kept and mapped (upper sessions to bench day, lower sessions to squat day). Session days and permanent swaps reset to the new program. Everything else stays.
- **Joint safety, honestly.** You chose squat, deadlift, bench and overhead press even though your right shoulder has dislocated 4 times and your right knee had ACL surgery. They are now allowed in the app. What stays: no behind-the-neck moves, dips, deep flyes, upright rows, lunges, jumping, running; the pain-flag referral (2 flags in 14 days) and the option to pause shoulder or knee exercises; the BP banner, which now says heavy lifts count; and reminders on the exercise cards to use safety bars or a spotter. This is not medical advice: get the BP and labs checked before the weights get heavy, and ask a physio about the shoulder.

---

## 4. Decisions I made (and why)

| Topic | Decision |
| --- | --- |
| Stack | Expo SDK 57, React Native 0.86, TypeScript, `expo-router` 57, `zustand` with `persist` to AsyncStorage. |
| Storage | One JSON document (`AppData`) in AsyncStorage under the key `mg-recomp-coach`, with a `schemaVersion` and a migration table (`src/engine/defaults.ts`). AsyncStorage survives restarts and app updates, and it is simpler to back up as JSON than SQLite. |
| Program week vs stats week | The program week is `floor(daysSinceStart / 7) + 1`, as specified. Weekly statistics use Sunday to Saturday weeks. A stats week takes the program week of its Saturday, so a partial first week counts as week 1. |
| Triggered deload | A triggered deload lasts 7 days, `deloadUntil` is its last day, and +150 kcal applies only during those days (`adjust.deloadKcal`). |
| "Strength drops on 3+ exercises" | This reads as: 3 or more exercises whose last two sessions each dropped versus the session before (lower top weight, or the same top weight with fewer total reps). |
| Missed-reps rule | One session where not every prescribed rep was hit with clean form: repeat the weight. Two in a row: suggest a 10% deload, rounded to 2.5 kg, and build back up. |
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
    targets.ts                  target weight path (0.3-0.7 kg a week), step and cardio targets
    nutrition.ts                planned slots, totals, eaten totals, kcal target, protein fix
    phase.ts                    learning phase (weeks 1-3), deload sets and loads
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
- `body[date]` (weight and waist), `bp[]`, `workouts[]` (sets with `exerciseId`, `nameUsed`, weight, reps or seconds, clean form, done), `painFlags[]`, `redFlags[]`.
- `planChanges[]` (date, type, old, new, reason, undone), `dismissed` proposals, `badges`, `photos[]`, `checklist`, `strengthTests` (baseline and final), `messageHistory`, `shoppingChecked`, `celebrations`, `planBCount` and `coachChat`.

To change the schema, bump `SCHEMA_VERSION` in `src/engine/defaults.ts` and add a migration from the old version to the new one. Never edit an old migration. Settings > "Export database (debug)" exports the raw stored JSON.

---

## 6. How the rules engine works

All of it is pure functions in `src/engine/`. Screens call `runReview(data, today)`, `earlyDeload(data, today)`, `painStatus(...)` and `bpStatus(...)`.

1. **Target loss.** 0.3 to 0.7 kg per week, judged on the weekly average. The shaded path on the chart is `W0 - 0.3 t` to `W0 - 0.7 t`.
2. **Weekly stats.** For each completed Sunday to Saturday week, the app computes:
   - the average of that week's weigh-ins (2 or more, otherwise it asks you to log more: daily is best, several times a week is fine);
   - waist, days on plan (kcal within ±150 of the target, protein at least 140 g and a day score of at least 70);
   - average steps, sleep, energy and hunger;
   - workout credit (full = 1, minimum = 0.7, walk = 0.4), pain flags and holiday status.
3. **Weekly check-in** (`weeklyReview`). It compares each weekly average with the week before (week 1 compares with the start weight).
   - Weeks 1-2: report only.
   - Loss of 0.3-0.7 kg: on track, no change.
   - Loss faster than 0.7 kg: suggest kcal +100 a day.
   - Loss under 0.3 kg, or flat for one week: a gentle note, no change (one week is noise).
   - Flat (under 0.1 kg of loss) for 2 weeks in a row:
     - With 70% adherence or more: suggest kcal -100 a day, if the 1,700 kcal floor and the -250 limit allow, else "hard limits reached, see a doctor".
     - Under 70%: fix the basics first, never cut.
   - Waist down 1 cm or more over 2 weeks while the scale is slow: "recomposition is working".
   - Holiday weeks pause the check.
   - It always reports the weekly change, the rate and a linear week-12 projection labeled as an estimate.
4. **Applying changes.** Every proposal is a card. Apply validates against the hard limits (`validateChange`), writes to `adjust` and logs to `planChanges`. Undo restores the previous value of the most recent change. A negative `kcalAdjust` appears on Today as "target X minus 150", with suggested removals (rather than silently shrinking portions).
5. **Recovery and safety** (any day):
   - **Early deload:** 3 or more exercises with consecutive drops, average sleep under 6 h over 5 days, or energy 1-2 on 3 of the last 5 days. It is proposed as a 7-day deload with +150 kcal.
   - **Pain flags:** the same body part twice in 14 days triggers a referral, plus an option to pause shoulder or knee exercises until you are cleared.
   - **Red-flag symptoms:** stop the workout, seek care, and for chest pain or fainting, a prompt to call 123 (Egypt ambulance).
   - **BP:** 3 readings at or above 130/80 means "see a doctor soon"; 180/120 or more, or high with symptoms, means "urgent". A persistent yellow banner stays until a doctor checks your BP.
6. **Progression** (`suggestProgression`), per exercise name, so a swapped exercise keeps its own history:
   - Every prescribed set logged, every rep at the top of the range, form marked clean: add load (+5 kg on squat, deadlift, Romanian deadlift and leg press; +2.5 kg on bench, overhead press, row, curls, pushdowns and lat pulldown).
   - Missed reps or form not clean: repeat the same weight.
   - Missed twice in a row: suggest a 10% deload (rounded to 2.5 kg) and build back up.
   - Light squat and light bench follow 75% of your latest squat and bench weight.
   - Timed exercises (plank): +5 s per session until the top of the range, then add a set (max 4).
   - Plus the stall rule and the first-time message.
7. **Phase logic:** weeks 1-3 are the **learning phase** (banner: "Learning phase - light weights, focus on form"; full sets, light weights). Deload weeks (6, 12 or triggered) use `ceil(sets / 2)` and about 90% loads.

---

## 7. Editing the plan data

Everything numeric lives in `src/data/` as typed constants:

- `meals.ts`: the meal library and emergency meals (kcal, protein, descriptions).
- `plan.ts`: the default weekly plan, session days and treat day. `DAY_TOTAL_FIXTURES` are the expected totals that the tests check.
- `sessions.ts`: the three sessions, exercises, sets, rep ranges, rest, load increments, cues and alternatives, plus the minimum version, warm-up and mobility.
- `tutorials.ts`: the **Watch tutorial** link for every exercise (see "Adding your tutorial links").
- `foods.ts`: everyday Egyptian foods counted in palms, fists, cupped hands, thumbs, spoons, cups and pieces, plus the protein shake options.
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
- `targets`: the 0.3-0.7 kg/week target path for t = 1 to 12, step and cardio caps.
- `rules`: every weekly check-in outcome (on track, too fast, slow, flat for 2 weeks, low adherence), the 1,700 kcal floor, learning phase, too few weigh-ins, the waist message, metrics, holiday, pain referral, BP levels.
- `progression`: add load upper/lower, hold, reduce, +1 rep, first time, ignored sessions, timed, bodyweight, stall and swap, deload reference, PRs, the minimum version.
- `phase`: learning phase, deload sets, triggered deload and its +150 kcal, sleep, energy and strength triggers.
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

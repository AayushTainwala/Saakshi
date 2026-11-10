# Build Handoff

The pickup file for build sessions: where things stand, what is next, and the questions open with the owner. Read [CLAUDE.md](../CLAUDE.md) first. This page is kept short. Reports of finished rounds are in [handoff/](handoff/) and are listed at the end.

## Where things stand (10 Nov 2026)

- **On `main`:** R1 and R2 (#1 to #9), fix round 1 (#16 to #27) and round 2, Part 1 with groups 1.6 and 1.7 (#31 to #36, #41, #43). Typecheck, lint, 598 tests and both native builds pass.
- **What has run on a phone:** the evidence camera and body-cam as they were on 5 Nov, on the owner's iPhone. Nothing built since then has run on a phone, and the Android app has never run on a phone or an emulator. Treat every "Not verified" note in the archived reports as still open.
- **New feature code is paused** (owner, 10 Nov) until repairs 1 to 4 below are done. Group 3.1 (documents only) may go ahead. Parts 2, 3 and 4 of round 2 wait.
- **Pace:** no deadline. The next goal is a beta for about 50 testers on iPhone and Android ([BUILD_PLAN.md](BUILD_PLAN.md), "Road to the beta").

## How work is merged

- **Every change to `main` goes through a pull request**, and GitHub refuses the merge until the `check` job passes (ruleset `main`, active from 10 Nov). Nobody can push to `main` directly.
- **The owner merges.** He first asks the review session to check each builder pull request.
- **Native code** (Kotlin, Swift) waits for both native builds, and for a review by a session that did not write the code.
- **Legal or privacy text** is marked `NEEDS OWNER REVIEW` and waits for the owner's reading.

## The work queue (owner's order, 10 Nov)

The repairs come from the review of `main` on 10 Nov. Each round gets a brief in [briefs/](briefs/) before a builder starts; a round with no brief yet is not ready to build. A builder writes its report on this page, under its own heading `## Report: <round or group>`, with what was built, what was not verified, and anything marked `NEEDS OWNER REVIEW`.

| # | Work | What it covers | State |
|---|---|---|---|
| 1 | **Run on phones** | The Android emulator on the owner's Mac, then his Android phone (from 12 Nov); the iPhone tests owed for Part 1, 1.6 and 1.7; then test sections D to J. One fix round follows what they find. | The owner's sittings. Test builds: [release/try-a-build.md](release/try-a-build.md). |
| 2 | **Repair round A: evidence that survives** | The bookkeeping file (`session.json`) written safely and rebuilt from the signed records if unreadable; free storage watched, stage one; one file per signing key, never overwritten. | **Being built.** Groups 1 and 2 are in pull requests, each waiting for the native builds and a native review; group 3 follows. Reports below. Brief: [briefs/2026-11-10-repair-round-a.md](briefs/2026-11-10-repair-round-a.md). |
| 3 | **Repair round B: safety that keeps running** | Android video that notices a failed recorder and restarts; body-cam's start check; "My phone is being taken" restarting by itself after the app is killed; time limits on server calls; a phone with no SIM set for texts; the alert sent at once with the link following; the lock at once. | Brief to be written; two points are open with the owner (below). May run beside round A. |
| 4 | **Our own web address** | A `.org` and a `.in` name in front of the server and the live page, with a short list of addresses for the app to try. | The owner is choosing the names. |
| 5 | **Tidy-ups** | The small batch (dependencies listed, `.gitignore`, the server's migration record, pinned build tools), and native builds on every pull request so the merge rule can require them. | Brief to be written. |
| 6 | **Documents** | [SPEC.md](SPEC.md) rewritten as settled text with a separate change log; a note on what each proof in a bundle shows. | Not started. |
| 7 | **Group 3.1, the alerts protocol** | Documents only. Its brief gains: our own web address, limits per caller on the server, the secret code's waits off the phone's clock, and phone tests of the silence alarm's two assumptions. | Brief to be revised, then 3.1. |

**Round 2, where it stands** (brief: [briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md)):

| Part and group | State |
|---|---|
| 1.1 to 1.7 | Merged. Reports: [handoff/round-2-part-1.md](handoff/round-2-part-1.md). Not yet run on a phone. |
| 2.1 to 2.3, cloud copies (Google Drive, iCloud Drive) | Paused. Also needs Parts C and D of the owner's setup. |
| 3.1, protocol `docs/spec/alerts.md` | Next documents work, after its brief is revised (row 7). Needs the owner's review before any Part 3 code. |
| 3.2 to 3.5, server, pairing, receiving, silence alarm | Paused. The push secrets are in Supabase under the names `APNS_AUTH_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` and `FCM_SERVICE_ACCOUNT_JSON`; accept the push key with or without line breaks. `google-services.json` goes to EAS as the secret file `GOOGLE_SERVICES_JSON`. |
| 4, first-open walkthrough | Paused. Research: [research/power-off-locks.md](research/power-off-locks.md). |

## Decided on 10 Nov, not yet built

The decisions are in [SPEC.md](SPEC.md); this list says only where to look.

- **"My phone is being taken" locks at once** and sends its alert at once, with the live link following (SPEC 5.4). Group 1.7 built a lock that waits; round B changes it.
- **The owner's answers on group 1.7** (#43): the reminder's third line and its place at the top of the page are accepted; the app says that Saakshi's lock needs the PIN only after a phone test confirms it; the Play listing says the lock openly, with the uninstall step.
- **Storage** in two stages (SPEC, section 4, "Storage").
- **Body-cam** shows a start check and goes dark only when recording is confirmed; Android video restarts by itself if the recorder fails (SPEC, body-cam mode).
- **The bundle is described as several proofs**, each saying what it shows; motion readings and two time proofs come before the public release (SPEC E3).
- **Proposed, not decided:** the microphone rule in "My phone is being taken"; whether body-cam may go dark without a position; time and place stamped on the picture (SPEC marks each **Proposed**).

## Owner questions

Builders add questions here as `- [ ] (Round or stream) question`. Answered questions move to [handoff/owner-questions-answered.md](handoff/owner-questions-answered.md).

- [ ] (Repair A) **Where body-cam's sound-only recording stops, and where Pocket recording stops.** The brief and the SPEC say that at the keep-free amount body-cam drops to sound only "so a recording that would have stopped carries on for hours", and "then" stops. Built so: body-cam's sound carries on **below** the keep-free amount, down to the 300 MB floor, and stops there; with the setting off, body-cam stops at the keep-free amount. **Pocket recording stops at the keep-free amount.** So a body-cam recording that has become sound outlasts a Pocket recording started at the same moment. Sound takes about 30 to 60 MB an hour, so it eats little of the room kept free. Is this what you meant, or should Pocket recording also go on to the floor, or body-cam's sound stop sooner? **I recommend keeping it as built.**
- [ ] (Repair A) **The iPhone evidence camera's rate is not known.** It records through the phone's own movie recorder at 720p, at a rate Saakshi does not set. For "Room for about …" and its warnings I assumed 12 Mbit/s, on the high side so that the app promises less time rather than more. Two ways to make it real: tell me the size and length of a video you recorded with the evidence camera on your iPhone, and I will put the measured rate in; or let me set the rate (3 Mbit/s, as body-cam's), which changes the evidence camera's files and so needs your word. **I recommend the measurement first.**
- [ ] (Repair A) **Photos at the floor.** The brief speaks of the evidence camera's video. I also made the camera refuse a photo when the phone is at or below the 300 MB floor, saying why, because the floor is "never recorded into" and a photo's record must be writable too. Keep, or let photos through?
- [ ] (Repair A) **Android reads a slightly generous figure.** The file library's call gives every unallocated byte on Android (`File.getFreeSpace`), including any the system keeps back from apps; `getUsableSpace` is the exact one. The floor's margin covers the difference as far as I can tell, but I can't measure it without a phone. A three-line native read would make it exact. **I recommend adding it in repair round B's native work,** not here, since the brief asked for the file library's call.
- [ ] (Repair A) **The hash report's words for "low-battery" are out of date.** `src/modules/evidence/export/contents.ts` still says "stopped and saved by the app at 3% battery". Since format 0.9 that reason means the file was closed at 5% and a new one carried on. The hash report goes with the certificate, so I did not reword it without you. Shall I, as: "closed by the app at 5% battery; recording carried on in the next file"?
- [ ] (Repair A) **Wording, `NEEDS OWNER REVIEW`:** everything in the new `storage.json` (English and Hindi), `ended.storageSoundOnly` and `ended.storageFull` in `record.json`, and `storage.*` in `settings.json`.

- [ ] (Fix round 1) **Export (group 9): three things built so.** (1) A bug-mode or other sound-only record's button is "Share sound". (2) An evidence-camera record with several photos or videos shares each from its own card, since the share sheet takes one file. (3) The bundle's file and folder names are in English in both languages of the app. Right, or change any?
- [ ] (Fix round 1) **README and the review session's walkthrough (group 9).** The walkthrough isn't in the repository, so the bundle's README (English and Hindi) couldn't be checked against it. Please compare them, or point me to the walkthrough.
- [ ] (Round 2, review session) **Built so, please confirm.** (1) The secret code can be reset with the phone's passcode only while nothing is running (otherwise whoever holds the phone and its passcode could reset it and switch off "My phone is being taken"). (2) "Cannot be stopped" is worded as "can only be stopped in Saakshi with the code", because force-quit, switch-off and airplane mode remain. (3) The silence alarm's heartbeat is separate from location updates; it says the phone has stopped reporting, not that anything has happened; and a "reporting again" message follows. (4) SMS contacts get no text from the silence alarm (our server sends no SMS; a gateway costs money and needs DLT registration): only those who open the link see it. (5) Body-cam uploads use the same lengthening schedule as Pocket recording. (6) The recordings link is public to whoever holds it, set only for shares the user starts. (7) Notifications go directly through Apple and Google from our own server, not through Expo's push service. (8) Positions to Saakshi contacts are end-to-end encrypted; the live link for SMS contacts stays readable by our server, as today.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

## Report: repair round A

Brief: [briefs/2026-11-10-repair-round-a.md](briefs/2026-11-10-repair-round-a.md). One builder, three pull requests. Nothing here has run on a phone.

### Group 2: free storage, stage one (branch `repair-a/2-free-storage`)

**State:** in a pull request, from `main` as it was before group 1 merged (it does not need group 1's code; the two touch the same handoff and wording files, which I will bring together when group 1 merges). Typecheck, lint and 648 tests pass. It changes native code (Kotlin, Java, Swift), so it waits for both native builds and for **a review by a session that did not write it**. The bundle format goes from 0.9 to **0.10**.

**What was built.**
1. **Reading free space** (`src/platform/storage/read.ts`), through `Paths.availableDiskSpace`. What each phone reports there, read in expo-file-system 58.0.10:
   - **iPhone:** `FileManager.attributesOfFileSystem[.systemFreeSize]`, the file system's own count of free bytes. iPhone's other figures (`volumeAvailableCapacityForImportantUsage`, `…ForOpportunisticUsage`) add space iOS could clear by removing caches. The one used does not count that, so the real room can be more than Saakshi says, not less on that account. I kept the file library's figure, as the brief asked, and because it errs on the safe side.
   - **Android:** `File.getFreeSpace()`, every unallocated byte, including any kept back from ordinary apps. It can be slightly more than Saakshi can write (owner question above).
   - A reading that fails is "unknown": nothing is stopped or refused because of it, and the screen says so.
2. **The safety floor: 300 MB, confirmed.** What can be counted comes to about 75 MB at worst: about 25 seconds of writing between a reading and the recorder actually stopped (free space is read every 10 seconds; stopping takes up to about 5; iPhone's writers hold up to one 10-second segment): about 19 MB at body-cam's highest rate and about 40 MB at the rate assumed for the iPhone evidence camera; up to about 30 MB for the index that a `.mov` or an Android MP4 writes when it closes (a few MB an hour; not measured); and about 5 MB for the record, the signature and the bookkeeping written beside itself. The rest of the 300 MB is for what Saakshi can't measure: other apps and the phone writing at the same moment, and Android's figure being generous. 300 MB is four times what can be counted. The reasoning is in `limits.ts`.
3. **The keep-free amount:** a setting under Settings → Storage, with 1, 2, 5, 10 and 20 GB. It starts at **5 GB**, from one function (`startingKeepFreeBytes`), which is given the phone's total size so that the SPEC's **Proposed** refinement (5 GB or a tenth of the phone, whichever is smaller) is a one-line change there if you decide for it. It is not built.
4. **What the user is told:** a card the first time body-cam or Pocket recording opens (put away with "I understand"), and always under Settings → Storage: that these are made for long recordings; an hour of body-cam video is about 1.4 GB (720p; about 2.8 GB at 1080p); an hour of sound is about 60 MB on iPhone and about 30 MB on Android; how much is kept free; what happens there and at the floor; and that "My phone is being taken" goes past the keep-free amount. Settings → Storage also shows how much is free now and about how much Saakshi's recordings take.
   - **The rates** are the ones the recorders are set to, with a tenth added for the container and an encoder running over: video 3 Mbit/s at 720p and 6 Mbit/s at 1080p plus 128 kbit/s of sound; sound 128 kbit/s on iPhone and 64 kbit/s on Android. None is measured on a phone, so the app says "about".
5. **Always shown:** "Room for about 3 h 20 min of video" (or sound) on the Start screen of body-cam, Pocket recording and the evidence camera's video, read again every 10 seconds. Body-cam and Pocket recording count down to the keep-free amount; the evidence camera counts down to the floor, since that is where it stops.
6. **Warnings** at about 30 and 10 minutes left, as words on the screen, including on body-cam's dark locked screen, in the same grey text as the battery note. See "The dark screen" below.
7. **At the keep-free amount:**
   - **Body-cam drops to sound only** (a setting, on by default). The video file is closed cleanly with the new end reason `storage-sound-only`, and sound carries on in a new file of the same recording. iPhone: a small change to `BodyCamRecorder.swift` that reuses the path it already takes when the app leaves the screen, so the sound has no gap; the camera is stopped and does not come back. Android: `CameraRecorder.kt` closes the video file, lets the camera go, and starts an ADTS AAC file in the same foreground service, checkpointed at the end of whole frames (`AdtsFrames.java`).
   - Then, at the floor, the recording **stops cleanly** with the end reason `storage-full`. With "sound only" switched off, body-cam stops at the keep-free amount.
   - **Pocket recording** stops cleanly at the keep-free amount.
   - **"My phone is being taken"** records past the keep-free amount and stops at the floor. If it starts over a Pocket recording already running, that recording goes on to the floor too.
   - **The evidence camera** shows the warnings, says once when the phone is below the keep-free amount, and stops a video cleanly only at the floor.
8. **Bundle format 0.10:** the two new end reasons, in `docs/spec/evidence-bundle.md` (sections 3, 4, 10 and 12), in `tools/verify-bundle.mjs` (which fails either reason in a record of an older version, `storage-sound-only` outside body-cam, and either in a file marked cut off), in the record screen's "Ended:" line and in the hash report, in English and Hindi. A 0.9 bundle still verifies.
9. **Starting with too little room:** body-cam and Pocket recording say so and do not start at or below the keep-free amount; the evidence camera at or below the floor. "My phone is being taken" starts above the floor; below it, its recording does not start and the rest of it (the alert, location) goes ahead as before.

**The dark screen: what each phone allows, as far as I can tell without a phone.** Built: words on the screen only.
- **Vibration.** `app.config.ts` removes Android's `VIBRATE` permission from every build ("nothing in the app vibrates"), so the app can't vibrate on Android today. I did not change that: repair round B decides how a dark screen tells the wearer something. The light tap the swipe uses (`src/platform/haptics`) needs no permission, but follows the phone's touch-feedback setting, and I do not know whether it fires with the screen dimmed. On iPhone, I believe haptics are off while an app records sound unless the app asks for them; I have not checked this on a phone.
- **Sound.** A sound played by the phone would be picked up by the microphone and end up in the recording. I did not add one.
- **Notification.** Android: body-cam's recording notice is on a quiet channel by design. A second notice on a channel that sounds or vibrates is possible, and needs the notification permission the app already asks for; whether it is felt through a pocket is for a phone to show. iPhone: the app has no notification library today, and adding one is a dependency decision. Not built.

**What was found.**
- The iPhone evidence camera's rate is not set by Saakshi (owner question).
- Android's free-space figure is generous (owner question).
- The hash report's words for `low-battery` are out of date (owner question).
- When "My phone is being taken" is running and its recording stops at the floor, its own screen still shows the recording as on: it does not listen for the recorder stopping. Round B's work on that feature is the place for it.
- `session.json` and the settings files on this branch are still written the old way; group 1 changes that.

**Tests:** the time-left sum and its rounding; each threshold, each said once; the order (warn, sound only, warn again, stop at the floor) for body-cam; stopping at the keep-free amount with "sound only" off; "My phone is being taken" passing the keep-free amount and stopping at the floor, including when it starts over a Pocket recording; starting refused below the amount, and allowed for "My phone is being taken" down to the floor; a failed reading never stopping or refusing anything; both end reasons in signed records, in a bundle that passes `tools/verify-bundle.mjs`, and refused in a 0.9 record; the Android and iPhone engines handing over to a sound file; the "Room for about …" line, the first-time card and the Storage page. `modules/saakshi-evidence/verify/adts-frames.sh` checks the Android frame reader on a JVM at every possible cut of a stream of frames (it runs in the native-build workflow).

**Not verified** (only a phone, or the native builds, can show):
- That the Kotlin and Swift compile: the native builds on the pull request show it.
- The drop to sound only on either phone: that the video file closes cleanly, that sound really carries on, how long the gap is on Android, and that the Android camera closing does not disturb the foreground service.
- That the body-cam screen and the evidence camera do what their tested parts say when put together: the pieces are tested, the screens' wiring is not.
- Real file sizes for an hour, so the "about" figures.
- That the watching carries on with the screen locked: on iPhone it relies on the app staying alive while it records sound, on Android on the foreground service, as the battery watching does.
- What the phones really report as free, and how each behaves near the floor.
- The owner's tests: "Room for about …" on each Start screen; the storage page; and, on a test phone with its storage filled, body-cam dropping to sound only and then stopping cleanly.

**`NEEDS OWNER REVIEW`:** the wording listed in the owner question above.

## Shell conventions (for every stream)

Set up by Stream A in the shell pull request. Follow these so streams don't collide.

- **Routes** live in `src/app/`. The five tabs are `src/app/(tabs)/{record,sos,guides,help,settings}/`, each its own stack (`_layout.tsx` plus `index.tsx`). Add a tab's screens inside its folder. Full-screen flows that hide the tab bar (the camera, the code pad) go at the root of `src/app/`. `/` redirects to `/record`.
- **Screens stay thin.** Feature logic and feature UI live in `src/modules/<name>/` and are imported only through `@/modules/<name>` (its `index.ts`). ESLint (`no-restricted-imports`) rejects `@/modules/<name>/<file>` imports.
- **Strings:** i18next with one namespace per area: `src/i18n/locales/{en,hi}/{common,settings,record,sos,guides,help}.json`. Each stream owns its namespace file. To add a namespace, add the JSON for both languages and list it in `src/i18n/resources.ts`. Keys are typed: `useTranslation('sos')` then `t('call112')`, and a key missing from English fails `tsc`. `src/i18n/__tests__/resources.test.ts` fails if Hindi lacks a key, has an empty string or drops a `{{placeholder}}`.
- **Language:** the phone's language by default (the first of its preferred languages that we support, else English); Settings → Language overrides it. Preferences are stored in `preferences.json` in the app's documents directory (`src/preferences/`).
- **Theme:** `useTheme()` from `@/theme` gives `{ scheme, colors }`; tokens (`spacing`, `radius`, `typography`, `touchTarget = 56`) are in `src/theme/tokens.ts`. Body text is 18 pt, nothing under 16 pt. `src/theme/__tests__/theme.test.ts` checks WCAG contrast for both palettes; keep it passing if you change colours.
- **Shared components** in `src/components/`: `Screen`, `AppText` (variants `small`, `body`, `label`, `heading`, `title`, `mono`), `Button` (`primary`, `secondary`, `danger`; at least 56 pt tall), `Card`, `OptionGroup`.
- **Tests:** `npx jest` (preset `jest-expo`, Testing Library for React Native v14, where `render` and `fireEvent` are async). Name tests `*.test.ts(x)` and put them in `__tests__/` beside the code (other files there, such as fakes, are not run as tests), never inside `src/app/` (every file there is a route). CI runs typecheck, lint and tests.
- **`expo-doctor`:** two of its checks need `exp.host` and `reactnative.directory`, which this cloud environment can't reach; the remaining checks pass.

## Where everything else is

| It used to be here as | It is now |
|---|---|
| "Round 2", groups 1.1 to 1.7, and the start prompts | [handoff/round-2-part-1.md](handoff/round-2-part-1.md) |
| "Fix round 1" | [handoff/fix-round-1.md](handoff/fix-round-1.md) |
| "Stream A" to "Stream D", including the owner's one-time release steps | [handoff/streams-r1-r2.md](handoff/streams-r1-r2.md) |
| Answered owner questions | [handoff/owner-questions-answered.md](handoff/owner-questions-answered.md) |
| "Release checklist" | [release/checklist.md](release/checklist.md) |
| "How to try a build on your Mac" | [release/try-a-build.md](release/try-a-build.md) |

Comments in the code and messages in the workflows that cite "BUILD_HANDOFF.md, group 1.6" or "Stream D, step 4" mean those files.

**When a round finishes,** its reports move from this page to a new file in [handoff/](handoff/), and this page keeps only the round's state.

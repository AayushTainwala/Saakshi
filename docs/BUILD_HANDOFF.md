# Build Handoff

The pickup file for build sessions: where things stand, what is next, and the questions open with the owner. Read [CLAUDE.md](../CLAUDE.md) first. This page is kept short. Reports of finished rounds are in [handoff/](handoff/) and are listed at the end.

## Where things stand (14 Nov 2026)

- **On `main`:** R1 and R2 (#1 to #9), fix round 1 (#16 to #27), round 2, Part 1 with groups 1.6 and 1.7 (#31 to #36, #41, #43), and repair round A, groups 1 to 3 (#45, #46, #47). Typecheck, lint, 695 tests and both native builds pass. The bundle format is 0.11.
- **What has run on a phone:** the evidence camera and body-cam as they were on 5 Nov, on the owner's iPhone. Nothing built since then has run on a phone, and the Android app has never run on a phone or an emulator. The owner has chosen to skip the emulator; his Android phone is late, and Android first runs on it when it arrives. Treat every "Not verified" note in the archived reports as still open.
- **The spec is settled text.** [SPEC.md](SPEC.md) states each feature once, as decided today, with its state (built, to build, later). The history is in [SPEC_CHANGELOG.md](SPEC_CHANGELOG.md). Section numbers and module codes did not change, so comments in the code that cite them still point to the right place. When the spec changes, add a line to the change log in the same pull request.
- **The builder's next piece is "when a recording stops by itself"** (the owner's decisions of 13 and 14 Nov): [briefs/2026-11-14-when-a-recording-stops.md](briefs/2026-11-14-when-a-recording-stops.md). It reworks the storage behaviour built in repair round A.
- **New feature code is otherwise paused** (owner, 10 Nov) until repairs 1 to 4 below are done. Group 3.1 (documents only) may go ahead. Parts 2, 3 and 4 of round 2 wait.
- **Pace:** no deadline. The next goal is a beta for about 50 testers on iPhone and Android ([BUILD_PLAN.md](BUILD_PLAN.md), "Road to the beta").

## How work is merged

- **Every change to `main` goes through a pull request**, and GitHub refuses the merge until the `check` job passes (ruleset `main`, active from 10 Nov). Nobody can push to `main` directly.
- **The owner merges.** He first asks the review session to check each builder pull request.
- **Native code** (Kotlin, Swift) waits for both native builds, and for a review by a session that did not write the code.
- **Legal or privacy text** is marked `NEEDS OWNER REVIEW` and waits for the owner's reading.

## The work queue (owner's order, 10 Nov; updated 14 Nov)

The repairs come from the review of `main` on 10 Nov. Each round gets a brief in [briefs/](briefs/) before a builder starts; a round with no brief yet is not ready to build. A builder writes its report on this page, under its own heading `## Report: <round or group>`, with what was built, what was not verified, and anything marked `NEEDS OWNER REVIEW`.

| # | Work | What it covers | State |
|---|---|---|---|
| 1 | **Run on phones** | The owner's Android phone (when it arrives; no emulator sitting); the iPhone tests owed for round 2, Part 1, groups 1.6 and 1.7, and repair round A; then test sections D to J. One fix round follows what they find. | The owner's sittings; the review session makes the test page. It carries the rate measurements and the owner's four parked questions. Storage tests wait for the build after row 2b. Test builds: [release/try-a-build.md](release/try-a-build.md). |
| 2 | **Repair round A: evidence that survives** | The bookkeeping file (`session.json`) written safely and rebuilt from the signed records if unreadable; free storage watched, stage one; one file per signing key, never overwritten. | **Merged on 10 Nov** (#45, #46, #47), each reviewed by a session that did not write it. Report: [handoff/repair-round-a.md](handoff/repair-round-a.md). There is no separate follow-up: its two items (signed records written in one step; the keep-free amount starting at a tenth of a small phone) are in row 2b. |
| 2b | **When a recording stops by itself** | The storage rework (no sound-only step; a 300 MB floor for video and a last floor of about 50 MB; starting below the keep-free amount); the battery reserve; two efficiency switches; a time limit with a vibration warning; "My phone is being taken" exempt; signed records written in one step; the hash report's low-battery words; a new bundle-format version. | **Ready to build.** Brief: [briefs/2026-11-14-when-a-recording-stops.md](briefs/2026-11-14-when-a-recording-stops.md). The owner decided on 13 Nov that all of it is built together, as the builder's next piece. |
| 3 | **Repair round B: safety that keeps running** | Body-cam's start check; a camera that keeps failing part-way (the owner's design of 14 Nov); "My phone is being taken" restarting by itself after the app is killed, locking at once, its microphone rule, and noticing when its recording stops; the alert sent at once with the link following; time limits on server calls; a phone with no SIM set for texts; a file saved but never signed, signed late; the "Share everything that is left" ZIP and the size of a damaged recording; Android's exact free-space reading; the items under "Found in repair round A" below. | Brief to be written by the review session; every decision it needs is made. May run beside row 2b where the two do not touch the same files. |
| 4 | **Our own web address** | A `.org` and a `.in` name in front of the server and the live page, with a short list of addresses for the app to try. | The owner chose `saakshiapp.org` and `saakshiapp.in`, to be bought before the beta build goes to testers. Before that: a comparison of Supabase's custom-domain add-on with a relay of our own, and the brief. |
| 5 | **Tidy-ups** | The small batch (dependencies listed, `.gitignore`, the server's migration record, pinned build tools), and native builds on every pull request so the merge rule can require them. | Brief to be written. |
| 6 | **Documents** | [SPEC.md](SPEC.md) rewritten as settled text with a separate change log; the owner's features-by-build table; a note on what each proof in a bundle shows. | The spec and its change log are done (14 Nov). The table is the review session's next piece. The note on proofs is not started. |
| 7 | **Group 3.1, the alerts protocol** | Documents only. Its brief gains: our own web address, limits per caller on the server, the secret code's waits off the phone's clock, and phone tests of the silence alarm's two assumptions. | Brief to be revised, then 3.1. |
| 8 | **Look and feel** | A review of the most-used camera, sound-recorder and gallery apps, then mock-ups for the owner to choose from, the records list first (SPEC section 9). | The review session's work, beside the repairs. Nothing visual is built until the owner has chosen. |

**Round 2, where it stands** (brief: [briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md)):

| Part and group | State |
|---|---|
| 1.1 to 1.7 | Merged. Reports: [handoff/round-2-part-1.md](handoff/round-2-part-1.md). Not yet run on a phone. |
| 2.1 to 2.3, cloud copies (Google Drive, iCloud Drive) | Paused. Also needs Parts C and D of the owner's setup. |
| 3.1, protocol `docs/spec/alerts.md` | Next documents work, after its brief is revised (row 7). Needs the owner's review before any Part 3 code. |
| 3.2 to 3.5, server, pairing, receiving, silence alarm | Paused. The push secrets are in Supabase under the names `APNS_AUTH_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` and `FCM_SERVICE_ACCOUNT_JSON`; accept the push key with or without line breaks. `google-services.json` goes to EAS as the secret file `GOOGLE_SERVICES_JSON`. |
| 4, first-open walkthrough | Paused. Research: [research/power-off-locks.md](research/power-off-locks.md). |

## Decided, not yet built

The decisions are in [SPEC.md](SPEC.md), each marked "to build" with the round that builds it; this list says only where to look.

- **Row 2b, "when a recording stops by itself"** (owner, 13 and 14 Nov): SPEC section 4, "When a recording stops by itself"; signed records in one step (SPEC E1, "Recordings that survive a fault"); the hash report's low-battery words (SPEC E4).
- **Row 3, repair round B:**
  - Body-cam shows a start check and goes dark only when recording is confirmed; a position is shown but is not a condition (SPEC, body-cam mode).
  - A camera that keeps failing part-way, in the owner's four steps of 14 Nov, on both phones. It replaces the restart rule of 10 Nov and the guard that had been proposed. Video is not tried while the question is on screen (SPEC, body-cam mode).
  - "My phone is being taken" locks at once and sends its alert at once, with the live link following; the microphone rule; restarting after the app is killed (SPEC 5.2 and 5.4). Group 1.7 built a lock that waits.
  - A phone with no SIM set for texts (SPEC 5.5).
  - A file saved but never signed is signed when the app next opens, from its start note; a damaged recording's ZIP button and size (SPEC E1, "Recordings that survive a fault").
  - Android's exact free-space reading (SPEC section 4, "Storage").
- **The owner's answers on group 1.7** (#43): the reminder's third line and its place at the top of the page are accepted; the app says that Saakshi's lock needs the PIN only after a phone test confirms it; the Play listing says the lock openly, with the uninstall step (SPEC 5.4).
- **The bundle is described as several proofs**, each saying what it shows; the key check before the beta; motion readings and two time proofs before the public release (SPEC E1 and E3).
- **Time and place on the picture:** a stamped copy when sharing, and no setting to stamp the original (SPEC E1). After the repairs.
- **The helpline list sealed** before the public release (SPEC G3).

## Found in repair round A, for later rounds

From the builder's report ([handoff/repair-round-a.md](handoff/repair-round-a.md)). None is fixed yet. All are for repair round B unless marked.

- **A file that fails to seal, followed by one that seals:** the later record's number is one too high, and `tools/verify-bundle.mjs` fails the bundle ("a record is missing or out of order"). Older than round A. It goes with the late signing of unsigned files.
- **"My phone is being taken" does not notice its recording stopping** at the storage floor: its screen still shows the recording as on. With the restart work.
- **A recording in progress keeps its own copy of the index** and writes that, so a check result or a copy noted meanwhile is lost at its next save. Witness messages are safe (they are in the log).
- **Android's `VIBRATE` permission is removed from every build** (`app.config.ts`). **Row 2b restores it,** since its time-limit warning is a vibration; round B's failing-camera alert then uses it too.
- **The warnings on body-cam's dark screen are words only.** Row 2b adds the time limit's vibration; round B adds the failing camera's vibrations, lit screen and notification. The builder's notes on vibration, sound and notifications on each phone are in the report.

## Owner questions

Builders add questions here as `- [ ] (Round or stream) question`. Answered questions move to [handoff/owner-questions-answered.md](handoff/owner-questions-answered.md). The questions of repair round A that the owner answered on 13 and 14 Nov are there now.

**Parked by the owner, or waiting for a phone.** Nothing for a builder to do; build nothing that depends on the answer.

- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept? *Parked by the owner (14 Nov) until after the beta.*
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card. *Parked by the owner (13 Nov): he answers with the next test results. The SPEC's sentence stays as it is until then.*
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight. *Parked by the owner (13 Nov): he answers with the next test results.*
- [ ] (Repair A) **README wording, `NEEDS OWNER REVIEW`:** the paragraph a bundle's README gains, in English and Hindi, when a recording was signed by more than one key (`src/modules/evidence/export/readme.ts`), and the hash report's "Signing keys" lines (`export/contents.ts`). *Parked by the owner (13 Nov): he answers with the next test results.*
- [ ] (Repair A) **A key that is still there but can't be used.** Group 3 notices a key that is *gone*: the phone's security chip holds no key (the app's files on a new phone, say), so a new one is made. It does not handle a key the chip still lists but can no longer use (a damaged key store). There, signing fails as it does today: recording carries on, the file is saved and fingerprinted, and its record is not signed until signing works again. Telling "can't be used for good" from "can't be used this minute" needs native code and a phone to try it on, and making a new key on a wrong guess would throw a good key away for nothing. **I recommend leaving it for now** and deciding after the phone tests show whether it ever happens. One thing to know: on iPhone, a key the Secure Enclave can no longer restore stops the app from making a new one at all, as the code stands (`DeviceKey.swift`, `create` loads the old key first). I have not seen it happen; I read it in the code. *The owner (14 Nov): decided after it has been tried on a real phone. Leave as built until then.*

**Wording, collected for the owner's one wording round** (owner, 6 Nov: all wording is reviewed together, not string by string).

- [ ] (Repair A) **Wording, `NEEDS OWNER REVIEW`:** the rebuilt notice, the damaged screen and the "no signed record" line, in English and Hindi (listed in the report below). In Hindi "index" is "सूची".
- [ ] (Repair A) **Wording, `NEEDS OWNER REVIEW`:** everything in the new `storage.json` (English and Hindi), `ended.storageSoundOnly` and `ended.storageFull` in `record.json`, and `storage.*` in `settings.json`. *Much of this wording changes with "when a recording stops by itself"; that builder lists the new strings.*

**Open.**

- [ ] (Fix round 1) **README and the review session's walkthrough (group 9).** The walkthrough isn't in the repository, so the bundle's README (English and Hindi) couldn't be checked against it. Please compare them, or point me to the walkthrough. *The review session owes the walkthrough of the owner's exported bundles.*
- [ ] (Round 2, review session) **Built so, please confirm.** (1) The secret code can be reset with the phone's passcode only while nothing is running (otherwise whoever holds the phone and its passcode could reset it and switch off "My phone is being taken"). (2) "Cannot be stopped" is worded as "can only be stopped in Saakshi with the code", because force-quit, switch-off and airplane mode remain. (3) The silence alarm's heartbeat is separate from location updates; it says the phone has stopped reporting, not that anything has happened; and a "reporting again" message follows. (4) SMS contacts get no text from the silence alarm (our server sends no SMS; a gateway costs money and needs DLT registration): only those who open the link see it. (5) Body-cam uploads use the same lengthening schedule as Pocket recording. (6) The recordings link is public to whoever holds it, set only for shares the user starts. (7) Notifications go directly through Apple and Google from our own server, not through Expo's push service. (8) Positions to Saakshi contacts are end-to-end encrypted; the live link for SMS contacts stays readable by our server, as today.

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
| "Report: repair round A" | [handoff/repair-round-a.md](handoff/repair-round-a.md) |
| "Round 2", groups 1.1 to 1.7, and the start prompts | [handoff/round-2-part-1.md](handoff/round-2-part-1.md) |
| "Fix round 1" | [handoff/fix-round-1.md](handoff/fix-round-1.md) |
| "Stream A" to "Stream D", including the owner's one-time release steps | [handoff/streams-r1-r2.md](handoff/streams-r1-r2.md) |
| Answered owner questions | [handoff/owner-questions-answered.md](handoff/owner-questions-answered.md) |
| "Release checklist" | [release/checklist.md](release/checklist.md) |
| "How to try a build on your Mac" | [release/try-a-build.md](release/try-a-build.md) |
| The dated history of the spec | [SPEC_CHANGELOG.md](SPEC_CHANGELOG.md); the ledger of the rewrite is [handoff/spec-rewrite-2026-11-14.md](handoff/spec-rewrite-2026-11-14.md) |

Comments in the code and messages in the workflows that cite "BUILD_HANDOFF.md, group 1.6" or "Stream D, step 4" mean those files.

**When a round finishes,** its reports move from this page to a new file in [handoff/](handoff/), and this page keeps only the round's state.

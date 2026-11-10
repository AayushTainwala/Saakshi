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
| 2 | **Repair round A: evidence that survives** | The bookkeeping file (`session.json`) written safely and rebuilt from the signed records if unreadable; free storage watched, stage one; one file per signing key, never overwritten. | **Ready to build.** Brief, with its start prompt: [briefs/2026-11-10-repair-round-a.md](briefs/2026-11-10-repair-round-a.md). |
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

- [ ] (Fix round 1) **Export (group 9): three things built so.** (1) A bug-mode or other sound-only record's button is "Share sound". (2) An evidence-camera record with several photos or videos shares each from its own card, since the share sheet takes one file. (3) The bundle's file and folder names are in English in both languages of the app. Right, or change any?
- [ ] (Fix round 1) **README and the review session's walkthrough (group 9).** The walkthrough isn't in the repository, so the bundle's README (English and Hindi) couldn't be checked against it. Please compare them, or point me to the walkthrough.
- [ ] (Round 2, review session) **Built so, please confirm.** (1) The secret code can be reset with the phone's passcode only while nothing is running (otherwise whoever holds the phone and its passcode could reset it and switch off "My phone is being taken"). (2) "Cannot be stopped" is worded as "can only be stopped in Saakshi with the code", because force-quit, switch-off and airplane mode remain. (3) The silence alarm's heartbeat is separate from location updates; it says the phone has stopped reporting, not that anything has happened; and a "reporting again" message follows. (4) SMS contacts get no text from the silence alarm (our server sends no SMS; a gateway costs money and needs DLT registration): only those who open the link see it. (5) Body-cam uploads use the same lengthening schedule as Pocket recording. (6) The recordings link is public to whoever holds it, set only for shares the user starts. (7) Notifications go directly through Apple and Google from our own server, not through Expo's push service. (8) Positions to Saakshi contacts are end-to-end encrypted; the live link for SMS contacts stays readable by our server, as today.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

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

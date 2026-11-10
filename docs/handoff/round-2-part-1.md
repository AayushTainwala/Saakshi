# Round 2, Part 1: builders' reports (groups 1.1 to 1.7, 7 to 10 Nov 2026)

> Archived from `docs/BUILD_HANDOFF.md` on 10 Nov 2026, word for word (links to other files adjusted for the new folder). It is a record of a finished round: read it for how something was built or why. The current state is in [BUILD_HANDOFF.md](../BUILD_HANDOFF.md).

Merged as #31 to #36, #41 and #43. "Owner questions" and "the release checklist" in the text below now mean [owner-questions-answered.md](owner-questions-answered.md), the open questions in [BUILD_HANDOFF.md](../BUILD_HANDOFF.md), and [../release/checklist.md](../release/checklist.md).

## Where things stood before the split (written 21 Oct to 9 Nov)

- **Round 2 (6 Nov 2026):** Part 1 built (groups 1.1 to 1.5, five stacked pull requests, #31 to #36), not yet run on a phone. Group 1.6, the owner's follow-ups of 9 Nov, merged (https://github.com/AayushTainwala/Saakshi/pull/41). Group 1.7 (locking the phone when "My phone is being taken" starts) built on `round-2/1-7-lock-screen`. See "Round 2" below.
- **Merged into `main`:** #1–#9. That is R1 and R2 as planned, apart from E3 and E7, plus the law checks against the Gazette of India (#9). Since then: the owner's docs and briefs (#10–#15), and fix round 1, groups 1, 2 and 2a (#16–#18; see "Fix round 1" below). Typecheck, lint, all tests and both native builds pass on `main`.
- **Pace:** no 24-hour deadline (owner, 21 Oct). The next goal is a beta for about 50 testers on iPhone and Android; see BUILD_PLAN.md, section 1, "Road to the beta".
- **First Release run (21 Oct, iOS only):** the owner set up iOS credentials and the App Store Connect API key with EAS (role App Manager). The EAS build succeeded; the **Submit to TestFlight step failed**. Its log is visible only to someone signed in to GitHub, so the cause isn't known yet. The owner is submitting that build from his Mac with `eas submit --platform ios --latest`. **Stream D:** find the cause and fix the workflow.
- **Owner's phone testing:** round 1 on iPhone through TestFlight, with a checklist and his notes on a claude.ai page (https://claude.ai/artifact/BQU34AZ76SbRZpBKE5iyc6). Android follows when his phone arrives (about 23 Oct). The review session turns his notes into fix work for the streams.
- **Streams:** each opens pull requests into `main`; the owner or a review session merges them.

## Round 2 (SOS redesign, Pocket recording, phone taken, Saakshi-to-Saakshi; decided 6 Nov 2026)

The owner's decisions after his SOS test are in `docs/SPEC.md` (sections 4, 5, 6), `docs/spec/evidence-bundle.md` (0.9) and `docs/BUILD_PLAN.md` ("Round 2"). The work, in parts, is **[docs/briefs/2026-11-06-round-2.md](../briefs/2026-11-06-round-2.md)**. Read it, then this section.

| Part and group | State |
|---|---|
| 1.1 Contacts keyboard bug | Merged: https://github.com/AayushTainwala/Saakshi/pull/31. Not yet run on a phone. |
| 1.2 Secret code, Settings | Merged: https://github.com/AayushTainwala/Saakshi/pull/32. Not yet run on a phone. |
| 1.3 SOS swipes, Pocket recording, "My phone is being taken" | Split in two, as the brief allows. Both merged. **A** (the page, the move, the quick trigger): https://github.com/AayushTainwala/Saakshi/pull/33. **B** ("My phone is being taken", Stop gating, the server migration): https://github.com/AayushTainwala/Saakshi/pull/34. Not yet run on a phone. |
| 1.4 Alerts (both links, battery level, calm Share my location) | Merged: https://github.com/AayushTainwala/Saakshi/pull/35. Not yet run on a phone. |
| 1.5 Low battery at 5%, bundle format 0.9 | Merged: https://github.com/AayushTainwala/Saakshi/pull/36. Not yet run on a phone. |
| 1.6 Follow-ups (passcode-only reset; battery only at 20% or less; Android 5% without a camera rebuild; recovery code; swipe distance; saving-mode GPS) | Merged: https://github.com/AayushTainwala/Saakshi/pull/41. Not yet run on a phone. |
| 1.7 Lock the phone when "My phone is being taken" starts (Android device admin, force-lock only; on-screen reminder), and two follow-ups to 1.6 | Built on `round-2/1-7-lock-screen`, pull request open. Google Play's policy was checked first: no rule forbids it (below). Not yet run on a phone. |
| 2.1–2.3 E7, Google Drive and iCloud Drive | Not started (needs the owner's Google Cloud project; owner's guide "Round 2 setup guide" is in his vault) |
| 3.1 Protocol `docs/spec/alerts.md` | Not started. **Documents only; needs the owner's review before Part 3 code.** May start with Part 1. |
| 3.2–3.5 Server, pairing, receiving, silence alarm | Not started (needs the Apple push key and Google's notification service) |
| 4 First-open walkthrough | Not started. Research for the phone-setup page is done: `docs/research/power-off-locks.md` (#29). Ship only the rows it marks primary and tested. |

**Part 1 review (7 Nov 2026).** #31 to #36 were merged into `main` on 7 Nov and reviewed there afterwards: typecheck and lint pass, 507 tests pass, CI and both native builds passed on each pull request that changed native code, and the two migrations on the live server match the repository. No legal or privacy text was changed. Nothing needs undoing. The open questions are in "Owner questions", `(Round 2)`. On 9 Nov the owner also confirmed two of the builders' "built so" calls: "I need help" goes at once after a full swipe (no countdown), and a file sealed after a cut-off carries no battery level. The swipe's distance changes in group 1.6.

Questions for the owner from this round go in "Owner questions" as `- [ ] (Round 2) …`. The builders' reports go under this heading, one `### Group n.n` each.

**Start prompt for Part 1** (model Opus, effort high):

> You are the builder for Saakshi round 2, Part 1. Read CLAUDE.md, docs/SPEC.md (sections 4, 5, 6), docs/spec/evidence-bundle.md, docs/BUILD_HANDOFF.md ("Round 2") and docs/briefs/2026-11-06-round-2.md. Work through groups 1.1 to 1.5 in order, one branch `round-2/<group>` and one pull request each, from the latest `main`. Each needs tests, green typecheck, lint and tests, green native builds, an updated handoff and plain test steps for the owner in the description. Raise questions in the handoff as `- [ ] (Round 2) …` and do not change scope.

**Start prompt for group 1.6** (follow-ups to Part 1; model Opus, effort high):

> You are the builder for Saakshi round 2, group 1.6. Read CLAUDE.md, docs/SPEC.md (sections 4, 5), docs/BUILD_HANDOFF.md ("Round 2", with the Part 1 reports) and docs/briefs/2026-11-06-round-2.md, group 1.6. Do group 1.6 only, on branch `round-2/1-6-follow-ups` from the latest `main`, in one pull request. It needs tests, green typecheck, lint and tests, green native builds, an updated handoff and plain test steps for the owner in the description. Raise questions in the handoff as `- [ ] (Round 2) …` and do not change scope.

**Start prompt for group 1.7** (after 1.6 is merged; model Opus, effort high):

> You are the builder for Saakshi round 2, group 1.7. Read CLAUDE.md, docs/SPEC.md (section 5.4), docs/BUILD_HANDOFF.md ("Round 2") and docs/briefs/2026-11-06-round-2.md, group 1.7. Start with its step 1 (Google Play's policy on device admin) and stop if a rule forbids this use. Then do group 1.7 only, on branch `round-2/1-7-lock-screen` from the latest `main`, in one pull request. It needs tests, green typecheck, lint and tests, green native builds, an updated handoff and plain test steps for the owner in the description. Raise questions in the handoff as `- [ ] (Round 2) …` and do not change scope.

**Start prompt for group 3.1 only** (the alerts protocol, documents only; model Opus, effort high; can run beside Part 1):

> You are the builder for Saakshi round 2, group 3.1. Read CLAUDE.md, docs/SPEC.md (sections 4, 5, 6), docs/BUILD_HANDOFF.md ("Round 2") and docs/briefs/2026-11-06-round-2.md. Do group 3.1 only: write docs/spec/alerts.md and open one pull request that changes documents only. Do not write app or server code. Mark every legal or privacy statement `NEEDS OWNER REVIEW`. Raise questions in the handoff as `- [ ] (Round 2) …`; do not change scope.

### Group 1.1: the keyboard covered the contacts form

**What was wrong.** Neither phone moved the page for the keyboard:
- **Android:** Expo SDK 58 always draws edge to edge (Android 16 makes it compulsory; Expo's `withEdgeToEdge` plugin no longer lets an app turn it off). With edge-to-edge drawing, Android no longer shrinks the window when the keyboard opens, so the keyboard simply sat over the bottom of the page.
- **iPhone:** React Native's ScrollView does nothing for the keyboard unless asked. Even when asked (`automaticallyAdjustKeyboardInsets`), it scrolls only the focused field into view, not the Add button under it (React Native 0.88, `RCTScrollViewComponentView.mm`, `_keyboardWillChangeFrame`).
- Also: a tap on Add while the keyboard was up only closed the keyboard; it took a second tap to add.

**What was built** (in the shared `Screen`, so every page with text fields gains it):
- The page measures where the keyboard's top edge is, and pads its own end by as much as the keyboard covers. So with the keyboard up, everything on the page, the contacts list included, can still be scrolled to.
- When a field is focused, the page scrolls so that the field, and the rest of its group (`KeyboardGroup`, new in `src/components`), are between the top of the page and the keyboard, 16 points clear of it. On the contacts screen the group is "Or type a number", the name, the number with its hint, and Add. If the group doesn't fit, as on a small phone with the name field focused, the focused field goes to the top and the group's end is cut off, never the field. It works the same for the number pad and the text keyboard (they differ in height), and for Hindi's longer labels, because it measures rather than assumes.
- It happens again when moving from one field to the next with the keyboard already up.
- If a phone does shrink its window for the keyboard after all, the padding comes off again.
- A tap on a button works the first time while the keyboard is up (`keyboardShouldPersistTaps="handled"`); a tap on empty space still closes the keyboard. This matters on iPhone, whose number pad has no key to close it.
- No new dependency, no new strings, no native code.

**Tests:** the arithmetic, with a small phone (667 points tall) and a large one (932), the number pad and the text keyboard, and English and Hindi label heights (`src/components/__tests__/keyboard.test.ts`). The contacts screen itself, on iPhone and on Android, with the phone's measurements played in: the padding, where it scrolls, moving between fields, Add working with the keyboard up, and Hindi (`src/modules/sos/__tests__/contactsKeyboard.test.tsx`).

**Not verified:** nothing has run on a phone. A test can't show where a real keyboard sits, so the owner's test (in the pull request) is the real check: on a small and a large phone, both keyboards, both languages. On an iPhone whose tab bar the page runs under, the padding may leave some extra empty space at the very end of the page; that is harmless.

**How Part 1's pull requests are stacked.** Each group needs the one before it (1.3's Stop needs 1.2's code; 1.4 and 1.5 build on 1.3). So each group's branch starts from the previous group's branch, and its pull request is opened against that branch, so that it shows only its own changes. Merge them in order, 1.1 first. After a merge, GitHub moves the next pull request onto `main`, or its base can be changed to `main` by hand.

### Group 1.2: the secret code, and Settings

**What was built:**
- **A new module, `src/modules/secretcode`.** Other modules ask it only two things: whether a code is set (`isSecretCodeSet`), and for the code before a Stop (`requireSecretCode({ reason })`). Nothing else knows how the code is kept. Group 1.3 wires every Stop to it; in this pull request nothing calls it yet, apart from Settings.
  - **Four digits.** Set, changed and removed in Settings. Changing or removing asks for the current code first. One digit four times (0000) and straight runs up or down (1234, 6789, 9876) are refused with a plain reason.
  - **Kept as a salted hash in the phone's secure storage** (`expo-secure-store` 58.0.2, MIT; the iPhone Keychain, "this device only", so never in iCloud Keychain or a backup; on Android, encrypted with a key in the Android Keystore). Never in `preferences.json`, never in a log. What is stored is a random salt and the SHA-256 of salt and code.
  - **Waits grow after wrong tries:** two cost nothing, then 30 seconds, 1, 2, 5, 15 and 30 minutes, then an hour each time. Each try is stored as wrong before the code is compared, so closing the app in the middle of a try doesn't undo it. The count and the wait's end are in the secure storage, so they survive closing the app and restarting the phone. The code screen counts the wait down in plain words ("Try again in 2 minutes").
  - **If the secure storage can't be read,** the code screen says so, and nothing is treated as "no code". Treating it as "no code" would let someone set a new code over the real one, or stop something.
  - **On iPhone, a reinstalled app starts with no code.** The Keychain keeps items after the app is deleted, so the app forgets a code left by an earlier install.
  - **One code screen** (`src/app/secret-code.tsx`, full screen over the tabs). It is used for entering, setting, changing and removing the code. `requireSecretCode` opens it and answers true for the right code, false if the user backs out. If no code is set when a Stop asks, the screen asks the user to set one first, and setting it lets the Stop go through (built so).
  - **Reset with the phone's passcode** (`expo-local-authentication` 58.0.2, MIT): "Forgot the code?" on the code screen, **only while nothing is running**: body-cam, Pocket recording (still called bug mode until 1.3) and live location are checked now, and "My phone is being taken" joins in 1.3. It is checked before the prompt and again after it. The prompt needs a phone with a screen lock; on a phone without one, the screen says to set a passcode first.
- **Settings** now has, above the items that were there: **Trusted contacts** (the editor moved from the SOS tab to `/settings/contacts`), **Live-location length** (1, 4, 8 or 24 hours, 4 by default), **Secret code**, and **Quick trigger** (the existing setup screen moved to `/settings/trigger`; group 1.3 rewrites it). Language, appearance, the details for certificates, and About stay. The export folder is chosen from a record, as before; it isn't a Settings item yet.
- **How each contact is reached:** each person now has a method, shown under their three ticks. Only "Text message (SMS)" can be chosen until group 3.3 adds the Saakshi app. The contacts file is now version 3. A version 2 list keeps every person and every tick, and everyone is reached by SMS (test).
- **The live-location card on the SOS tab** now uses the Settings length instead of its own choice ("For 4 hours (change this in Settings)").
- **App Review notes:** a short optional block for Face ID (`store/apple/review-notes.md`); all blocks still fit Apple's 4,000 bytes.

**What each platform's prompt accepts** (the brief asked):
- **iPhone:** `expo-local-authentication` uses Apple's `LAPolicy.deviceOwnerAuthentication` (read in its source, `ios/LocalAuthenticationModule.swift`). Apple: "User authentication with biometry, Apple Watch, or the device passcode … If biometry is available, enrolled, and not disabled, the system uses that first … When these options aren't available, the system prompts the user for the device passcode" ([Apple](https://developer.apple.com/documentation/localauthentication/lapolicy/deviceownerauthentication)). **So Face ID or Touch ID also resets the code when enrolled.** None of the policies Apple lists ([LAPolicy](https://developer.apple.com/documentation/localauthentication/lapolicy)) asks for the passcode alone. The app's Face ID permission text says Face ID is used only for this reset.
- **Android:** the library asks the system's biometric prompt for `BIOMETRIC_WEAK | DEVICE_CREDENTIAL` (`LocalAuthenticationModule.kt`). That means a fingerprint or face (Class 2 or 3) when enrolled, or the screen lock's PIN, pattern or password. Android can ask for the screen lock alone (`DEVICE_CREDENTIAL` by itself, from Android 11; "DEVICE_CREDENTIAL alone is unsupported prior to API 30", [BiometricPrompt.PromptInfo.Builder](https://developer.android.com/reference/androidx/biometric/BiometricPrompt.PromptInfo.Builder)). The library doesn't offer that, so it would need code of our own. Question below.
- New Android permissions from the library: `USE_BIOMETRIC` and `USE_FINGERPRINT` (both normal permissions, granted without asking; the second is used only on Android 8 and older).

**Found:**
- With only 10,000 four-digit codes, no hash would stop someone who could read the stored hash from trying them all. The hash keeps the code itself out of storage; the secure storage and the waits are what protect it.
- The waits are counted on the phone's clock. Setting the clock back restarts the wait; setting it forward ends a wait early. An app can't tell the true time without the internet, and changing the clock needs the phone unlocked. Question below.

**Tests (44 new):** the code rules; the wait schedule on a fake clock, with every step and the right code refused during a wait; a try stored before it is compared; persistence across a restart; the clock set back; secure storage that can't be read; set, change, remove and reset; no reset while each of the four things runs, or if one starts during the prompt; the screens (Settings shows what is stored at once after Set and after Remove, so the 6 Nov "Code saved" bug can't recur here; change; refused codes; mismatch; the wait in words; "set one first"; `requireSecretCode` answering true and, when backed out, false; Hindi); the contacts migration; the live-location length; the new Settings order.

**Not verified:** nothing has run on a phone. The native builds run on the pull request (the two new Expo modules add native code). Most important to try: set a code, close the app fully, open it, and check the code is still asked for; five wrong tries, then restart the phone, and check the wait is still there; the reset with the phone's passcode, and with Face ID or a fingerprint if set up.

**NEEDS OWNER REVIEW:** the new wording: `secretcode.json` (all of it), the new parts of `settings.json` (`contacts`, `live`, `trigger`), `sos.json` (`contacts.method*`, `live.length`), and the Face ID permission text (`app.json`, `src/i18n/native/*.json`), in English and Hindi.

### Group 1.3A: the SOS page, Pocket recording, the quick trigger

**What was built:**
- **The SOS page** (SPEC 5.1): **Call 112** and **I need help** as swipes, then **Share my location** as a plain button, then only what is running (the alert's progress, live location) and **Quick trigger setup** (to Settings). The third swipe, **My phone is being taken**, comes with group 1.3B. The contacts card and the old alert button are gone; the contacts are in Settings (group 1.2).
- **The swipe control** (`src/components/SwipeControl.tsx`): slide the handle all the way to the end. Let go anywhere short of the end (more than 6 points short) and it springs back; nothing happens. A second swipe while it springs back is ignored. Once a swipe has started, the page doesn't scroll it away. **With a screen reader on** (VoiceOver, TalkBack) the control is one button: double-tap opens a plain confirmation sheet, and only its confirm button acts.
  - **Call 112** dials 112.
  - **I need help** sends the alert as before, to the people ticked for SOS alerts (group 1.4 adds the battery level, both links and live location). The confirmation sheet says that Saakshi is not an emergency service.
  - **Share my location** starts live location for the Settings length and texts the link to the people ticked for live location (group 1.4 makes the message calm, with the battery level). If nobody is ticked for live location, it says so and links to the contacts.
- **Pocket recording** (SPEC E8): bug mode is now called Pocket recording everywhere the user sees it: its screen, the records list, the Android notification, the Live Activity, the microphone permission text, and Hindi ("पॉकेट रिकॉर्डिंग"). It moved to the **Record** page, beside body-cam (`/record/pocket`), described as "Sound only, like a body-cam for sound". The module (`src/modules/bugmode`) and the stored `capture.mode: "bug"` are unchanged. Bundle names, the witness message's Record line and the automatic witness text keep "Bug mode" until group 1.5 (bundle format 0.9).
- **The quick trigger** opens the SOS screen (`saakshi://sos`); no code is typed:
  - iPhone: the App Intent (Control Center, Lock Screen, Action Button, Shortcuts for Back Tap) is now "Open Saakshi SOS"; the widget opens `saakshi://sos`. The intent's Swift type keeps its old name, `OpenCodePadIntent`, so that a Shortcut already made with it (for Back Tap) keeps working. Pocket recording's Live Activity opens `saakshi://record/pocket`.
  - Android: the home-screen widget and the quick notification open `saakshi://sos`.
  - Settings → Quick trigger now has the setup steps only, and says that a locked iPhone may ask for the passcode first.
- **Removed:** the 3-digit code pad (`/codepad`), its setting, the refused-codes list, and confiscation mode (`trigger/confiscation.ts`, `ConfiscationCard`). The old setting's file, which held the 3-digit code in plain text, is deleted when the app starts (`removeOldCodePadSetting`); contacts and every other setting stay. The `trigger` module now holds only the quick-trigger plumbing.
- **App Review notes:** updated for the swipes, Pocket recording on the Record tab, and the quick trigger.

**Built so, please confirm:**
- After a full swipe of **I need help**, the alert goes at once. On the Android APK there is no 3-second countdown any more: the old alert button had one with Cancel, but a full swipe is already deliberate, as the code pad was.
- How close to the end counts as a full swipe: 6 points.

**Tests (15 new; the code pad's and confiscation mode's tests went with them; 445 in all):** the swipe rule; the swipe control driven by a finger (a partial swipe does nothing; a full one acts once; no second swipe while it springs back) and by a screen reader (the sheet, Cancel and Confirm); the SOS page (what is on it at rest, Call 112, "I need help" with nobody to alert, Share my location with nobody ticked); the quick trigger opening `/sos` on iPhone from a cold start and while running; the native sources using `saakshi://sos` and no code-pad names; the code pad and confiscation mode gone from the trigger module; the old setting deleted once.

**Not verified:** nothing has run on a phone. The Swift and Kotlin changes compile only in the Native build workflow. Most important: how the swipe feels (on a small and a large phone, and with a thumb in a hurry), VoiceOver and TalkBack, the Action Button and Back Tap opening the SOS screen, and from a locked iPhone. A Back Tap Shortcut made before this change should still run; its action's name in Shortcuts now reads "Open Saakshi SOS".

**NEEDS OWNER REVIEW:** the new and changed wording: `sos.json` (`home`, `trigger`, `bug`), `record.json` (`pocket`, `list.bug`), `common.json` (`swipe`), the widget's and intent's strings (`targets/widget/*.lproj`), the Android widget description, and the microphone permission text, in English and Hindi.

### Group 1.3B: "My phone is being taken", and the code on every Stop

**What was built:**
- **The third swipe, "My phone is being taken"** (SPEC 5.4). It starts four things, each on its own, so that one failing doesn't stop the rest (`src/modules/trigger/phoneTaken.ts`):
  - **the SOS alert** to the people ticked for SOS alerts. It waits up to 8 seconds for the live link and goes with it, or goes without it and the link follows on its own; group 1.4 adds the battery level and the map link;
  - **live location with no fixed end** (below);
  - **Pocket recording**, without Saakshi's Lock Screen Live Activity, so the locked screen shows less. iOS still shows its orange microphone dot, which an app can't hide. A Pocket recording already running keeps going and loses its Live Activity. The low-battery handover comes with it in group 1.5;
  - **the silence alarm's heartbeat:** nothing yet. The seam is `heartbeat.start()` and `heartbeat.stop()` in `phoneTakenInstance.ts`, called when the mode starts, when the app restarts with it on, and when it is stopped with the code. Group 3.5 fills it in.
- **It needs a secret code to start.** Without one, the swipe explains why and offers to set one. Once it is set, the mode starts (built so).
- **While it runs**, the SOS page shows, in plain words, what really runs. If a part failed, or was stopped on its own with the code, it says so and offers "Try again". It also says that it can only be stopped in Saakshi with the secret code. Its state is saved, so it is still on after the app restarts. The secret code's reset is never offered while it runs.
- **Stop needs the code, everywhere** (SPEC 5.3): body-cam's Stop, Pocket recording's Stop, live location's Stop, and this mode's Stop all open the code screen first.
- **Body-cam's Android notification has no Stop button any more.** Tapping it still opens the app. Pocket recording's notification and the Live Activity never had one.
- **The server** (Supabase `saakshi-live`): migration `supabase/migrations/20261106190000_live_persistent_shares.sql`, **applied on 6 Nov with your approval**.
  - A share flagged `persistent` isn't deleted at 24 hours. Its end moves to a week after each position or check-in (`live_push`, and the new `live_keep`). The existing cron job deletes it a week after the phone last reported.
  - `live_keep` makes a share already running persistent, keeping its link, if "My phone is being taken" starts during Share my location.
  - `live_view` now says whether a share is persistent. The viewer page (`web/live/index.html`) then says "Shared until they stop sharing" in place of an end time a week away.
  - Ordinary shares, and the app already on phones (which asks with two arguments), are unchanged. The `live` schema stays closed to the API.
- **Checks run as the `anon` role** on the live server, all passing:
  - a persistent share starts, ending a week away;
  - a push with the secret is taken, and its end moves later. Checked across separate calls: within one transaction the database's clock stands still;
  - a push, a keep and a stop with a wrong secret are refused;
  - the view says persistent, with only the right position;
  - an ordinary share from the old two-argument call ends in 4 hours, and `live_keep` turns it persistent;
  - `live.shares`, `live.positions` and `live.keep_for` are refused to `anon` directly;
  - both shares stop; afterwards the links show nothing, pushes are refused, and no row is left in either table.
- **Supabase's security advisor:** the same findings as before, by design (the public functions can be called without signing in, and the tables have row-level security with no policies, so nothing reaches them directly), plus `live_keep` in the first group.

**How each of these can still be stopped outside Saakshi's code screen** (the brief asked for the list; SPEC 5.4, "What this does and does not promise"):
- **Both platforms:**
  - switching the phone off, or a forced restart, stops everything. The recording is sealed as cut off when Saakshi next opens;
  - airplane mode, or no signal, stops nothing on the phone. Recording carries on, and positions wait on the phone until signal returns; texts don't go;
  - taking away the microphone or location permission in the phone's Settings stops that part;
  - deleting the app.
- **iPhone:**
  - **force-quit** (swiping Saakshi away in the app switcher) is expected to end Pocket recording, body-cam's sound and live location, because they run inside the app. Apple's pages I read don't say so in so many words, and it hasn't been tested. Saakshi doesn't use the location service that iOS restarts after the app ends (significant-change monitoring; [Apple](https://developer.apple.com/documentation/corelocation/cllocationmanager/startmonitoringsignificantlocationchanges())). Apple also says a background notification is dropped "if something force quits or kills the app" ([Apple](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app)). So the silence alarm (3.5) is what covers a force-quit. On the server, a persistent share keeps its last position for a week;
  - iOS can end an app in the background to free memory ("The system can terminate apps at any time to free up memory or other system resources", [Apple](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background));
  - Control Center on the Lock Screen allows airplane mode unless it is turned off; the walkthrough (Part 4) covers this;
  - a phone call stops sound recording for its length. A new file follows, as before.
- **Android:**
  - **Task Manager's Stop** (the "Active apps" list in the notification shade, Android 13 and later): "The system removes your app from memory. Therefore, your entire app stops, not just the running foreground service … The system doesn't send your app any callbacks when the user taps the Stop button" ([Android](https://developer.android.com/develop/background-work/services/fgs/handle-user-stopping)). **It can't be removed:** that page gives an app no way to opt out, and I found none for an ordinary app;
  - Settings → Apps → Saakshi → Force stop;
  - makers' battery managers (Xiaomi, Oppo, Vivo in particular) may stop background services; untested;
  - swiping Saakshi away from the recent apps is expected to leave its foreground services running; untested.
- **Inside Saakshi, without the code, still:** body-cam's stop-and-save at 3% battery, which group 1.5 removes; an ordinary live share reaching its end; and a recording ending because the app's screen was torn down (a crash).

**Tests (22 new, 467 in all):** the orchestration: each part started; the alert with the link, or without it when the link is slow, with the late link sent on; each part failing on its own; Stop refused without the code, and done with it; one part failing to stop; still on after a restart, with the heartbeat resumed; no double start; a part restarted. Also: bug mode without its Live Activity, and taking it from a running recording; persistent live shares (start, keep, a share already ended on the server, the end moving with each position, and the server calls exactly as before for an ordinary share); the swipe asking for a code first, then starting; the running card, with a part stopped on its own; Stop only through the code on this mode, Pocket recording and live location; body-cam's Stop asking for the code, and its notification having no Stop.

**Not verified:** nothing has run on a phone; the Kotlin change compiles only in the Native build workflow. Most important to test: the whole mode from a locked phone; that the Live Activity really doesn't appear; force-quit on iPhone (does recording and location stop, as expected?); Task Manager's Stop on Android 13 or later; the viewer page for a persistent share; the code screen over body-cam while it records.

**NEEDS OWNER REVIEW:** the new wording (`sos.json` → `taken`, both languages), and the viewer's new line in English and Hindi.

### Group 1.4: the alerts

**What was built:**
- **"I need help"** (SPEC 5.2). It sends one alert to the people ticked for SOS alerts, and live location starts for the Settings length (`sos/alert/help.ts`). If nobody is ticked for SOS alerts, the alert says so and no location is shared. The alert carries:
  - the current-location map link (Google Maps), with its accuracy and the time of the fix;
  - the live-location link;
  - the battery level ("Battery: not known" if the phone doesn't say);
  - the time sent.

  The alert waits for the live link only while it is finding the position, up to 8 seconds; the position, the link and the battery are found at the same time. A link that comes later is texted on its own, in the calm message. When the alert carried it, the people ticked for live location but not for SOS alerts get it on its own. If live location can't start, the alert still goes.
- **"Share my location":** a calm message to the people ticked for live location, never worded as an alert. For example: "I'm sharing my location with you until 18:40 IST. Battery 82%." and then "Follow it here: <link>". A share with no fixed end says "until I stop". "Send the link again", and the link that follows an alert or "My phone is being taken", use the same message with the battery level read at that moment.
- **The battery level in every location update.** The phone reads the level each time positions arrive, and sends it with the newest of them. The server keeps it with that position (migration `supabase/migrations/20261106200000_live_battery.sql`, applied 6 Nov). The viewer page shows the newest level and how long ago it was sent, in English and Hindi: "Battery 82% (3 minutes ago) · बैटरी 82% (3 मिनट पहले)".
  - **One difference from the brief, for you to confirm:** the brief says "an optional argument to `live_push`". I put the level inside each position (`"bat"`) instead. A new argument would mean dropping `live_push` and making it again, as the 1.3 migration had to for `live_start`. While two versions existed side by side, the server couldn't choose between them, and the app already on phones would stop working. A level inside the position also stays with the position it belongs to when positions wait for signal. `live_push`'s call is unchanged.
  - A missing, non-numeric or out-of-range level is stored as unknown, and the position is still taken.
- **Checks as the `anon` role** on the live server, passing: a push with levels 82, missing, `"abc"` and 150 is taken; the view gives 82 and three unknowns, newest first; stop; nothing left.
- **The SMS budget.** These are the limits the tests hold the messages to, at their longest: a place far off, poor accuracy, a fix from another day, a full battery and the real link.

  | Message | English | Hindi |
  |---|---|---|
  | "I need help" | at most 2 parts; 258 of 306 characters | at most 5 parts; 4 for a usual alert |
  | "Share my location" | 1 part; 151 of 160 characters | at most 3 parts |

  English uses only GSM characters, so the location's accuracy now reads "within 20 m" (the "±" sign isn't in GSM's alphabet and would have made the whole alert Unicode). Each link ends its line, so a full stop can't be taken into it. The viewer page also now ignores a full stop or bracket a messaging app added to the end of the link.
- **The battery reading's shared place:** `src/platform/battery` (`monitor.ts` and `useLowBattery.ts` moved there from `evidence/battery`, plus `readBatteryPercent`). The evidence module uses it from there. There is also `src/platform/sms` (`smsParts`).

**Tests (23 new, 490 in all):**
- The message builders: every field, a missing battery or position, a fix from an earlier day, links at line ends, GSM only in English, the budget in both languages, and the calm message reading as no alert.
- "I need help": the link in time, late, or failing.
- The alert controller waiting for the link only as long as for the position, and carrying the battery.
- The battery on the newest position, and kept while there is no signal.
- The battery reader.
- The SMS part counter.
- The viewer page's own script, run against a stand-in page: the battery line and its age, the newest position with a level, no line without one, "until they stop sharing", and a full stop in the link.

**Not verified:** on a phone. How Messages and SMS apps split and show a 2-part alert. Whether iPhone's background location task gets a battery reading every time (if not, that position has none, and the viewer shows the last one known with its age).

**NEEDS OWNER REVIEW:** the new wording in `sos.json` (`message.accuracy`, `message.battery`, `message.batteryUnknown`, `message.share*`) and the viewer's battery line, in English and Hindi. The Hindi share message is written to need no gendered verb ("मेरी लोकेशन … शेयर हो रही है").

### Group 1.5: low battery at 5%, and bundle format 0.9

**What was built:**
- **At 5% battery, in body-cam and in Pocket recording** (so also in "My phone is being taken"), the file being written is closed cleanly with `capture.endReason: "low-battery"` and sealed as usual, and **a new file of the same recording carries on** (the next `segment.index`, with `gapBeforeMs`), until the phone dies. It is the same path as the fail-safe new file. The records list says "Battery low: this file was closed and saved."
- **Body-cam's new file is 480p at 15 frames a second** (1 Mbit/s), on iPhone and Android. The screen says so: "Battery at 5%: recording carries on in a new file, at 480p and 15 frames a second, to save power." Pocket recording's screen says the same without the picture.
- **The 3% stop-and-save is gone, for every mode** (body-cam, Pocket recording and the evidence camera). The warnings at 10% and 5% stay, once each. In body-cam the 10% warning says what happens at 5%; in the evidence camera it says the camera keeps recording until the user stops it or the phone switches off.
- **Saving mode** (`src/platform/battery/saving.ts`): it starts with the handover and ends when the phone is charging or the recording stops. While it is on:
  - a live-location share sends its positions in one burst every 5 minutes, not as they come (below, "the battery cost");
  - the people ticked for live location are told once per share: "Saakshi: my battery is at 5%. To save power, my location now updates every 5 minutes." Only where the phone texts with no tap (the Android APK), since the phone is usually locked by then and nobody can tap Send. Everywhere, the live page says so itself when the newest battery level is 5% or less: "The battery is low: positions may come only every 5 minutes" (English and Hindi).
  - Uploads (group 2.3) don't exist yet; the 5-minute burst is where they will join.
- **Plugging in** ends saving mode: live location sends as positions come again, and the next file is at the normal quality. Unplugged again while still at 5% or less, the handover happens again (a new file at lower quality); the contacts aren't told twice for the same share.
- **Bundle format 0.9** (`docs/spec/evidence-bundle.md`, sections 4, 4a, 12):
  - `FORMAT_VERSION` is `"0.9"`; the version strings in the tests named in the brief are updated.
  - `capture.batteryPercent` (a whole number from 0 to 100) in every file and checkpoint record, read as the record is made. Left out when the phone doesn't say, and for a file sealed after a cut-off (the level when Saakshi next opens isn't the level when the recording ended).
  - `capture.startedFrom` (`"pocket"` or `"phone-taken"`) in sound-only records only.
  - "Pocket recording" replaces "Bug mode" in bundle names (`Saakshi 2026-11-06 10-40 IST Pocket recording.zip`), the manifest's `name`, the README's Record line, the witness message's Record line (it uses the same name) and the automatic witness text ("Saakshi pocket recording: recording since …"). The README's English and Hindi text had no "Bug mode" in it; it takes the name from the record, so nothing else in it changed. Old bundles keep their names and stay valid.
  - `tools/verify-bundle.mjs` reads 0.1 to 0.9, and checks the new members: `batteryPercent` a whole number from 0 to 100, `startedFrom` one of the two values and only in a sound-only record. A 0.8 bundle still verifies (test).
- **Native code:** iPhone `BodyCamRecorder.swift` (handover, 480p and 15 frames a second in the writer), `SoundRecorder.swift` (handover); Android `CameraRecorder.kt` (handover, 480p and 15 frames a second, the session rebuilt), `BugRecorder.kt` (handover); the two modules' bridges. If a 480p file can't be started, the new file starts at the normal quality instead: saving power never stops the recording.

**Checked before building** (the brief asked; none of it is measured on a phone yet):
- **How short the gap is at the handover.** Each new file's record says exactly, in `capture.gapBeforeMs`, so the owner's test will show the real number.
  - iPhone, Pocket recording: none expected. The file closes and the very next piece of sound, a fraction of a second later, starts the next file; no sound is dropped between them.
  - iPhone, body-cam: none for the sound, at most one frame for the picture. It is the path a fixed-length piece used: the frame that closes one file opens the next.
  - Android, Pocket recording: the time Android takes to stop one sound recorder and start the next. The new recorder is started before the old file is fingerprinted, so the hashing adds nothing. I don't know how long that is on a real phone; I expect well under a second.
  - Android, body-cam: the time to stop one recorder and start the next, plus, for the change to 480p, rebuilding the camera session (below). The sound starts with the new recorder; the picture may start a little later inside the new file, once the session is ready. I don't know how long; it needs the owner's phone.
- **Whether a resolution change needs a new recorder session:**
  - iPhone: **no.** The camera keeps running as it was (720p, or 1080p if chosen, at 30 frames a second). The new file's writer scales each frame to 480 on the short side and keeps every other frame. So the encoder and the storage do less work; the camera itself doesn't.
  - Android: **yes.** The recording goes through a surface whose size is fixed when it is made, and a camera session's outputs are fixed when the session is made. So at the handover the surface is made again at 480p and the session rebuilt. The camera is asked for 15 frames a second where it offers that; where it doesn't, it sends its usual rate and the file's rate depends on the phone (untested).
- **The battery cost of the 5-minute saving mode:** not measured. What it changes: the phone still finds its position as often as before; only sending to the server is held back to once every 5 minutes, so the mobile radio wakes less often. Changing how often the phone finds its position would mean restarting location updates, and at 5% the app is usually in the background, where it may not restart them (Android refuses to start a foreground service from the background, and iPhone doesn't let an app start location updates there). How much this saves, I don't know. Question below.
- **Plugging in:** above. Saving mode ends, sending goes back to normal, and the next file is at the normal quality. Body-cam and Pocket recording are now one continuous file, so "the next file" is the next handover or the next recording; the file being written when the phone is plugged in stays at 480p. Question below.

**Built so, please confirm:**
- Contacts are texted about saving mode only from the Android APK; on iPhone and the Play Store build, only the live page says it (above).
- The battery level is left out of a file sealed after a cut-off.

**Tests (17 more, 507 in all):** the battery monitor (warnings once each at 10% and 5%, the handover once at 5%, never a stop, starting low, plugging in and out, an unknown level); the handover in body-cam and in Pocket recording with a fake battery drop (the file closed as low-battery, the next one following with its gap, saving mode on and off); the 3% stop gone; the new members in file and checkpoint records, left out when the battery is unknown and after a cut-off, `startedFrom` only in sound-only records; a 0.9 bundle verifying, named "Pocket recording" in its file name, README and manifest; the verifier failing malformed new members; a 0.8 bundle still verifying; live location's 5-minute bursts; the contacts told once; the live page's low-battery line; the end-reason words in English and Hindi.

**Not verified:** nothing has run on a phone. The Swift and Kotlin changes compile only in the Native build workflow. Most important to test: the handover itself on both phones (the gap in `gapBeforeMs`, and that the 480p file plays and is really 15 frames a second); Android's session rebuild while recording, on a real phone; the evidence camera no longer stopping at 3%. To test without waiting for a real 5%, a phone can be run down to about 6% and recorded on from there.

**The README must be checked against the owner's bundle walkthrough.** Only the record name changed in it, but the walkthrough is the reference.

**NEEDS OWNER REVIEW:** the new and changed wording, in English and Hindi: `record.json` (`battery.warn`, `battery.handoverSoon`, `battery.handedOverVideo`, `battery.handedOverSound`, `battery.charging`, `ended.lowBattery`), `sos.json` (`message.saving`, `bug.witness`), and the live page's low-battery line.

### Group 1.6: follow-ups to Part 1 (owner, 9 Nov 2026)

**1. The code is reset with the phone's passcode only, never a face or fingerprint** (SPEC 5.3).
- **A small native module of our own**, `modules/saakshi-device` (Swift and Kotlin, MIT, no new dependency). `expo-local-authentication` is removed; nothing else used it.
- **iPhone:**
  - Each reset writes a fresh random value to a keychain item and reads it back. The item's access control is `.devicePasscode` ("Constraint to access an item with a passcode", [Apple](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/devicepasscode)), kept as `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`.
  - The read makes iOS ask for the passcode, with Saakshi's reason (`LAContext.localizedReason` through `kSecUseAuthenticationContext`; `kSecUseOperationPrompt` is deprecated, [Apple](https://developer.apple.com/documentation/security/ksecuseoperationprompt)).
  - Apple doesn't say in so many words that Face ID can't open such an item. It says `.userPresence` "is equivalent to specifying biometryAny, or, and devicePasscode" ([Apple](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/userpresence)), so biometry is a separate flag that Saakshi doesn't set. The owner's test (pull request, A) checks it on a phone.
  - "Has a passcode" is `LAContext.canEvaluatePolicy(.deviceOwnerAuthentication)`, which fails with `passcodeNotSet` without one ([Apple](https://developer.apple.com/documentation/localauthentication/lapolicy/deviceownerauthentication)).
  - A "when passcode set" item is deleted when the passcode is turned off ([Apple](https://developer.apple.com/documentation/security/ksecattraccessiblewhenpasscodesetthisdeviceonly)); the code handles that as "no screen lock".
- **Android 11 and later:**
  - The framework's `BiometricPrompt` with `setAllowedAuthenticators(DEVICE_CREDENTIAL)` alone, from API 30 ([Android](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt.Builder#setAllowedAuthenticators(int))), and no negative button (Android refuses one with a device credential).
  - With the credential alone, Android's BiometricService shows only the PIN, pattern or password and starts no sensor: "If it's only device credential, we don't need to wait…", then `STATE_SHOWING_DEVICE_CREDENTIAL` ([BiometricService.java, Android 11, LineageOS mirror](https://github.com/LineageOS/android_frameworks_base/blob/lineage-18.1/services/core/java/com/android/server/biometrics/BiometricService.java#L1811)).
  - It needs `USE_BIOMETRIC`, a normal permission granted without asking: `authenticate` is `@RequiresPermission(USE_BIOMETRIC)`, and AuthService enforces it ([AuthService.java#L404](https://github.com/LineageOS/android_frameworks_base/blob/lineage-18.1/services/core/java/com/android/server/biometrics/AuthService.java#L404)). It is the only permission the module adds.
  - `USE_FINGERPRINT`, which came with `expo-local-authentication`, is gone.
- **Android 7 to 10: it can't be done, so no passcode reset there** (the brief: "never fall back to a fingerprint or face"). `KeyguardManager.createConfirmDeviceCredentialIntent` opens Settings' confirm screen, and for any app that screen also takes the fingerprint:
  - **Android 7.1:** `ConfirmDeviceCredentialActivity` launches it as external (`true /* isExternal */`, [L97](https://github.com/LineageOS/android_packages_apps_Settings/blob/cm-14.1/src/com/android/settings/ConfirmDeviceCredentialActivity.java#L97)), and the helper sets `ALLOW_FP_AUTHENTICATION, external` ([L246](https://github.com/LineageOS/android_packages_apps_Settings/blob/cm-14.1/src/com/android/settings/ChooseLockSettingsHelper.java#L246)).
  - **Android 8.1 and 9:** the same ([8.1](https://github.com/LineageOS/android_packages_apps_Settings/blob/lineage-15.1/src/com/android/settings/password/ChooseLockSettingsHelper.java#L266), [9](https://github.com/LineageOS/android_packages_apps_Settings/blob/lineage-16.0/src/com/android/settings/password/ChooseLockSettingsHelper.java#L286)).
  - **Android 10:** a biometric prompt (fingerprint or face) comes first, with the PIN as its fallback (`if (isBiometricAllowed(...)) { ... showBiometricPrompt(bpBundle);`, [L218](https://github.com/LineageOS/android_packages_apps_Settings/blob/lineage-17.1/src/com/android/settings/password/ConfirmDeviceCredentialActivity.java#L218)).
  - **No app can turn the fingerprint off:** only two extras are copied from the caller's intent (`copyOptionalExtras`), and the inner screens aren't exported. Only device-admin policies or "strong auth required" switch it off.
  - Phone makers' own Settings apps may differ; I couldn't check them.
  - So on those versions "Forgot the code?" says the code can't be reset there, and the screens say so before a code is chosen. Question below.
- **The rest is as built:** the reset only while nothing is running, checked before and after the prompt.
- **The Face ID permission text is removed:** `app.json` (`expo-local-authentication`'s plugin goes; `expo-secure-store` gets `faceIDPermission: false`, since its plugin would otherwise write its own default Face ID text), `src/i18n/native/*.json`, and the optional Face ID block of `store/apple/review-notes.md`. `store/__tests__` checks that no Face ID text or block is left. The built app's Info.plist has no `NSFaceIDUsageDescription` (checked with `npx expo config --type introspect`).

**2. The battery level only at 20% or less** (SPEC 5.2).
- **The rule lives in one place:** `src/platform/battery/share.ts`, `batteryToShare`. Above 20%, or when the level can't be read:
  - no position carries `bat`;
  - the alert has no battery line ("Battery: not known" and its string are gone);
  - the calm message and "Send the link again" leave it out.
- **The live page** shows the line only when the newest position carries a level, so a level from an older position, perhaps long out of date, isn't shown. The server is unchanged.
- **Evidence records** still carry `capture.batteryPercent` at any level. They stay on the phone, and the brief names only what is sent.
- **The SMS budget is unchanged.** The longest battery line is now "20%" rather than "100%":

  | Message | English | Hindi |
  |---|---|---|
  | "I need help" | at most 2 parts; 257 of 306 characters | at most 5 parts; 4 for a usual alert |
  | "Share my location" | 1 part; 150 of 160 characters | at most 3 parts |

**3. Android body-cam at 5% without rebuilding the camera** (SPEC section 4, low battery).
- **What stays:** the recording size, the persistent input surface and the capture session. `ensureSizeForPower` and the 480p size are removed.
- **What changes:** the new file's `MediaRecorder` gets **half the normal video bit rate**: 1.5 Mbit/s at 720p and 3 Mbit/s at 1080p (normally 3 and 6).
  - **Why half:** at 15 frames a second rather than 30, each frame then gets as many bits as before. So a frame is about as sharp as before (faces, plates), and the file, and later its upload, is half the size.
  - 1 Mbit/s, the old 480p rate, would leave each 720p frame about a third fewer bits than it had at the normal rate.
  - The power saved comes mostly from the encoder doing half the frames; the bit rate mainly saves storage and upload.
- **The frame rate:** 15 a second comes from the capture request's frame-rate range, as before, and only where the camera offers a range that tops out at 15. The recorder is told 15 only then, else 30, so that the encoder spreads the bit rate over the frames it really gets. The range follows the file being written (`fileSaving`), so a zoom or a charger in the middle of a file doesn't change it.
- **Two small fixes in the handover:**
  - Saving mode now ends with the recording (`stopRecording`, `close`), so the next recording starts at the normal quality. Before, saving mode left over from a recording stopped at 5% carried into the next one. A handover that comes before the recording's start (the battery already at 5%) still applies to its first file.
  - Whatever fails at the handover, a new file is started, in saving mode if it can be, else at the normal settings, and the camera is sent to it. Before, a failure while closing the old file could leave the recording stopped.
- **The screen text is true on each phone:**
  - iPhone, unchanged: "at 480p and 15 frames a second" (`battery.handedOverVideoIos`).
  - Android: "Battery at 5%: recording carries on in a new file with less data, and 15 frames a second where the camera allows, to save power." (`battery.handedOverVideoAndroid`).
  - The bundle spec's line on `"low-battery"` now says the same; no member changed, so it stays 0.9.
- **The gap at the handover** on Android is now only the time to stop one recorder and start the next on the same surface, as for a fail-safe new file. It is still not measured; `capture.gapBeforeMs` will show it.

**4. A recovery code on a phone with no passcode** (SPEC 5.3).
- **When it is made:** setting the code on a phone with no screen lock makes a recovery code at the same moment and shows it once (`Your recovery code`, then "I have written it down"). The advice: write it on paper, keep it away from the phone and not as a photo on it, and anyone who has it can reset the code too.
  - It is never stored, logged or sent; the screen holds it only until that button.
  - A screen reader reads it character by character.
- **The code itself:** 12 characters from 31 (the digits 2 to 9, and the capitals without I, L and O), about 2^59 possible codes. Bytes are drawn so every character is equally likely. It is shown as `7KQM-4WXH-9RTD` and typed in any case, with or without the dashes.
- **What is kept:** a random 16-byte salt and PBKDF2-HMAC-SHA256 with 100,000 iterations (32 bytes), in the same secure-storage item as the code.
  - The hash runs in native code: CommonCrypto on iPhone; on Android, PBKDF2 written out over the platform's `HmacSHA256`, because Android's own `PBKDF2WithHmacSHA256` exists only from Android 8 and the app supports 7.
  - The Android code is checked on the JVM against RFC 7914's vectors and against Node's `pbkdf2Sync` (`modules/saakshi-device/verify/pbkdf2.sh`).
  - The iteration count is stored with the hash, so a later version can raise it.
- **The reset with it:** "Forgot the code?", then the recovery code. The rules are those of the passcode reset: only while nothing runs, checked before and after.
  - A wrong recovery code counts towards the same waits as a wrong secret code, and none is taken during a wait.
  - Something that can't be a recovery code (the wrong length or letters) is refused without counting, since its form is no secret.
- **It works once (built so):** a reset removes it, and the new code comes with a new recovery code. Changing the code keeps it; removing the code removes it.
- **A new one:** Settings → Secret code shows, on a phone with no screen lock, when the recovery code was made, and "Make a new recovery code". That asks for the secret code; the old recovery code stops working.
- **A phone that loses its passcode later**, or a code set without one: a card on the Record page, where Saakshi opens, asks for a recovery code to be made.
  - **When it shows:** when the code is set, the phone has no screen lock and no recovery code is kept. "Not now" hides it until Saakshi next opens.
  - **A card, not a dialog:** nothing stands in the way when the SOS screen opens from the quick trigger. It isn't shown while anything runs, and not on the SOS page, which shows only what is running.
- **Not shown when the code is set to start "My phone is being taken" (built so):** the mode starts at once, and the card asks later.
- No server, no account, nothing sent.

**5. How far a swipe must go** (SPEC 5.1).
- **The rule:** the swipe counts when the handle is let go past 85% of its track, or as soon as it reaches the end (built so: at once, before the finger lifts). Let go short of 85%, it springs back.
  - Only where the handle is counts, never how fast the finger moved, so a flick that falls short does nothing.
  - The number is `SWIPE_CONFIRM_FRACTION` in `src/components/swipe.ts`. It replaces 1.3A's "6 points from the end".
- **The tap:** a light one as the handle enters the region, and again if it leaves and comes back.
  - iPhone: `UIImpactFeedbackGenerator(.light)`.
  - Android: the window's own touch feedback (`GESTURE_THRESHOLD_ACTIVATE` from Android 14, `CLOCK_TICK` before). It follows the phone's touch-vibration setting and needs no `VIBRATE` permission, which stays blocked.
- One finger's swipe acts once: a finger kept down at the end and moved again doesn't act a second time.

**6. Saving mode's GPS** (the owner's question of 9 Nov). Read in expo-location 58's source:
- **iPhone: yes, without a restart.**
  - Calling `startLocationUpdatesAsync` again for the running task only updates its options (`EXTaskService registerTaskWithName`: "Task already exists. Let's just update its options."). The consumer then sets `desiredAccuracy` and `distanceFilter` on the same running `CLLocationManager` (`EXLocationTaskConsumer setOptions`); nothing is stopped.
  - It works in the background, where the call checks only permissions it already has.
  - Built: in saving mode the updates go to about 100 m accuracy (`Accuracy.Balanced`, at which iOS may find the position from Wi-Fi and cell towers rather than the GPS) and a new position after about 100 m. They go back to the normal 10 m and 20 m when saving mode ends.
  - Saakshi never starts updates this way that aren't running, and a failure changes nothing. The battery saved isn't measured.
- **Android: no.**
  - The same call stops and restarts the updates (`LocationTaskConsumer.setOptions`: "Restart location updates", `removeLocationUpdates` then `requestLocationUpdates`).
  - With a foreground service the library refuses it in the background (`ForegroundServiceStartNotAllowedException` when the app isn't on screen).
  - So Android is left as built: positions are found as before and sent every 5 minutes.

**An independent review of the new native code** (a separate agent, before merging, as in fix round 1) found no compile errors and three problems, all fixed in this pull request:
- **iPhone:** Expo runs every module's async functions on one shared serial queue (`expo-modules-core`, `AsyncFunctionDefinition.swift`: `defaultQueue`). The passcode prompt blocks its keychain read for as long as the prompt is up, so it would have held up every other module's async calls. It now has its own queue (`PasscodeGate.queue`).
- **Android:** my first version reset saving mode when a recording started. Body-cam's start reaches the camera thread later, through its service, so a 5% handover that came first would have been undone. The reset is now at the recording's end.
- **Android, older code:** a failure while closing the old file at the handover could stop the recording (above).

**Tests (59 more, 566 in all):**
- The passcode reset's outcomes; which reset each kind of phone gets; the recovery-code reset and its rules (running before and after, shared waits).
- The recovery code: alphabet, uniform draw, format, slow hash and its salt; checked in any case; kept only as a hash; made anew only after the code; kept on change, gone on remove and reset; a code stored before this group.
- The screens:
  - the recovery code shown once, and not when set for "My phone is being taken";
  - the reset with it, and a new one after; the reminder card;
  - no reset while running; the Android 7 to 10 message; the passcode-only wording.
- No Face ID text or block left (store tests).
- The battery: the 20% rule, positions, alert, calm message, controller, the viewer's newest position, and the budget.
- The Android handover from the recorder's source (no size change or rebuild, half the bit rate, the frame rate), and the handover wording per platform in both languages.
- The swipe: 85%, the end at once, a flick, the tap, a small and a large phone.
- Saving mode's GPS on each platform.

**Not verified:** nothing has run on a phone; the Swift and Kotlin compile only in the Native build workflow. Most important to try:
- the passcode prompt on an iPhone with Face ID set up, and on Android 11 or later with a fingerprint;
- the recovery code on a phone with no screen lock;
- the Android handover at 5% (the gap, the second file's size and frame rate);
- the swipe with a hurried thumb on a small and a large phone, both hands;
- iPhone saving mode keeping live location going.

**NEEDS OWNER REVIEW:** the new and changed wording, in English and Hindi:
- `secretcode.json`: `about.*`, `reset.*` (`explain.*`, `noPasscode`, `failed`, `unavailable`, `noRecovery`, `oldAndroid`, `promptDetail`), `heading.recovery*`, `recovery.*` (the recovery-code screens), `settings.recovery*`, `settings.noReset` and `reminder.*`;
- `record.json`: `battery.handedOverVideoIos` and `battery.handedOverVideoAndroid`;
- the recovery-code screen itself.

### Group 1.7: lock the phone when "My phone is being taken" starts (owner, 9 Nov 2026)

**1. Google Play's policy, checked before building** (the brief's step 1). Read on 9 Nov 2026 in Play Console Help. **No rule forbids this use**, so I went ahead. What the rules say, word for word:
- **Malware → Ransomware** ([Play Console Help, Malware](https://support.google.com/googleplay/android-developer/answer/9888380)). The full policy: "Some ransomware encrypts data on the device and demands payment to decrypt the data and/or leverage the device admin features so that it can't be removed by a typical user." One of its examples: "Leveraging device policy manager features and blocking removal by the user." Its "Key considerations" say: "Obtain explicit user consent for any device management features", "Don't use device admin features to block uninstallation", "Provide a clear and easy way for users to remove your app" and "Don't encrypt user data or lock them out of their device."
- **Malware → Elevated Privilege Abuse** (same page). One of its examples: "Apps that abuse features to prevent them from being uninstalled or stopped." Its key considerations add: "Don't write code that prevents a user's app from being uninstalled."
- **Deceptive Behavior → 2. Deceptive Device Settings Changes** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/9888077)): "Obtain explicit user consent before changing any device settings or features", "Clearly explain what your app will change and why", "Ensure all user consented changes are easily reversible by the user."
- **Mobile Unwanted Software** ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/9970222)): "Uninstall, where applicable, should be clear."
- **Device and Network Abuse** and **Permissions and APIs that Access Sensitive Information** ([9888379](https://support.google.com/googleplay/android-developer/answer/9888379), [9888170](https://support.google.com/googleplay/android-developer/answer/9888170)) say nothing about device admin. No Play Console declaration form for it turned up.
- **How the build meets them:** it is opt-in, explained before Android's own screen, and switched off in Saakshi in one tap. It declares only the force-lock policy. Removal is never blocked: Android's own uninstall offers "Deactivate & uninstall" (below). A user is never locked out of their phone: they unlock it with their own screen lock, as after pressing the power button.
- **Google's device-admin deprecation** ([Google for Developers](https://developers.google.com/android/work/device-admin-deprecation)) deprecates the camera, keyguard and password policies. It says: "Some applications use the device admin for consumer device administration, e.g. locking and wiping a lost device. The following policies will continue to be available to enable this: USES_POLICY_WIPE_DATA, USES_POLICY_FORCE_LOCK."
- **Play Protect's block on sideloaded apps** (CLAUDE.md's rule; [Google for Developers, Play Protect warnings](https://developers.google.com/android/play-protect/warning-dev-guidance)): the sensitive permissions are "RECEIVE_SMS, READ_SMS, NOTIFICATION_LISTENER, and ACCESSIBILITY". Device admin is not among them.
- **My reading, not Google's:** a reviewer could still read the feature as one of the uses above, mainly if the store listing calls it a way to stop Saakshi being deleted. The release checklist item covers the listing, and a question below asks how it should be framed. Only Google's review will settle it.

**2. What was built.**
- **Android: device admin with the force-lock policy only**, in `modules/saakshi-sos`, the native module that runs Pocket recording:
  - `LockAdminReceiver` (`LockAdmin.kt`). Its policy file, `res/xml/saakshi_lock_admin.xml`, declares `<force-lock />` and nothing else: no wipe, no password rules.
  - The receiver is declared in the module's manifest with `android:permission="android.permission.BIND_DEVICE_ADMIN"`. That is the permission the *sender* must hold, and only the system holds it.
  - **No permission is requested:** not `LOCK_DEVICE`, not `MANAGE_DEVICE_POLICY_*`, nothing else. The module's `uses-permission` list is unchanged (test).
  - Android's list of device admin apps shows a short description under Saakshi: "Locks the screen when "My phone is being taken" starts. It does nothing else." (English and Hindi.)
  - Keep the receiver's name: Android switches the admin off if the name changes in an update ([Android](https://developer.android.com/work/device-admin)).
- **Settings → "Lock the phone when "My phone is being taken" starts"** (Android only; nothing on iPhone). A card under Secret code, and its own page (`/settings/lock`), which says:
  - what it does: Saakshi first starts sound recording, location sharing and the alert, then locks the screen, as the power button does;
  - that the permission lets Saakshi lock the screen and nothing else (it can't erase the phone or change the screen lock);
  - that while it is on, Android asks for it to be switched off before Saakshi can be deleted;
  - that it can be switched off there at any time, in one tap, or in the phone's settings.
  - **Switch on** opens Android's own "Activate device admin app?" screen, with the same explanation passed as `EXTRA_ADD_EXPLANATION`. **Switch off** is a button in the same place (`removeActiveAdmin`; Saakshi waits up to about 2 seconds for Android to finish, since "the operation is not synchronous").
  - **Switched off in Android's settings:** Saakshi reads the real state each time it comes back on screen, and when the page is shown, so it then shows as off.
  - **Part 4's walkthrough** can use the same setting: `LockSettingsPanel` from `@/modules/trigger`.
- **When "My phone is being taken" starts** (`trigger/phoneTaken.ts`):
  - the parts start as before;
  - once every one of them has started or failed (sound recording, location, the alert's sending and the link that follows it), Saakshi calls `lockNow()` once, if the admin is on;
  - **but it waits for location at most 20 seconds** after the alert has gone and the recording has started (`LOCK_WAIT_MS`, built so). React Native's network calls on Android have no time limit at all ("No timeouts by default", `OkHttpClientProvider.kt`), so a stalled call on a weak signal could otherwise keep the phone unlocked for good. Location carries on starting after the lock.
  - Recording and location carry on with the screen locked: nothing in Saakshi stops a part when the screen locks or the app goes to the background (test). They already run that way: on Android in their foreground services, on iPhone with background audio and location. Not yet run on a phone.
  - **Why it waits for everything:** an Android app in the background can't start location (the share's server call comes first, then the location updates), and a text that needs a tap needs the screen. So when location isn't ready within the 20 seconds, it may fail once the screen is locked; the card then says so and offers "Try sharing again" after unlocking.
- **"Now lock your phone"** (iPhone always; Android with the admin off, or if `lockNow` fails). Once everything has started, the running card moves to the top of the SOS page, headed large by "Now lock your phone", then "Press the side button." (iPhone) or "Press the power button." (Android), then "Sound recording and location sharing carry on with the screen locked." The page scrolls up to it.
  - It stays until the app goes to the background (the screen locked, or the user left Saakshi). Then the card goes back to its usual place under the swipes; the user doesn't see it move.
  - It is shown even if Saakshi isn't on screen at that moment: on Android, the app's state can lag behind a return from the Messages app. It then goes the next time the app goes to the background. It doesn't come back after a restart.
  - A screen reader announces it (`accessibilityRole="alert"`, an assertive live region).

**3. Android's own screens** (the brief's item 7). From Android's source, read in the LineageOS mirror of AOSP: Android 16 (`lineage-23.0`) and Android 7.1 (`cm-14.1`). **No screenshots:** this cloud session has no Android emulator. Phone makers' Settings apps (Samsung, Xiaomi, Oppo, Vivo) may word it differently; I couldn't check them.
- **The activation screen** (Settings, `DeviceAdminAdd.java`):
  - title: "Activate device admin app?" (Android 7: "Activate device administrator?"), [strings.xml](https://github.com/LineageOS/android_packages_apps_Settings/blob/lineage-23.0/res/values/strings.xml#L7067);
  - then Saakshi's explanation, cut to a few lines with a button to expand it;
  - then "Activating this admin app will allow the app Saakshi to perform the following operations:", and one item, "Lock the screen", with "Control how and when the screen locks." ([framework strings](https://github.com/LineageOS/android_frameworks_base/blob/lineage-23.0/core/res/res/values/strings.xml#L2401));
  - the buttons: "Activate this device admin app" (Android 7: "Activate this device administrator"), "Cancel", and "Uninstall app".
- **Deleting Saakshi while it is on:**
  - **From Settings → Apps → Saakshi → Uninstall:** Settings opens the device admin screen instead ([AppButtonsPreferenceController.java#L222](https://github.com/LineageOS/android_packages_apps_Settings/blob/lineage-23.0/src/com/android/settings/applications/appinfo/AppButtonsPreferenceController.java#L222)). Its title is "Device admin app"; it says "This admin app is active and allows the app Saakshi to perform the following operations: Lock the screen"; and its button is "Deactivate & uninstall", which does both in one step (`uninstallPackageWithActiveAdmins`).
  - **From the home screen** (the launcher's uninstall, through Android's package installer): the uninstall fails, and a notification says "Can't uninstall active device admin app", with a button "Manage device admin apps" ([UninstallRepository.kt#L553](https://github.com/LineageOS/android_frameworks_base/blob/lineage-23.0/packages/PackageInstaller/src/com/android/packageinstaller/v2/model/UninstallRepository.kt#L553)). Makers' launchers may differ.
- **Found: after Saakshi locks the screen, the next unlock needs the PIN, pattern or password, not a fingerprint or face** (AOSP). `lockNow` from a device admin calls `requireStrongAuth(STRONG_AUTH_REQUIRED_AFTER_DPM_LOCK_NOW, …)` ([DevicePolicyManagerService.java#L6414](https://github.com/LineageOS/android_frameworks_base/blob/lineage-23.0/services/devicepolicy/java/com/android/server/devicepolicy/DevicePolicyManagerService.java#L6414); the same in Android 7.1). That flag is "Strong authentication is required because a device admin has requested it", and it isn't among the flags that still allow biometrics (`ALLOWING_BIOMETRIC`, [LockPatternUtils.java#L1836](https://github.com/LineageOS/android_frameworks_base/blob/lineage-23.0/core/java/com/android/internal/widget/LockPatternUtils.java#L1836)). The app doesn't say this anywhere yet; question below. It needs the owner's phone to confirm.

**4. The two follow-ups to group 1.6.**
- **Android 7 to 10 get the recovery code**, as phones with no screen lock do (`resetMethodFor` in `src/modules/secretcode/reset.ts`).
  - Setting the code there now shows a recovery code once. "Forgot the code?" asks for it, under the same rules as before: only while nothing runs, and wrong tries count towards the waits.
  - **The wording says why:** "On this version of Android, Saakshi can't ask for the screen lock alone (without a fingerprint or face), so …", on the code screen, in Settings, and on the reminder card. A phone with no screen lock keeps its own wording ("This phone has no screen lock, …").
  - **A code set on Android 7 to 10 before this change** has no recovery code. The Record page's card and Settings now ask for one to be made.
  - **"No reset" remains only for a phone that couldn't be asked about its screen lock** (the native module missing, in practice never in a real build). Its wording is now general, and `reset.oldAndroid` is renamed `reset.none`.
- **iPhone saving mode keeps full accuracy.** Group 1.6's drop to about 100 m accuracy and 100 m distance is undone. Positions are found as before, at full accuracy (10 m, every 20 m or 30 seconds), and sent every 5 minutes, as on Android. The tracker no longer has a saving-mode setting (`TRACKING_OPTIONS` in `location/live/task.ts`). **To revisit** once a phone test shows what a coarser position would save (owner, 9 Nov 2026).

**Limits found** (by the review below; left as built, since the brief asks for the lock after the alert's sending):
- **Where the alert opens the Messages app** (the Play build, or the APK without SMS permission), the lock waits until the user comes back to Saakshi from Messages. If the phone is taken while Messages is open, nothing locks until someone returns to Saakshi. The Android APK sends by itself and isn't affected; on iPhone the message opens inside Saakshi.
- **On Android, anything that covers Saakshi ends the reminder:** a permission dialog, the Messages app opened by "Try sharing again", or an incoming call. Android reports all of these as "background", the same as a locked screen. The brief's rule ("until the app goes to the background") is followed as written.
- **An iPhone share running in group 1.6's coarser saving mode** would keep it until that share ends, because nothing now sets it back. It matters only if a 1.6 build was used at 5% battery, and the handoff records no such phone test.

**Built so, please confirm:**
- The lock waits until every part has started or failed, but for location at most 20 seconds after the alert has gone and the recording has started. Locking sooner would stop Android starting the location updates; waiting longer could leave the phone unlocked on a weak signal.
- The lock happens even if a part failed (for example, the microphone was refused), once the others have started. The card says what failed when the phone is unlocked.
- The reminder's third line, "Sound recording and location sharing carry on with the screen locked.", is mine. The brief asked only for "Now lock your phone" and the button.
- The reminder is the running card moved to the top of the page, not a separate overlay.

**Tests (32 more than on `main`, after the replaced ones; 598 pass, and one is skipped as before):**
- The orchestrator: `lockNow` called once, after every part (a slow recording and a slow link too), only when it starts, also when a part failed, and after 20 seconds at most when location stalls (location then carries on); the reminder where Saakshi can't lock (iPhone, Android without the admin, a failed lock), only once everything has started, gone in the background and after a restart, cleared by Stop; nothing stopped when the screen locks.
- The setting: not offered on iPhone or without device admin; switched on through Android's screen with the explanation (which names Saakshi's Settings, not "here"); cancelled; failed; never stuck busy when Android drops its answer; switched off in one step, and looked at again when Android hadn't finished; switched off in Android's settings and noticed (also through the real AppState listener); `lockNow` only while it is on.
- The native sources: the policy file holds `force-lock` and nothing else; the receiver is protected by `BIND_DEVICE_ADMIN`, with its policy file and action; no new `uses-permission`, and no `LOCK_DEVICE` or `MANAGE_DEVICE_POLICY` anywhere; the explanation passed as `EXTRA_ADD_EXPLANATION`, `removeActiveAdmin`, only `lockNow`, the iPhone stubs.
- The screens: the Settings page (explanation, switch on and off, Hindi), the Settings card and its place under Secret code on Android, the reminder on iPhone (side button) and Android (power button), none with the admin on, Hindi.
- The follow-ups: Android 7 to 10's reset method and its reason; the recovery code shown, used and asked for there, with its own wording; the general "no reset" message; full accuracy in saving mode, and the tracker never touched for it.

**An independent review** of the new code (a separate agent, before merging, as in group 1.6), read against the libraries' own sources, found no compile errors and no new permission, dependency or data leaving the phone. It found:
- the lock could wait for ever on a stalled network call (fixed: at most 20 seconds for location);
- the reminder could be skipped when Android's app state lagged behind a return from Messages (fixed: shown regardless);
- the Settings switch could stay busy if Android dropped its answer, or show "On" after a slow switch-off (both fixed);
- the explanation said "switch it off here" on Android's own screen (fixed: "in Saakshi's Settings");
- the three limits above, left as built.

**Not verified:** nothing has run on a phone. The Kotlin and Swift compile only in the Native build workflow. Most important to try, on Android:
- the activation screen and its wording;
- the lock when "My phone is being taken" starts, with recording and location carrying on (check the record and the live page after unlocking);
- whether a fingerprint can unlock straight after Saakshi's lock (AOSP says no);
- deleting Saakshi from Settings and from the home screen while it is on;
- switching it off in Android's settings, then opening Saakshi.

On iPhone: the reminder, then the side button, with recording and location carrying on.

**NEEDS OWNER REVIEW:** the opt-in explanation and the reminder, in English and Hindi (`sos.json` → `lock.*`, including `lock.offInSaakshi` for Android's own screen, and `taken.remind.*`); the receiver's description in Android's list (`modules/saakshi-sos/android/src/main/res/values*/strings.xml`, `saakshi_lock_admin_description`); and the new and changed `secretcode.json` wording (`reset.none`, `reset.noRecoveryOldAndroid`, `reset.explain.recoveryOldAndroid`, `reset.explain.none`, `about.recoveryOldAndroid`, `about.none`, `settings.recoveryMissingOldAndroid`, `settings.noReset`, `reminder.bodyOldAndroid`).

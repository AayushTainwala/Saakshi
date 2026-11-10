# Saakshi Build Plan

How v1 ([SPEC.md](SPEC.md)) gets built and shipped: releases, architecture, build streams and the owner's steps. The live status of each stream is in [BUILD_HANDOFF.md](BUILD_HANDOFF.md).

## 1. Releases

| Release | Modules (codes from the spec) | Status |
|---|---|---|
| **R1** | Shell, navigation, English and Hindi throughout (F1, G6); evidence camera with signed, chained fingerprint (E1); witness SMS (E2); BSA s.63 certificate (E4); locker and export (E5); rights prompts while recording (E6); body-cam mode (B1–B4); contacts and SOS by SMS, sending itself in the Android APK (S1, S2); helplines (G3); chest-mount guide (G4); digital safety (G5); offline-communication guide (O1); signed APK with checksums on GitHub Releases and mirrors, and iPhone build to TestFlight and App Store review (F2) | Built and merged 20–21 Oct 2026; phone testing under way |
| **R2** | Public timestamp (E3); copies to Google Drive (E7); bug mode (E8); live location by link (S3); trigger and code pad (S4); confiscation mode | Built and merged 21 Oct 2026, except E3 and E7; phone testing under way |

**Pace (owner's direction, 21 Oct 2026).** There is no 24-hour deadline. The project is long-term. The next goal is a solid version that about 50 people can test on iPhone and Android, reached at a steady production pace with proper quality checks, and released at the earliest reasonable time. Streams work to that standard rather than to a clock.

**Road to the beta:**
1. **Phone testing.** The owner tests on his iPhone through TestFlight (round 1: R1 and R2 as merged), then on Android once his phone arrives. Fixes go through pull requests as usual.
2. **Design pass.** No visual design has been done yet, and the app icon and launch screen are Expo's placeholders. Two or three directions are mocked up for the owner to choose from before anything visual is built; then the chosen design and icon are applied.
3. **Owner's sign-offs.** The certificate text (`FORM_TEXT_REVIEWED`), the rights prompts, and the Hindi text.
4. **Beta for about 50 testers:** a TestFlight public link (needs Apple's beta review) and a Google Play closed test (a new developer account needs 12 or more testers for 14 days before production). The bar: every feature tested on at least one iPhone and two different Android phones, the sign-offs done, the design applied, the privacy texts current, and the release checklist in BUILD_HANDOFF.md clear.
5. **Public release** on GitHub, the App Store and Google Play.

Still to build after R1 and R2: E3 (public timestamp), and whatever the owner decides on G1 and G2 (rights and safety guides), which are set for v1.1 in the spec. E7 (Google Drive) is built in round 2.

### Round 2 (decided 6 Nov 2026, after the owner's SOS test)

The redesign of the SOS page and of how a phone being taken is protected, with the pieces it needs. Decisions: [SPEC.md](SPEC.md) sections 4 (E1, E7, E8, low battery), 5 and 6 (G5). The work, in parts a builder takes one at a time: [briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md).

| Part | What | Needs from the owner first |
|---|---|---|
| **1** | Bugs; Pocket recording moved to Record; the SOS page's three swipes; the secret code; Settings; alerts with both links and the battery level; low battery at 5% (bundle format 0.9); then follow-ups (1.6) | nothing |
| **2** | E7: uploads to the user's own cloud (Google Drive and iCloud Drive; built so the owner can designate others), in upload parts that lengthen | Google Cloud project; iCloud container (guide) |
| **3** | Saakshi-to-Saakshi (pairing, encrypted alerts, push, the received-alerts page) and the silence alarm | Apple push key, Google notification service (guide) |
| **4** | The first-open walkthrough, with the phone's own protections | the power-off research (done before Part 4 starts) |

**Order.** Part 1 first and alone: it changes the SOS page, Settings and the recorders that every other part touches. Then Parts 2 and 3 can run as two builders at once (they share only the server and the cloud sign-in). Part 4 last, because it sets up everything the earlier parts built. The owner tests Saakshi-to-Saakshi at the end of the round, with a friend's phone.

**After the round:** Telegram and email for contacts, the iPhone Shortcut test, Google Play's emergency-SMS permission, the wording review (all wording, English and Hindi, in one later test round), the design pass.

## 2. Architecture

- **App:** Expo SDK 58 (React Native 0.88), TypeScript, Expo Router (routes in `src/app/`), i18next for English and Hindi.
  - Every user-facing string goes through i18n from the first commit. Hindi is required for every string before a release.
  - SDK 58 is new. If a library proves incompatible, fall back to SDK 57 and record why in the handoff.
- **Modules:** one folder per feature under `src/modules/`: `evidence`, `sos`, `location`, `bugmode`, `cloud`, `guides`, `helplines`. Each module exposes a small public API (`index.ts`), and no module imports another's internals.
- **Native code:** use local Expo modules (Expo Modules API, Kotlin and Swift) and config plugins. Never hand-edit `ios/` or `android/`, which are generated (Continuous Native Generation). Expected native pieces:
  - hardware-key signing and attestation (iOS App Attest and Secure Enclave; Android Keystore and Key Attestation);
  - streaming SHA-256 for large files;
  - Android SMS sending with SEND_SMS, APK build only;
  - an Android foreground service for microphone recording;
  - an iOS audio-recording intent with a Live Activity;
  - Lock Screen and Control Center controls, and Android widgets;
  - background location.
- **Evidence bundle:** an open format, documented in `docs/spec/evidence-bundle.md` by Stream A before code depends on it. A JSON record per file or segment holds:
  - hash and previous segment's hash;
  - capture times, location and accuracy;
  - device and app version;
  - signature and attestation;
  - timestamp proof once available.

  The format is versioned so other apps and forks stay compatible.
- **Server (R2 only):** Supabase, holding only live-location shares (deleted when sharing ends) and the helpline list. Recipients open a plain web page. Region to be decided by the owner.
- **Tella:** Tella's code (MIT, Horizontal) is a reference. Any code copied from it keeps Horizontal's notice in `THIRD_PARTY_NOTICES.md`. Its GPL-licensed Nextcloud dependencies are never copied.
- **No analytics, ads, crash-reporting or tracking SDKs**, and no network calls except those a feature needs.
- **Builds:** EAS Build for both platforms, triggered from GitHub Actions with the `EXPO_TOKEN` secret. Cloud sessions can't reach Android's build servers, and only reach Expo's API if their environment allows it (section 5).
  - **Android:** the APK goes to GitHub Releases with its SHA-256 checksum and signing-certificate fingerprint.
  - **iPhone:** builds go to TestFlight through EAS Submit.

## 3. Build streams

Each stream is a separate Claude Code cloud session on this repository, on its own branch, merging through pull requests. Stream A runs first, alone, until the shell is merged; then B, C and D start.

| Stream | Scope | Model and effort |
|---|---|---|
| **A. Foundation and evidence** | Shell, navigation, theming, i18n scaffold, module layout; evidence-bundle format; E1, E2, E4, E5, E6; body-cam mode (B1–B4); then E3 and E7 for R2 | Opus, high |
| **B. Safety and alerts** | S1, S2; then S3 (server and viewer page), S4, bug mode (E8) and confiscation mode | Opus, high |
| **C. Content and Hindi** | G3 with every number verified; G4, G5, O1; Hindi for every interface string and all content; checks owed in `docs/research/law.md` | Opus, high for anything legal; Sonnet for the rest |
| **D. Release** | GitHub Actions and EAS pipeline (signing, checksums, Releases, mirrors, TestFlight); store listings, privacy policy, App Review notes, data-safety and privacy labels | Sonnet, high |

## 4. Rules every stream follows

The rules are in [CLAUDE.md](../CLAUDE.md). In short:
- the protect-yourself framing;
- law only from statutes and judgments, with pinpoints;
- self-protection only;
- nothing of the user's leaves the phone unless they turn it on;
- Hindi for every string;
- modules kept independent;
- no secrets in the repository.

## 5. Owner's setup

1. **Expo token.** Revoke the token shared in chat and create a new robot token. Add it as a GitHub Actions secret named `EXPO_TOKEN` (repository → Settings → Secrets and variables → Actions → New repository secret).
2. **Apple.**
   - Register the App ID `in.aayushtainwala.saakshi` with App Attest.
   - Create the App Store Connect app record "Saakshi".
   - Give EAS its credentials with one command on your own computer, following handoff/streams-r1-r2.md, Stream D, "Owner's one-time steps". It creates the distribution certificate and the App Store Connect API key, or uploads one you made. The `.p8` file is never committed.
3. **Google Play.** Personal account; an Android phone for device verification; 15–20 closed-test testers.
4. **Cloud environment for build sessions** (claude.ai/code → environment selector under the message box → New environment):
   - **Name:** `saakshi`.
   - **Network access:** Custom. Tick "Also include default list of common package managers", and add `expo.dev`, `*.expo.dev` and `*.expo.io` to Allowed domains.
   - **Environment variables:** `BASH_DEFAULT_TIMEOUT_MS=600000` and `BASH_MAX_TIMEOUT_MS=1800000`.
5. **Start the streams** with the prompts in [handoff/streams-r1-r2.md](handoff/streams-r1-r2.md) (done, October 2026). Later rounds start from a brief in [briefs/](briefs/) and the state in [BUILD_HANDOFF.md](BUILD_HANDOFF.md).
6. **Round 2 setup, in one early sitting** (the plain guide is in the owner's vault, "Round 2 setup guide"): (a) an **Apple push key** (`.p8`) for notifications to iPhones; (b) a **Google Cloud project**, with Firebase added for notifications to Android phones, and the **Drive** permission screen and sign-in for E7; (c) an **iCloud container** for iCloud Drive copies. No paid maps (owner, 9 Nov 2026), so no Maps key. The keys and the notification service account are kept in Supabase's and EAS's secret stores, never in the repository. Parts 2 and 3 cannot be finished without them.

# Build Handoff

The pickup file for build sessions. Each stream keeps its own section current: status, what was done, what's next, questions for the owner. Read [CLAUDE.md](../CLAUDE.md) first.

## Order

1. **Stream A** starts first and merges the shell (navigation, i18n, theming, module layout) to `main`.
2. **Streams C and D** may start before the shell is merged, on work that doesn't touch the app's code:
   - C: helpline verification, the law-note checks, and drafting content in Markdown under `docs/content/`;
   - D: `eas.json`, the GitHub Actions workflows, the credential steps, and store text in `store/`.

   Each then rebases on `main` once the shell is merged, and moves its content into the app's structure.
3. **Stream B** starts once the shell is merged, because its work is all app code.
3. Each stream opens pull requests into `main`. The owner (or a review session) merges them.

## Owner questions

Streams add questions here as `- [ ] (Stream X) question`.

- [x] (Stream A) **Deleting recordings.** *Answered 20 Oct:* ordinary delete ships in R1, one session at a time with a confirmation. Quick delete (E9) stays held back. SPEC E5.
- [x] (Stream A) **Segment length.** *Answered 20 Oct:* the evidence camera saves one file from start to stop, with no segments and no joining; the format must survive a sudden cut-off (check its cost on both platforms first and report in this handoff). Segments are for bug mode and body-cam mode only. SPEC E1, E8, body-cam mode.
- [x] (Stream A) **Certificate language.** *Answered 20 Oct:* English only for now, with the Hindi help text kept. SPEC E4.
- [x] (Stream A) **App Attest environment.** *Answered 20 Oct:* `production` confirmed.
- [x] (Stream D) **Play signing key.** When you first upload to Google Play, the Console asks who holds the app signing key. Two choices:
  - **(a) Google makes its own key (the default).** The Play copy and the GitHub APK then have different signatures. Android won't install one over the other, so someone switching must uninstall first, which **deletes the recordings kept in the app**.
  - **(b) Upload our EAS keystore as the app signing key.** Both copies share one signature and the user can switch freely.

  I recommend (b). Decide before the first Play upload: it can't easily be changed afterwards. (b) needs the keystore backup (Stream D, step 4) and Google's key-export steps in the Console, which I couldn't read from here. *Answered 21 Oct: (b).* At the first Play upload, choose to upload your own app signing key, using the EAS keystore from step 4, rather than letting Google make one. The keystore backup is therefore required before the first Play upload.
- [x] (Stream D) **Public contact email** for the privacy policy, TestFlight feedback, App Review contact and the Play developer page. *Answered 21 Oct:* `tainwala.aayush@gmail.com`. It is now in the privacy policy (both languages) and the store text.
- [x] (Stream D) **Play target audience.** I suggest 18 and over. Your call. *Answered 21 Oct:* 18 and over.
- [ ] (Stream D) **Mirrors.** *21 Oct: on hold until the owner confirms.* The Codeberg job stays off: it runs only once `CODEBERG_REPO` is set.
  - Is Codeberg fine as the first mirror (docs/release/mirrors.md)?
  - The Internet Archive's official uploader is AGPL. May CI use it (it never enters the app), or should a later session use plain `curl` instead?
- [x] (Owner, 21 Oct) **The repository is public**, by the owner's decision. GitHub Pages may serve the privacy policy and the live-location viewer page (S3).
- [ ] (Stream B) **Supabase region for live location (S3).** Which region should the project be created in? Mumbai (`ap-south-1`) keeps the data in India and is closest to users. Nothing will be created until you answer.
- [x] (Stream B) **Phone backups.** Android backs up an app's files to the user's Google account unless the app turns this off (`android.allowBackup`), and iCloud backs up the documents directory. That would copy trusted contacts (and evidence) off the phone. Turn Android backup off for the whole app, keep it, or exclude only some files? This touches Stream A's evidence too. *Answered 20 Oct:* the user chooses whether anything is backed up and where: local only, or a cloud service of their own (Google Drive, iCloud or another). Nothing ever comes to us. So the app starts local-only, with the phone's automatic backups off for its files, and copies only where the user chooses. SPEC section 2. Work for Streams A and B: see Stream D, "For other streams".
- [x] (Stream B, for Stream D) **Extra Android permissions.** `npx expo config --type introspect` shows the Expo defaults `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the manifest. No feature needs them; consider blocking them in `app.json` (`android.blockedPermissions`) so the Play listing and App Review notes stay short. *Done by Stream D:* `app.config.ts` blocks all three in every Android build.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

---

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

---

## Stream A: Foundation and evidence

**Status:** R1 evidence pipeline (E1, E2, E4, E5, E6) built and tested in code; not yet run on a phone. Owner decisions of 20 Oct (owner questions above) add: ordinary delete, one-file video, and body-cam mode (B1–B4) in R1.
- Shell: merged to `main` (https://github.com/AayushTainwala/Saakshi/pull/1). **Streams B, C and D can start.**
- Evidence: https://github.com/AayushTainwala/Saakshi/pull/2 (`stream-a/evidence`), ready for review. The Native build workflow compiles the Android debug and iOS simulator apps successfully.

**Done, shell:**
- Template demo screens and assets removed; Expo Router native tabs Record, SOS, Guides, Help, Settings; i18next with English and Hindi and a language switch; light and dark themes with a switch; module stubs for `evidence`, `sos`, `location`, `bugmode`, `cloud`, `guides`, `helplines`; jest-expo with tests for i18n completeness, language choice, preferences and colour contrast; Expo packages updated to SDK 58's expected patch versions.
- The SOS tab has a "Call 112" button only; the rest of SOS is Stream B's. The Hindi strings are Stream A's first pass for Stream C to review.

**Done, evidence** (one commit per step on `stream-a/evidence`):
1. `docs/spec/evidence-bundle.md` v0.1: records, ES256 signatures over the RFC 8785 canonical record file, the per-session chain, Android Key Attestation and Apple App Attest binding, the bundle, certificate Part A, the witness message, and how to verify with `openssl`.
2. **E1 capture:** full-screen camera (`expo-camera`) for photos and video; video in 60-second segments; the latest location fix for each file.
3. **E1 hashing:** local Expo module `modules/saakshi-evidence` (`hashFile`) reads each file once in 1 MiB chunks for SHA-256, SHA-1, MD5 and CRC-32 (Android in plain Java on the IO dispatcher, iOS with CryptoKit in a detached task). Files are hashed at the camera's path before they are moved into the locker.
4. **E1 signing:** one device key per install. Android: Keystore EC P-256 in StrongBox or the TEE, with Key Attestation. iPhone: Secure Enclave P-256, bound to App Attest by attesting the SHA-256 of its public key; the app retries App Attest when the Record tab opens until it succeeds (it needs the internet once). Each file gets a signed record chained to the one before.
5. **E5 locker and export:** session screen with status (fingerprinted and signed, checked on this phone, witness message sent, certificate made), the chain head and each file's SHA-256; "Check files" re-hashes everything and checks the chain; "Export bundle" writes the ZIP in the spec and opens the share sheet. `tools/verify-bundle.mjs` checks a bundle with Node alone.
6. **E2 witness message:** opens the SMS app with the chain head, time (IST) and place; every attempt is noted in the manifest and hash report.
7. **E4 certificate:** a form for name, relation, address, IMEI (with `*#06#` help) and ownership; Part A pre-filled (Mobile, make and model, SHA256 and each file's hash) with the hash report enclosed, as a PDF saved with the session and added to the bundle. It states that Part B needs an expert.
8. **E6 rights prompts:** seven prompts drawn over the camera preview, with previous, next and hide; `rights/prompts.ts` lists the law.md source of each.
9. **For Stream B:** `createEvidenceSession()` from `@/modules/evidence` seals any recording (audio included) as it closes; use it for bug mode's segments (E8).

**Verified:**
- **Streaming hash on 1 GiB:** `modules/saakshi-evidence/verify/verify-hashing.sh` runs the Android hasher (the same `StreamingHasher.java`) on a 1 GiB random file with the JVM heap capped at 16 MB. Size, SHA-256, SHA-1, MD5 and CRC-32 all match `sha256sum`, `sha1sum`, `md5sum` and zlib; 10.1 s in this cloud container, 4 MB of heap used. It also passes on GitHub's runner (the Native build workflow's first job).
- **iOS hashing** uses the same chunked loop as Expo's own `File.digest`, but has not been run: there is no Swift toolchain here.
- **ZIP:** read back byte for byte by Python's `zipfile` and `unzip`, normal and ZIP64; and once with a 4.06 GiB entry (`SAAKSHI_BIG_ZIP=1 npx jest zip-large`), which `unzip -t` accepts.
- **Signatures and chain:** tests seal files through the real pipeline with a P-256 key in Node, build bundles, and run `tools/verify-bundle.mjs` on them as a ZIP and as a folder. One signature is also checked with `openssl dgst -verify` as the spec describes. Changed media, a removed segment and an edited record are all caught.
- 93 tests pass (plus the 4 GiB ZIP test, which runs only on request); typecheck and lint pass.

**Not verified:**
- Nothing has run on a phone. Camera capture, segment hand-over, the Keystore and Secure Enclave keys, App Attest, the share sheet, SMS composer and PDF printing need testing on a real Android phone and iPhone. App Attest does not work in the simulator.
- **Native code** compiles (Android debug and iOS simulator builds pass in `.github/workflows/native-build.yml`, which runs on every pull request that touches native code), but none of it has run. This container can't build either platform.
- `tools/verify-bundle.mjs` does not check attestation chains (spec section 10, step 6). That is the next piece of tooling to write.

**NEEDS OWNER REVIEW:**
- **Certificate Part A text** (`src/modules/evidence/certificate/html.ts`): checked against the Gazette of India on 21.10.2026 (law.md section 1B). The wording matched, item 3 included; the layout now follows the Gazette too (unnumbered paragraphs, "Make & Model", "Son/daughter/spouse", em dashes). The owner's sign-off is what remains: until `FORM_TEXT_REVIEWED` is `true`, the PDF prints "DRAFT: the text of this form has not yet had its final legal review".
- **Rights prompts** (`src/i18n/locales/{en,hi}/record.json` under `rights`, sources in `src/modules/evidence/rights/prompts.ts`): wording in English and Hindi. Sources: Art. 22(1); BNSS ss.36(a), 38, 47(1)–(2), 48; *Mihir Rajesh Shah* para 56; BNS ss.221, 262. All are rows marked VERIFIED (IK) in law.md, none checked against the Gazette yet.
- **Certificate screen help text** (`certificate.*` in `record.json`), in both languages.

**Next:**
- Owner and phone testing of R1 as above; fix what it finds.
- Attestation checking in `tools/verify-bundle.mjs` (Android chain to Google's roots; Apple App Attest object).
- **For Stream B:** expose trusted contacts from `@/modules/sos` (for example `getTrustedContacts(): Promise<{ name: string; phone: string }[]>`). The witness message will then fill in recipients; today the user picks them in the SMS app.
- **R2:** E3 OpenTimestamps (our own client against the public calendar servers; proofs in `timestamps/` as spec version 0.2) and E7 Google Drive with the `drive.file` scope.

**Start prompt** (paste into a new cloud session on this repository, model Opus, effort high):

> You are Stream A for Saakshi. Read CLAUDE.md, docs/SPEC.md, docs/BUILD_PLAN.md and docs/BUILD_HANDOFF.md, then work on branch `stream-a/foundation`.
>
> **First, the shell, as one pull request.**
> - Remove the Expo template's demo screens.
> - Set up Expo Router tabs: Record, SOS, Guides, Help, Settings.
> - Add i18next with English and Hindi resource files, a language switch in Settings, and the device language as default.
> - Add theming: light and dark, large touch targets, readable at arm's length.
> - Create the module folders under `src/modules/` with `index.ts` stubs.
> - Add a test runner (jest-expo).
> - Typecheck and lint must pass. Open the pull request and update the handoff, so Streams B, C and D can start.
>
> **Then the evidence pipeline** (spec section 4: E1, E2, E4, E5, E6):
> 1. Write `docs/spec/evidence-bundle.md` (v0.1) before code depends on it.
> 2. Camera capture for photo and video.
> 3. Streaming SHA-256 on close. Verify the chosen approach on a 1 GB file.
> 4. A signed record per file and segment, with the previous segment's hash chained in. Use hardware-backed keys with attestation (iOS App Attest and Secure Enclave; Android Keystore and Key Attestation) through a local Expo module.
> 5. The evidence locker and export bundle through the share sheet.
> 6. Witness SMS of the hash, time and place to chosen contacts.
> 7. BSA s.63 certificate Part A as a PDF with the hash report. Use the Schedule fields in docs/research/law.md section 1B; the text needs the owner's review.
> 8. Rights prompts overlaid while recording, never burned into the file.
>
> Read Tella's code (github.com/Horizontal-org/Tella-Android and Tella-iOS, MIT) for reference on capture and metadata. Its file hashing is in BaseVault.java and VaultFilesManager.swift.
>
> Keep each step a separate commit, and open a pull request when E1–E6 work. For R2 later: E3 (OpenTimestamps through its public calendar servers, written ourselves, not the LGPL clients) and E7 (Google Drive with the drive.file scope).

---

## Stream B: Safety and alerts

**Status:** R1 (S1, S2) built and tested in code, on branch `claude/stream-b-sos-efgu96`; pull request open. Not yet run on a phone. R2 next.

**Done, R1:**
- **Local Expo module `modules/saakshi-sos`** (Kotlin and Swift):
  - `pickPhoneNumber()`: the phone's own contact picker for one number, with **no contacts permission** on either platform. Android uses `ACTION_PICK` on `Phone.CONTENT_URI`, which grants read access to the picked number only; iPhone uses `CNContactPickerViewController`, which runs outside the app. `expo-contacts` was not used because its config plugin always adds `READ_CONTACTS` and `WRITE_CONTACTS`.
  - `canSendDirectly()` and `sendDirect(phones, message)`: Android `SmsManager` (multipart where needed), waiting up to 60 s for the radio's "sent" report for each part. Reports `sent`, `failed` (with the SmsManager code) or `unknown` per recipient. `canSendDirectly()` is true only if the built manifest declares `SEND_SMS`.
  - **Build flag:** `modules/saakshi-sos/app.plugin.js` declares `SEND_SMS` only when prebuild runs with `SAAKSHI_SMS_AUTOSEND=1`; otherwise it writes `SEND_SMS` with `tools:node="remove"`, so no library can add it to a Play build. Checked with `npx expo config --type introspect` both ways, and by `modules/saakshi-sos/__tests__/plugin.test.ts`.
- **`@/modules/location`:** `getCurrentFix()` (a recent fix at once if the phone has one within 2 minutes and 100 m; else waits up to 6 s for a new fix; else the last fix the phone knows, with its own time; never throws), `mapsLink()` (`https://maps.google.com/?q=lat,lng`, opens in any browser), and permission helpers.
- **`@/modules/sos`:**
  - Trusted contacts, at most 10, in `sos-contacts.json` in the app's documents directory. Indian numbers are stored as `+91` and ten digits, so the same person isn't added twice. Added from the picker or typed in; removed one tap each.
  - **SOS (S1):** the alert text is the title, a map link with accuracy and the fix time, and the time sent (IST), in the app's language. Without SEND_SMS the Messages composer opens with every contact and the text; the user taps Send. 112 stays at the top of the SOS tab.
  - **Auto-send (S2):** where the build declares SEND_SMS and the user has allowed it (one card on the contacts screen asks), the alert sends itself after a 3-second countdown with "Send now" and "Don't send". Contacts the network didn't confirm can be sent to from the Messages app with one tap. If SmsManager throws (permission withdrawn, no SIM), the composer opens instead.
  - `alertController` is one shared instance, so the R2 code pad and confiscation mode drive the same alert.
  - **For Stream A:** `getTrustedContacts(): Promise<TrustedContact[]>` from `@/modules/sos` (`{ id, name, phone }`, phone in international form). The witness message can now fill in its recipients.
- Routes: `src/app/(tabs)/sos/index.tsx` (SOS) and `src/app/(tabs)/sos/contacts.tsx` (trusted contacts). Strings in `sos.json`, English and Hindi (first pass; for Stream C to review).

**For Stream D:** set `SAAKSHI_SMS_AUTOSEND=1` in the `env` of the `apk` EAS profile only. The `play` and `ios` profiles leave it unset.

**Verified:** 47 new tests (phone numbers, the contacts store, the alert text, the alert controller with countdown, cancel, fallback and partial failure, `getCurrentFix`, the config plugin, and the SOS and contacts screens). All 140 tests, typecheck and lint pass.

**Not verified:**
- Nothing has run on a phone. The picker, SmsManager sending and its reports, and the composer need testing on an Android phone (APK built with the flag, and without) and an iPhone.
- The native code has not been compiled here (no Android SDK or Swift in this container); the Native build workflow compiles it on the pull request.

**Platform limits (R1):**
- **iPhone can't send SMS by itself.** Apple's composer always needs the user to tap Send. A fully automatic iPhone alert needs a server path (spec S3's server, or an SMS gateway), which is out of R1.
- **Android "sent" means the network accepted it,** not that it was delivered. Delivery reports are not requested.
- **Dual-SIM phones set to "ask every time"** have no default SMS SIM; SmsManager may then fail. Not tested. If it fails, the app offers the Messages app for those contacts.
- **Android rate limit:** Android asks the user to confirm when an app sends more than 30 texts in 30 minutes. Ten contacts allow three alerts in that window before the prompt.
- **Sideloaded APK and SEND_SMS:** `docs/research/platforms-and-stores.md` 1.5 says Play Protect's India pilot doesn't list SEND_SMS, but that list may have grown. Not tested; test the APK sideloaded through Chrome on an Indian phone.
- Alert texts in Hindi use Unicode SMS (70 characters a part), so each is about three parts.

**Owner questions:** see the list at the top (Stream B items).

**Next (R2):** S4 code pad and triggers, S3 live location (waits on the region), E8 bug mode, confiscation mode.

**Start prompt** (model Opus, effort high):

> You are Stream B for Saakshi. Read CLAUDE.md, docs/SPEC.md (section 5), docs/BUILD_PLAN.md and docs/BUILD_HANDOFF.md. Branch `stream-b/sos` from the latest `main`, after Stream A's shell is merged.
>
> **For R1:**
> - S1: emergency contacts stored only on the phone, picked from the address book or typed in. SOS composes an SMS to all of them with a location link and the time; on iPhone the user taps Send. 112 is always one tap away.
> - S2: in the Android APK build only, SOS sends the SMS automatically through a local Expo module using SmsManager and SEND_SMS. Keep it behind a build-time flag so a Play build can drop the permission.
>
> **For R2:**
> - S4: a trigger that opens straight to a 3-digit code pad, sending on the third correct digit. iPhone: App Intents for the Action Button, Lock Screen and Control Center controls. Android: a home-screen widget and a notification action. Refuse codes matching emergency numbers.
> - S3: live location by link. A Supabase table with a share token, positions and expiry, row-level security, deletion when sharing stops, and a plain web viewer page. Ask the owner for the region before creating anything.
> - E8: bug mode. Segmented audio of 1–3 minutes, each segment hashed through Stream A's evidence module, with the hash sent and the segment uploaded through E7 when available. It must keep recording with the screen locked: iOS background audio with a Live Activity; Android a foreground service of type microphone.
> - Confiscation mode: one action that starts SOS, live location and bug mode together, plus separate controls for each.
>
> Note every platform limit you hit in the handoff. Test logic with unit tests. Open a pull request per release.

---

## Stream C: Content and Hindi

**Status:** R1 content (G3, G4, G5, O1) built and tested in code, on branch `claude/stream-c-content-0eav2f` (the session's assigned branch, in place of `stream-c/content`): https://github.com/AayushTainwala/Saakshi/pull/5. The law.md checks are partly done: a second pass on 20 Oct, after the network was widened, reached Indian Kanoon and nalsa.gov.in, but not the Gazette, India Code, sci.gov.in or 112.gov.in (see the end of `docs/research/law.md`).

**Done:**
- **G3 helplines** (`src/modules/helplines/`, list in `helplines/helplines.json`, format in `helplines/README.md`):
  - 112, 108, 102 and NALSA's 15100, each with official `gov.in`/`nic.in` sources and the date checked;
  - an empty `people` list for consenting lawyers and medics, with a strict schema (unknown fields, bad numbers, non-https sources and duplicate ids are rejected), and entries hidden after `listedUntil`;
  - the app ships with the bundled copy, fetches `https://raw.githubusercontent.com/AayushTainwala/Saakshi/main/helplines/helplines.json` when the Help tab opens, keeps whichever is newer by `updated`, ignores an invalid file, and saves the fetched one to `helplines.json` in the documents directory. CI's jest run checks the repository's file against the schema.
  - The Help tab lists each number with a Call button (`tel:`), its official sources, the lawyers and medics section (empty for now) and the list's date.
- **G4 chest mount, G5 phone safety, O1 if the network goes down** (`src/modules/guides/content/`): structured TS data, every text in English and Hindi (a missing language fails `tsc`). Guides tab lists them; `src/app/(tabs)/guides/[guide].tsx` shows one.
  - G4: body-cam mode first (start before mounting, Battery Saver / Low Power Mode, **unlock with volume-down twice**, pieces saved and signed, the iPhone and Android differences, battery and heat), then harness and clamp, lanyard (breakaway only), backpack strap clip, and three 3D models as links with their licences.
  - G5: passcode instead of face or fingerprint, with iPhone and Android settings; forcing passcode-only at the moment (iPhone side + volume for about 2 seconds, then Cancel, with a warning that holding longer calls emergency services; Android Lockdown); what to take and leave; setting up Saakshi in advance. Adapted from EFF SSD (CC BY 4.0), credited at the end of the guide and in `THIRD_PARTY_NOTICES.md`.
  - O1: meeting points, check-in times and an SMS plan for everyone; Briar for Android; no mesh app for iPhone, with the reason.
  - Sections can declare a feature they need: the confiscation-mode section is hidden until `AVAILABLE_FEATURES.confiscationMode` (in `src/modules/guides/content/index.ts`) is set to true. **For Stream B:** set it in the R2 pull request that adds confiscation mode.
  - DIY mounts carry `needsTesting` and show "Not yet tested by the Saakshi team" in the app until the flag is removed.
- **Hindi:** all new strings (`help`, `guides`) and guide content in everyday Hindi. Stream A's Hindi in `common`, `settings`, `sos` and `record` was read through and left as it is: it is already plain.
- **law.md, second pass (20 Oct):**
  - *R v. B* (Madras HC, 30.10.2024) read in full and added to section 1C: its Part B view is obiter;
  - BNS s.37 read verbatim, with a correction (see owner questions);
  - Telecom Suspension Rules 2024: notification date recorded from a Gauhati HC order;
  - a conflicting P&H HC statement on the commencement S.O.s recorded;
  - a review of High Court rulings on BSA s.63 on Indian Kanoon (`docs/research/hc-s63-review.md`; not exhaustive): none decides who may sign Part B, and they are split on late certificates;
  - NALSA's 15100 confirmed from NALSA's own pages.

  The checks that couldn't be reached from here (the Schedule against the Gazette, the commencement and DPDP notifications, the D.K. Basu and Arnesh paragraphs) were done by the review session on 21.10.2026 from the owner's browser; see law.md, "Results of the checks, 21 October 2026". The two judgments' official copies are unnumbered, so their SCC paragraph numbers still need SCC.
- 126 tests pass (33 new); typecheck and lint pass.

**Not verified:**
- **Official pages:** only NALSA's could be opened (15100 is `page-read`). 112, 108 and 102 still rest on search-engine extracts of official pages (`"how": "search-extract"`); on 21.10.2026 `112.gov.in` failed to load even from the owner's browser in India, and only an old (2019) Lok Sabha answer and a state NHM page were found (law.md, third pass, row 5). The G5 phone steps and the EFF adaptation rest on search summaries and general knowledge, not on reading Apple's, Google's or EFF's pages: `ssd.eff.org`, `support.apple.com` and `support.google.com` are not reachable from here.
- Nothing has run on a phone. The `tel:` links, the fetch and the guide screens need checking on both platforms.
- The Printables model's licence (CC BY-ND) and the Thingiverse clamp's (CC BY-NC) come from mirror sites, as in the research doc.

**NEEDS OWNER REVIEW:**
- **Helplines** (`helplines/helplines.json`): the four numbers and their descriptions in both languages, including the medical ones (108: accidents, injuries and serious illness; 102: mainly pregnant women and young children). Open each source and change `how` to `page-read`. Sources are tabled at the end of `docs/research/law.md`.
- **Help tab wording** about listed lawyers and medics: "Saakshi does not arrange their help or answer for their work" (`help.json`, `people.intro`).
- **G4** (`chestMount.ts`): body-cam section against Stream A's build when it lands (button sequence, what the locked screen says, iPhone gaps); the lanyard strangulation warning; the heat note. **NEEDS TESTING:** harness and clamp, lanyard, backpack strap clip.
- **G5** (`digitalSafety.ts`): the iPhone and Android steps need trying on current phones (Samsung One UI 9 beta reportedly drops Lockdown from the power menu); the iPhone emergency-call warning; the what-to-take list (see the ID question above). Compare against the SSD text for the attribution.
- **O1** (`offline.ts`): the claims that Briar has been independently audited (Cure53 2017; Radically Open Security via OTF 2023–24, from the research doc) and has no iPhone app; the link goes to briarproject.org only, as its Play Store status was not confirmed.
- **law.md**: the leads in the check results are unverified and must not be relied on until the documents are opened.
- **`docs/research/hc-s63-review.md`**: drawn from Indian Kanoon text, not certified copies; several rows are short orders without reasons.

**Next:**
- Open the official pages (or allow their domains in the environment's network settings) and finish the seven law.md checks and the helpline `page-read` checks.
- Field-test the DIY mounts; remove `needsTesting` from each that passes and note it here.
- Research for "what police may ask of a phone", if the owner agrees (owner questions).
- v1.1: G1 know-your-rights cards and G2 physical safety.

**Start prompt** (model Opus, effort high):

> You are Stream C for Saakshi. Read CLAUDE.md, docs/SPEC.md (section 6) and docs/research/. Branch `stream-c/content` from the latest `main`, after Stream A's shell is merged.
>
> Write the R1 content as structured data (JSON or TS) under `src/modules/guides/content/` and `src/modules/helplines/`, in English and Hindi:
> - G3 helplines:
>   - 112, the ambulance numbers and NALSA's legal-aid helpline, each verified from an official government page and recorded with its source URL;
>   - an empty, schema-checked list for consenting lawyers and medics;
>   - loading from a remote JSON so the list updates without a release (host it in this repository's `helplines/` folder via the raw GitHub URL for now).
> - G4: the chest-mount guide (harness with clamp, a lanyard method, links to open 3D models with their licences, from docs/research/open-source-and-licences.md). Mark the DIY methods `NEEDS TESTING`.
> - G5: digital safety and preparedness. Turn off Face ID and fingerprint unlock before going out; force passcode-only at the moment (iPhone: hold side + volume for 2 seconds; Android: Lockdown). Also: what to leave at home, and setting up contacts and confiscation mode in advance. Adapt from EFF Surveillance Self-Defense (CC BY 4.0) with attribution.
> - O1: Briar for Android users. No mesh app for iPhone, because none is audited and available in India. Meeting points, check-in times and an SMS plan for everyone.
> - Hindi for every interface string in the i18n files. Use plain, everyday Hindi in Devanagari, not Sanskritised Hindi.
>
> Then do the checks owed at the end of docs/research/law.md, from official sources where reachable, recording each result there.
>
> Everything legal or medical is marked `NEEDS OWNER REVIEW` in the handoff. Open a pull request.

---

## Stream D: Release

**Status:** pipeline, credentials plan, store text and mirror plan written; pull request open from branch `claude/stream-d-release-pipeline-ppk2mx`. **Nothing has run on EAS yet:** the first run needs the owner's one-time steps below.

**Done:**
- **`eas.json`:** three profiles. Version numbers are kept on EAS (`appVersionSource: remote`) and go up by one with every build. All three use the one Android keystore EAS holds for the app.

  | Profile | Builds | Flags |
  |---|---|---|
  | `apk` | Android APK for GitHub Releases | `SAAKSHI_CHANNEL=github`, `SAAKSHI_SMS_AUTOSEND=1` |
  | `play` | Android App Bundle | `play`, SMS auto-send `0` |
  | `ios` | iPhone store build | `appstore`, SMS auto-send `0` |
- **`app.config.ts`:** reads those flags on top of `app.json`.
  - Puts `channel` and `smsAutoSend` in `Constants.expoConfig.extra`.
  - Refuses SMS auto-send in a store build.
  - Removes SEND_SMS from every Android build except the APK.
  - Always removes READ_SMS and RECEIVE_SMS (Play Protect India), plus SYSTEM_ALERT_WINDOW and READ/WRITE_EXTERNAL_STORAGE. Expo's template and expo-file-system add those last three, and nothing uses them: every file lives in the app's own storage.
  - With the `play` flags, the prebuilt Android manifest asks only for camera, microphone, location, internet and vibrate.
- **`.github/workflows/release.yml`:** runs on a `v*` tag, or by hand from Actions → Release → Run workflow (choose platforms, TestFlight on or off, and an optional tag to publish).
  1. Typecheck, lint and tests. It also checks that the tag matches `expo.version` in `app.json`.
  2. Three EAS builds in parallel, each `eas build --non-interactive --wait --json`.
  3. **APK:**
     - downloads it;
     - checks it with `apksigner` (exactly one signer) and `aapt2` (fails on READ_SMS, RECEIVE_SMS, notification-listener or accessibility);
     - computes the SHA-256 and the signing-certificate SHA-256;
     - publishes a GitHub Release with the APK, `SHA256SUMS`, `SIGNING-CERTIFICATE.txt`, and notes from `tools/release-notes.mjs` (what the app is, 112, how to check the fingerprints, install steps in English and Hindi).
  4. **Play bundle:** checked for SMS permissions and kept as a workflow artifact for 30 days, for you to upload in the Play Console.
  5. **iPhone:** `eas submit` to TestFlight. This is skipped, with a warning, until `ascAppId` is in `eas.json`.
  6. **Codeberg mirror:** pushes `main` and the tag, then creates the same release there. It runs only once `CODEBERG_REPO` and `CODEBERG_TOKEN` are set.
- **`.github/workflows/pages.yml`:** publishes `store/site/` to GitHub Pages:
  - privacy policy at `https://aayushtainwala.github.io/Saakshi/privacy/` (Hindi at `/privacy/hi/`);
  - a short home page.
- **`store/`:** see `store/README.md`.
  - Listings and keywords in English and Hindi.
  - Apple privacy label answers: **Data Not Collected**, with Apple's definitions quoted.
  - Play Data safety and other App content answers.
  - App Review notes explaining every permission.
  - TestFlight test information.
- **`docs/release/mirrors.md`:** Codeberg first (automated), then the Internet Archive and a messaging channel (by hand). IzzyOnDroid is blocked by its 30 MB APK limit.

**How EAS gets the credentials** (from the Expo docs of Jul–Oct 2026, and the EAS CLI 25.2.0 source, read 20 Oct 2026):
- **Android keystore: nothing for you to do.**
  - When a non-interactive build finds no keystore, EAS CLI generates one on EAS's servers (`CreateKeystore.provideOrGenerateAsync`: with `nonInteractive` it skips the question and calls `generateRandomKeystoreAsync`).
  - The first Release run creates it, and every later build reuses it. The keystore is stored encrypted on EAS ([Security](https://docs.expo.dev/app-signing/security.md)).
- **iPhone distribution certificate: needs one interactive command, once.**
  - In non-interactive mode, EAS CLI refuses to create a distribution certificate (`SetUpDistributionCertificate.runNonInteractiveAsync` throws "Credentials are not set up. Run this command again in interactive mode.").
  - It can renew a provisioning profile non-interactively only with an App Store Connect API key.
  - Expo's [Trigger builds from CI](https://docs.expo.dev/build/building-on-ci.md) says the same: run once from your own terminal so EAS can prompt for what it needs.
- **App Store Connect API key:** the same command uploads it to EAS (or has EAS create it), so it never goes in the repository or in GitHub secrets.
  - Expo's [Submit to the Apple App Store](https://docs.expo.dev/submit/ios.md): `eas credentials --platform ios` → App Store Connect: Manage your API Key → Set up your project to use an API Key for EAS Submit.
  - In non-interactive mode, `eas submit` then uses "the key assigned to your app", and the submit profile needs `ascAppId`.

**Owner's one-time steps:**
1. **Expo token.** If not done yet (BUILD_PLAN section 5, step 1):
   - revoke the token that was shared in chat;
   - at expo.dev → your account → Settings → Access tokens, create a new one;
   - on GitHub, open Saakshi → Settings → Secrets and variables → Actions → **New repository secret**, named `EXPO_TOKEN`.
2. **Android: nothing.** The first run of the Release workflow makes the signing key.
3. **iPhone: one command on your own computer (Mac, Windows or Linux), once.** It can't run in a cloud session, because it needs your Apple ID login and the two-factor code on your phone.
   1. Install Node.js 22 (nodejs.org) and Git.
   2. In a terminal:
      ```bash
      git clone https://github.com/AayushTainwala/Saakshi.git
      cd Saakshi
      npm ci
      npx eas-cli@latest login
      npx eas-cli@latest credentials --platform ios
      ```
   3. In the menus:
      1. Choose the build profile **ios**, and log in to your Apple account when asked.
      2. Choose **Build Credentials: Manage everything needed to build your project** → **All: Set up all the required credentials to build your project**. EAS creates the distribution certificate and a provisioning profile with App Attest.
      3. Choose **Go back** → **App Store Connect: Manage your API Key** → **Set up your project to use an API Key for EAS Submit**.
         - Let EAS **generate** the key. Pick **ADMIN** if CI should renew the provisioning profile by itself each year; pick **APP_MANAGER** for the least access, and then re-run this command once a year.
         - If you already made a key in App Store Connect, choose to give it instead (the `.p8` file path, key ID and issuer ID). EAS uploads it. Then delete the `.p8` from the clone folder, or move it to your password manager. **Never commit it.**
      4. **Exit.**
   4. Re-run step 3 whenever an iPhone capability or app extension is added (for example Stream B's Lock Screen controls or widgets in R2), and if a build says the provisioning profile has expired.
4. **Back up the Android key** (after the first Release run; **required before the first Play upload**, because Play will sign with this key, as decided on 21 Oct). Losing it means no update can ever install over existing copies, and the published fingerprint changes.
   1. On the same computer, run `npx eas-cli@latest credentials --platform android`.
   2. Choose profile **apk** → **Keystore: Manage everything needed to build your project** → **Download existing keystore**.
   3. Keep the `.jks` file and the passwords it prints in your password manager. **Never commit them.**
5. **App Store Connect app ID.** *Done 20 Oct: `ascAppId` 6824945012 is in `eas.json`.*
   1. In App Store Connect, open Saakshi → App Information → General Information, and copy the **Apple ID** (a number).
   2. In `eas.json`, change `"ios": {}` under `"submit"` to `"ios": { "ascAppId": "THE NUMBER" }`, and commit (the GitHub web editor is fine). It is not a secret.
   3. From then on, every iPhone build goes to TestFlight.
6. **GitHub Pages.** On GitHub, open Saakshi → Settings → Pages → Build and deployment → Source: **GitHub Actions**. Then Actions → Privacy policy site → **Run workflow** (later merges to `main` update it by themselves).
7. **First release.**
   1. Check the version in `app.json` (`1.0.0`).
   2. Go to Actions → Release → **Run workflow**, choose platform **all**, and set the release tag to `v1.0.0`.
   3. Later releases: change the version, then run the workflow the same way, or push a tag `v1.0.1` from git.
   4. Don't create the release by hand in GitHub's Releases page. The workflow creates it, and would fail if it already exists.
8. **Optional, when ready:**
   - **Codeberg mirror:** the steps in docs/release/mirrors.md, section 2.
   - **TestFlight public link:** once Apple approves the first external build, set the repository variable `TESTFLIGHT_PUBLIC_LINK` (Settings → Secrets and variables → Actions → Variables), and releases will include it.

**Verified:**
- `eas.json` parses with EAS's own parser, `@expo/eas-json` 25.2.0, and the three profiles resolve as intended.
- `npx expo config` gives the right `extra` and `blockedPermissions` under each profile's flags, and refuses SMS auto-send for `play`.
- `npx expo prebuild --platform android` (run, then removed) writes the removals into `AndroidManifest.xml` as `tools:node="remove"`.
- `actionlint` 1.7.7, with `shellcheck` 0.11.0, passes on all three workflows.
- The apksigner digest parsing and the colon formatting were tried on sample output.
- New tests:
  - `__tests__/app-config.test.ts`: flags and permissions;
  - `tools/__tests__/release-notes.test.ts`;
  - `store/__tests__/store.test.ts`: Apple and Play limits (Apple keywords in bytes); English and Hindi listings with the same shape; no "emergency service" wording or "admissible" claims; App Review notes under 4000 bytes and naming every iOS permission string in the app; privacy pages that link only to pages that exist, with matching structure in both languages.
- `npx tsc --noEmit`, `npx eslint .` and `npx jest` pass: 125 tests. `expo-doctor` gives the same two network-only failures as before.

**Not verified:**
- **Nothing has run on EAS or GitHub's runners yet.** That needs the owner's steps.
  - The APK download relies on the build's `artifacts.buildUrl` from `eas build --json` for a `store` build. I believe it downloads without a login, but haven't seen it.
  - The `ANDROID_HOME` build-tools path is assumed on `ubuntu-latest`.
- **Codeberg job:** written from Gitea's API source. codeberg.org is unreachable from this session (docs/release/mirrors.md).
- **Google Play wording:** support.google.com and play.google.com are unreachable from here. The Data safety answers and the Play listing limits come from what the app does and from search summaries, so check them in the Console (`store/play/data-safety.md`).
- The Apple privacy-policy link in the privacy policy (apple.com is unreachable here).
- **EAS plan limits:** each release uses three builds, and I don't know which EAS plan the account is on or its monthly build allowance.

**NEEDS OWNER REVIEW:**
- **All store text** (`store/`), above all the one legal line in the listings: section 63(4) of the BSA, 2023 asks for a certificate in the Schedule form with an electronic record; Saakshi fills Part A; Part B needs an expert. Source: law.md 1A, rows s.63(4)(a)–(c).
- **The privacy policy** (`store/site/privacy/`). It describes R1 as specced, including S1 contacts, the SOS SMS and the helpline download, which other streams are still building. Check it against what actually ships. Its "Backups" section follows your 20 Oct decision (the user chooses: local only or their own cloud). It is true only once Streams A and B have built that, so check it before release.
- **The Hindi** of the listings, privacy policy and release notes (and Stream C's review). The Devanagari spelling of your name is left out; the Hindi uses "Aayush Tainwala".

**For other streams:**
- **Streams A and B, backups** (owner's decision of 20 Oct, SPEC section 2): the app must back nothing up until the user chooses.
  - Android: Expo's default `android.allowBackup` is on, so Auto Backup copies app files to the user's Google account unless the app turns it off. It is a manifest setting fixed at build time, so the user's choice can't switch it on and off. Turn it off, and offer the user's own cloud through the app instead (export, or E7).
  - iPhone: iCloud backup includes the app's documents unless files are excluded from backup. Exclude them by default, and include them only if the user turns iCloud backup on.
  - The privacy policy's "Backups" section, the Apple label and the Play answers assume this.
- **Stream B:**
  - Read `Constants.expoConfig?.extra?.smsAutoSend` (boolean) to choose auto-send (S2) or the composer.
  - The SMS module can declare SEND_SMS in its own manifest; `app.config.ts` removes it from every build but the APK.
  - Don't add READ_SMS, RECEIVE_SMS, a notification listener or an accessibility service: the release workflow fails the APK if any appears.
  - To try S2 locally, build with `SAAKSHI_CHANNEL=github SAAKSHI_SMS_AUTOSEND=1`.
- **Stream A:**
  - SYSTEM_ALERT_WINDOW and the external-storage permissions are now removed. Nothing in the code uses shared storage, but check the camera and export on a phone.
  - **Body-cam mode** will need Play's foreground-service declaration (camera and microphone types). On iPhone, the background audio is explained in an optional block in `store/apple/review-notes.md`; check it matches what you build.
- **Stream C:** review the Hindi in `store/listing/hi.json`, `store/site/privacy/hi/` and `tools/release-notes.mjs`.

**Next:**
- After the owner's steps, the first Release run. Fix whatever it finds, and record the real APK size, which decides IzzyOnDroid.
- Screenshots and the Play feature graphic, once the app runs on a phone.
- Bring the privacy policy, privacy label and Data safety answers up to date before R2's S3 and E7 ship.

**Start prompt** (model Sonnet, effort high):

> You are Stream D for Saakshi. Read CLAUDE.md, docs/BUILD_PLAN.md and docs/research/distribution-and-accounts.md. Branch `stream-d/release` from the latest `main`, after Stream A's shell is merged.
>
> Build the release pipeline:
> - **eas.json** with profiles:
>   - `apk` (Android APK for GitHub Releases, SMS auto-send on);
>   - `play` (Android App Bundle, SMS auto-send off);
>   - `ios` (store build).
> - **GitHub Actions** using expo/expo-github-action and the `EXPO_TOKEN` secret:
>   - triggered manually and on `v*` tags;
>   - runs `eas build --non-interactive` for Android and iPhone, and `eas submit` to TestFlight;
>   - downloads the APK, computes its SHA-256 and signing-certificate fingerprint, and publishes a GitHub Release with both and plain install steps.
> - **Credentials**, from current EAS docs (don't rely on memory):
>   - how EAS gets the Android keystore and the iOS distribution certificate non-interactively;
>   - how the owner registers his App Store Connect API key with EAS without committing it.
>
>   Write the owner's one-time steps in the handoff in plain language. If one interactive command is unavoidable, say exactly which one and where to run it.
> - **Store text** in `store/`, in English and Hindi:
>   - listings, keywords, a privacy policy page (served from GitHub Pages);
>   - Apple's privacy label answers ("Data Not Collected" if true) and Play's Data safety answers;
>   - App Review notes explaining every permission, under the protect-yourself framing.
> - **Mirrors:** a plan for at least one host besides GitHub.
>
> Open a pull request.

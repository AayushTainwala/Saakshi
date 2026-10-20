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
- [ ] (Stream B) **Supabase region for live location (S3).** Which region should the project be created in? Mumbai (`ap-south-1`) keeps the data in India and is closest to users. Nothing will be created until you answer.
- [ ] (Stream B) **Phone backups.** Android backs up an app's files to the user's Google account unless the app turns this off (`android.allowBackup`), and iCloud backs up the documents directory. That would copy trusted contacts (and evidence) off the phone. Turn Android backup off for the whole app, keep it, or exclude only some files? This touches Stream A's evidence too.
- [ ] (Stream B, for Stream D) **Extra Android permissions.** `npx expo config --type introspect` shows the Expo defaults `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the manifest. No feature needs them; consider blocking them in `app.json` (`android.blockedPermissions`) so the Play listing and App Review notes stay short.

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

**Status:** R1 evidence pipeline (E1, E2, E4, E5, E6) merged (https://github.com/AayushTainwala/Saakshi/pull/2). The owner's decisions of 20 and 21 Oct are built on `stream-a/followup`, in one pull request with one commit per step:
1. ordinary delete in the locker;
2. one file per evidence-camera video, cut-off safe, with interrupted files sealed at the next start (evidence bundle format 0.2);
3. body-cam mode (B1–B4);
4. low-battery warnings and the 3% auto-save.

None of it has run on a phone yet.
- Shell: merged to `main` (https://github.com/AayushTainwala/Saakshi/pull/1). **Streams B, C and D can start.**
- Evidence: merged (https://github.com/AayushTainwala/Saakshi/pull/2).
- Follow-up: `stream-a/followup`; see the pull request for its checks.

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

**Cut-off-safe video: what it costs (researched 21 Oct, before building).** The question: does a video cut off by a forced power-off or crash stay playable, with our camera library, and what would it take?

- **iPhone: no cost.** expo-camera records with `AVCaptureMovieFileOutput` to a `.mov` (`node_modules/expo-camera/ios/Current/CameraSessionManager.swift`, `CameraVideoRecording.swift`) and leaves `movieFragmentInterval` at Apple's default. Apple's documentation for [`movieFragmentInterval`](https://developer.apple.com/documentation/avfoundation/avcapturemoviefileoutput/moviefragmentinterval): "The default is 10 seconds", and with fragments "if the file is not written completely, the movie file is still usable (up to the point where the last fragment was written)". So a cut-off file loses at most about the last 10 seconds. A recording cut off in its first 10 seconds has no fragment and is not playable. Shortening the interval would mean patching expo-camera, which I have not done.
- **Android: expo-camera can't do it.** It pins CameraX 1.6.0 (`node_modules/expo-camera/android/build.gradle`) and records through `Recorder` with `FileOutputOptions` to `.mp4`. MP4's index (`moov`) is written only when recording stops, so a cut-off file has none and does not play. CameraX's [`Recorder.Builder`](https://developer.android.com/reference/androidx/camera/video/Recorder.Builder) has no container option in 1.6; `setVideoMimeType`/`setAudioMimeType` only arrive in 1.7.0-alpha03, and even then pick WebM or MP4, not a fragmented or streaming format. [`MediaMuxer.OutputFormat`](https://developer.android.com/reference/android/media/MediaMuxer.OutputFormat) offers MPEG-4, WebM, 3GPP, HEIF and Ogg: no fragmented MP4. [`MediaRecorder.OutputFormat.MPEG_2_TS`](https://developer.android.com/reference/android/media/MediaRecorder.OutputFormat) (Android 8+, H.264 and AAC) is a transport stream, which needs nothing written at the end.
- **The format check** (`modules/saakshi-evidence/verify/cutoff-formats.sh`, files made by ffmpeg, not by phones): 30-second 720p clips truncated at 60% of their bytes. MPEG-TS: 541 of 900 frames still decode (right up to the cut). QuickTime with 10-second fragments: 543. Plain MP4: none ("moov atom not found").
- **What I built, and why the cost was reasonable:** body-cam mode needs its own Android recorder anyway, because expo-camera's camera is tied to the screen and stops when it goes off, and body-cam must keep recording through a foreground service. So the extra cost of cut-off safety on Android is small: one recorder (`CameraRecorder.kt`: Camera2 into `MediaRecorder` through a persistent input surface, MPEG-TS) and a preview view, used by the evidence camera's video mode and by body-cam mode. Photos on Android still use expo-camera.
- **Limits:**
  - Android 7 (API 24–25) has no MPEG-TS in MediaRecorder. There, and on any phone whose MediaRecorder refuses MPEG-TS, the recorder falls back to MP4, which is **not** cut-off safe.
  - `MediaRecorder` with MPEG-TS from a camera surface is documented but little used. One old report (Galaxy Note 2) of an unplayable TS file is in my search results. It needs testing on several current Android phones, including Samsung.
  - `.ts` plays in VLC, Android's players and ffmpeg. macOS QuickTime Player does not open `.ts`; an expert on a Mac would use VLC.
  - Data still in memory when the phone goes off (typically under a second) is lost; a dead battery normally shuts the phone down cleanly, and step 4's auto-save at 3% avoids that case.
- **Interrupted files** (both platforms): a marker in the session's `pending/` folder is written when recording starts and removed once the file is in the locker. When the app opens (Record tab), any marker left behind is sealed: hashed as it is, chained after the session's last file, with `interrupted: true` and `endReason: "interrupted"` in the record (spec 0.2, section 3). On iPhone the marker can't name the file in advance (expo-camera reports the path only when it stops), so recovery takes the first `.mov` in expo-camera's cache folder created after the recording started. iOS may empty that cache folder when storage is very low, which would lose the file.

**Body-cam mode (B1–B4): how it works and every platform limit found (21 Oct).** Record tab → "Body-cam mode". The first time, the user must acknowledge how to unlock before Start is enabled. Pieces are 60 seconds (`BODYCAM_PIECE_SECONDS`), 720p by default with 1080p as an option, and are sealed through `createEvidenceSession()`. Nothing is uploaded in R1.

- **Reading the volume buttons:**
  - *Android, screen on:* key events reach the app's window while it is on screen. `VolumeKeys.kt` wraps the window's callback while the lock is showing, takes volume-down presses, and swallows both volume keys so the volume doesn't change.
  - *Android, screen off:* apps get no key events. Volume keys go to the system, or to an active media session that takes remote volume handling ([`MediaSession.setPlaybackToRemote`](https://developer.android.com/reference/android/media/session/MediaSession): "This must be called to receive volume button events"). That would mean presenting a fake playing media session, so it isn't used. Unlocking needs the dark screen (which is on, at minimum brightness). If the user turns the screen off, recording carries on and they unlock the phone as usual.
  - *iPhone, iOS 17.2+:* [`AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction): "The system sends capture events only to apps that actively use the camera. Backgrounded capture apps … don't receive events." Volume down is a "primary" event (WWDC 2025 session 253), and so are the **Action button and Camera Control**: pressing either twice also unlocks.
  - *iPhone, iOS 16.4–17.1:* no public API reads the buttons. The fallback watches the system output volume and counts each decrease as a press, so it **does not work when the volume is already at zero**, and the presses do change the volume.
- **Dark screen:** Android dims only Saakshi's window (no `WRITE_SETTINGS` permission; I removed expo-brightness, whose plugin would add it). iPhone sets the system brightness and restores the previous level on unlock; iOS also restores it when the phone locks. The screen stays on (keep-awake) so that it can be unlocked, which costs battery.
- **Android foreground service** (`BodyCamService.kt`, types camera and microphone, partial wake lock):
  - It can only be started while the app is on screen ([while-in-use rule](https://developer.android.com/develop/background-work/services/fgs/service-types)), which it always is when the user taps Start.
  - Android 13+ shows its notification only if the user has allowed notifications. The app doesn't ask, to keep permissions minimal; the system still lists the running service.
  - Some makers' battery managers (Xiaomi, Oppo, Vivo and others) may stop background services. Test.
  - During a phone call Android may give the microphone to the call and silence other apps' recording; video continues. Not yet tested.
  - Google Play requires a declaration for camera and microphone foreground services (Stream D).
- **iPhone:**
  - Apple allows video only while the app is on screen, as the spec says. Video pieces stop with `endReason: "app-left"` when the app leaves the screen, and a new clip starts on return; `gapBeforeMs` in the first piece's record gives the gap.
  - The screen warns about this before Start, and again whenever it is unlocked. iOS gives no notice before the user leaves an app, so a warning at the moment of leaving isn't possible.
  - Sound is recorded separately (expo-audio, background recording, `.m4a` pieces). Each piece starts before the last stops, so there is no silence, and records show a small negative `gapBeforeMs` for the overlap.
  - A phone call interrupts sound recording. That piece ends `audio-interrupted`, and a new piece starts at the next minute if iOS allows it, which needs testing.
  - Video and sound are separate files in the same session, matched by their times.
  - There is no way to open the Low Power Mode setting directly, so the app explains where it is. On Android the button opens Battery Saver settings.
- **Gaps between pieces:**
  - Android: about the time to stop one `MediaRecorder` and start the next.
  - iPhone video: the time between one `recordAsync` ending and the next starting.
  - Both are recorded in `gapBeforeMs` and are untested on phones.
- **For Stream C:** the chest-mount guide (G4) should teach the unlock (volume down, twice). The lock message deliberately doesn't name the buttons.
- **For Stream D:** the generated Android manifest also carries template permissions no feature uses (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`); consider `android.blockedPermissions` in `app.json`. `POST_NOTIFICATIONS` and `FOREGROUND_SERVICE_MICROPHONE` come from expo-audio's background recording, which bug mode (E8) also needs.

**Low-battery auto-save (SPEC E1, decided 21 Oct).** While the evidence camera or body-cam mode is recording, the app warns at 10% and 5% (a line on the camera screen, and on body-cam's dark screen, which stays dark) and at 3% stops and saves the recording itself (`endReason: "low-battery"` in the record). Logic: `src/modules/evidence/battery/monitor.ts`, tested.
- **Judgement call for the owner:** nothing happens while the phone is charging, since the battery isn't running down. Say if you want the 3% stop even when plugged in.
- expo-battery's level listener fires on Android only around the system's "battery low" point, so the app also reads the level every 30 seconds while recording.
- Older iPhones and iOS versions may report the level only in 5% steps. Then the 3% stop comes at the first reading of 0–3%, which could be too late. Check on a phone.
- Bug mode (E8, Stream B) can use the same hook (`useLowBattery`) if the owner wants it there too; the decision named only the evidence camera and body-cam mode.

**NEEDS OWNER REVIEW:**
- **Certificate Part A text** (`src/modules/evidence/certificate/html.ts`): check every line against the Gazette of India text of the Schedule. It follows law.md section 1B, which was read from the Gazette of Puducherry reproduction, and item 3 was joined from fragments. The PDF prints "DRAFT: the text of this form has not yet been checked against the Gazette of India" until `FORM_TEXT_REVIEWED` is set to `true`.
- **Rights prompts** (`src/i18n/locales/{en,hi}/record.json` under `rights`, sources in `src/modules/evidence/rights/prompts.ts`): wording in English and Hindi. Sources: Art. 22(1); BNSS ss.36(a), 38, 47(1)–(2), 48; *Mihir Rajesh Shah* para 56; BNS ss.221, 262. All are rows marked VERIFIED (IK) in law.md, none checked against the Gazette yet.
- **Certificate screen help text** (`certificate.*` in `record.json`), in both languages.

**Follow-up: not verified.** Everything in the follow-up needs testing on real phones. Most important:
- an Android recording cut off by force-stopping the app or holding the power button, then reopened: is the `.ts` playable, and is it sealed as interrupted?
- the same on iPhone, with a recording longer than 10 seconds;
- body-cam with the screen off on Android, through a phone call;
- body-cam on iPhone leaving and returning to the app;
- volume-down unlock on each platform, including iOS 16 and 17.0–17.1;
- the 10%, 5% and 3% battery points.

Kotlin and Swift compile only on GitHub's runners (Native build workflow).

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

**Status:** may start now on the non-code work (see Order, step 2).

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

**Status:** may start now on the pipeline and store text (see Order, step 2).

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

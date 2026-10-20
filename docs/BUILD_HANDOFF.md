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
- [x] (Stream B) **Supabase region for live location (S3).** *Answered 20 Oct:* Mumbai (`ap-south-1`). Project `saakshi-live` created there.
- [ ] (Stream B) **Supabase plan for live location.** `saakshi-live` is in the "AT's Desk" organisation. Supabase pauses inactive projects on its free plan, which would break live links without warning. Keep it on the free plan (and check the pause rules), or move it to a paid plan?
- [ ] (Stream B, for Stream D) **Apple Team ID.** The widget extension needs `ios.appleTeamId` in `app.json` (Apple Developer → Membership). Without it, signed iOS builds may fail.
- [ ] (Stream B) **Phone backups.** Android backs up an app's files to the user's Google account unless the app turns this off (`android.allowBackup`), and iCloud backs up the documents directory. That would copy trusted contacts (and evidence) off the phone. Turn Android backup off for the whole app, keep it, or exclude only some files? This touches Stream A's evidence too.
- [ ] (Stream B, for Stream D) **Extra Android permissions.** `npx expo config --type introspect` shows the Expo defaults `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the manifest. No feature needs them; consider blocking them in `app.json` (`android.blockedPermissions`) so the Play listing and App Review notes stay short.
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

**Status:**
- **R1 (S1, S2):** merged (https://github.com/AayushTainwala/Saakshi/pull/6). Not yet run on a phone.
- **R2 (S3, S4, E8, confiscation mode):** built and tested in code on `claude/stream-b-r2-efgu96`, pull request open. It includes Stream A's https://github.com/AayushTainwala/Saakshi/pull/4 (merged in, because bug mode reuses its sound-piece pipeline), so **merge #4 first**; the R2 diff then shrinks to Stream B's own changes. Not yet run on a phone.

**Done, R1** (details in #6): trusted contacts kept only on the phone (picker with no contacts permission, or typed in); SOS text with map link, accuracy and times, by the Messages composer, or in the Android APK by itself after a 3-second countdown (`SAAKSHI_SMS_AUTOSEND=1` at prebuild declares SEND_SMS; every other build removes it); 112 always at the top; `getTrustedContacts()` for Stream A.

**Done, R2:**
- **S3, live location by link.**
  - **Server:** Supabase project `saakshi-live` (ref `ppmaxuksrdjhnlnfcfgt`, Mumbai `ap-south-1`, as the owner chose), in the owner's organisation. Schema in `supabase/migrations/` (applied):
    - `live.shares` (random 144-bit view token, SHA-256 of a secret only the phone knows, expiry of at most 24 h) and `live.positions` (latest 300 per share). Row-level security on, no policies, and the `live` schema is closed to the API, so the tables can't be read or written directly.
    - Four functions are the whole API: `live_start`, `live_push`, `live_stop` (deletes the share and every position) and `live_view` (null once ended).
    - A cron job deletes expired shares every 5 minutes, and another keeps the cron log to a day.
    - Checked as the `anon` role: start, push, a wrong secret refused, view, stop, nothing left afterwards, future times clamped, trimming to 300, and no direct table or helper-function access. The Supabase security advisor flags the four functions as `SECURITY DEFINER` callable by anyone: that is the design.
  - **Viewer:** `web/live/index.html`, a plain page in English and Hindi with no libraries. It reads the token after `#` (never sent to the page's host), shows the last position with its age and accuracy, links to Google Maps and OpenStreetMap, an OpenStreetMap map, the earlier positions, when sharing ends, a warning when no position has come for 5 minutes, and "call 112" (Saakshi is not an emergency service). It refreshes every 15 s.
  - **App:** `@/modules/location` `liveShare`. Positions come from a background task (Android: a location foreground service; iPhone: the blue indicator). Both need only "while using" permission, so there is no `ACCESS_BACKGROUND_LOCATION`. Positions taken without signal wait on the phone (up to 120) and go when it returns; a stop made offline is repeated when the app opens. On the SOS tab: share for 1, 4, 8 or 24 hours, the link texted to contacts, last sent time, send again, stop.
- **S4, code pad and triggers.**
  - New module `@/modules/trigger`. The code pad (`/codepad`, full screen) sends on the third correct digit with no Send button and no countdown; a wrong code clears it silently; 112 is on the pad.
  - Codes 100, 101, 102, 104, 108, 112, 181, 000, 911 and 999 are refused.
  - Settings at SOS → Quick trigger: set the code, and choose what it does (SOS alert, or confiscation mode).
  - **Android:** a home-screen widget and an optional ongoing notification ("Open code pad"), both opening `saakshi://codepad`. The notification comes back after a restart and in the current language when the app opens.
  - **iPhone:** a widget extension (`targets/widget`, built by `@bacons/apple-targets`, MIT) with a Control Center, Lock Screen and Action Button control and a Lock Screen widget. An App Intent, "Open Saakshi code pad", is built into the app too, so it also appears in Shortcuts for Back Tap. It hands the request to the app through `modules/saakshi-sos` (`onOpenCodePad`, `consumeCodePadRequest`).
- **E8, bug mode.** New module `@/modules/bugmode`; SOS → Bug mode.
  - Pieces are 2 minutes long, recorded until stopped or the battery runs out, with the screen locked. Each is sealed through Stream A's pipeline with `capture.mode: "bug"` (spec 0.2).
  - **Android:** the app's own recorder in a microphone foreground service (`BugModeService`). It writes cut-off-safe AAC (`.aac`, ADTS), so a piece cut off by a dead battery plays up to the cut. It uses Stream A's crash-recovery markers, so a piece the app didn't seal (killed, phone off) is sealed when the app next opens.
  - **iPhone:** Stream A's `AudioPieces` (expo-audio background recording, two overlapping recorders, no silence between pieces), now taking a capture mode. There is also a Live Activity (Lock Screen and Dynamic Island) with a timer and the number of pieces saved.
  - **Witness texts:** after each sealed piece, its chain head is texted to trusted contacts where the phone can send with no tap (the APK with SEND_SMS allowed). At most 20 texts are sent in 30 minutes, leaving room for an SOS under Android's 30-text limit. A skipped piece is still covered by the next chain head.
  - **E7 hook:** `setPieceUploader()` from `@/modules/bugmode`. Each sealed piece is handed to it as soon as it is saved; until Stream A sets it, pieces stay on the phone.
- **Confiscation mode** (SOS tab): one button, then Start in the confirmation (2 taps). It starts bug mode and live location (8 hours), then sends the SOS alert at once with the live link in it.
  - Each part starts even if another fails.
  - The alert waits at most 8 s for the link; a link that comes later is texted on its own.
  - It shows what is running, and stops live location and bug mode together.
  - Each part can also be started on its own, and the code pad can start confiscation mode.

**For Stream A:**
- `src/modules/evidence` changes in this pull request:
  - `AudioPieces` takes a `mode` (default `body-cam`).
  - The public API gains `startAudioPieces()`, `piecePaths()`, and the `CaptureMode` and `EndReason` types.
- **E7:** call `setPieceUploader()` from `@/modules/bugmode` with the Drive upload. Bug mode then uploads each piece the moment it is sealed.

**For Stream D:**
- `SAAKSHI_SMS_AUTOSEND=1` only in the `apk` profile (R1).
- **GitHub Pages must serve `web/live/`** at `https://aayushtainwala.github.io/Saakshi/live/` (`LIVE_VIEWER_URL` in `src/modules/location/live/config.ts`). Until it does, live links open a 404.
- **iOS:**
  - `ios.appleTeamId` must be set in `app.json`.
  - EAS needs signing for a second target: the widget extension `in.aayushtainwala.saakshi.widgets`.
  - App Review notes should explain the background audio (bug mode), background location (live location), the Live Activity, and the App Intent.
  - Prebuild adds `UIBackgroundModes` `fetch` (from a library plugin); no feature uses it.
- **Play:** declare the foreground-service types `microphone` (bug mode, and body-cam) and `location` (live location) in the Play Console.
- **Privacy texts:** live location is the one feature that sends data to our server. It sends positions, only while the user shares, and deletes them when sharing stops.

**Verified:**
- 236 tests pass (R2 added 48: live-share client and API calls, code rules and the pad, trigger settings, confiscation orchestration, the bug-mode controller and witness budget, texts to contacts, the alert's live link and immediate start). Typecheck and lint pass.
- The Supabase functions, checked as `anon` (above).
- `npx expo prebuild --platform ios` generates the `SaakshiWidgets` target, with the intent in both targets. `npx expo config --type introspect` shows Live Activities, the `audio` and `location` background modes, and the Android location and microphone foreground-service permissions.

**Not verified:**
- Nothing in R2 has run on a phone. Most important to test:
  - Android bug mode with the screen off for over an hour, and a piece cut off by forcing the phone off.
  - iPhone bug mode while locked, and through a phone call.
  - Live location with the screen locked on both phones.
  - The controls, Action Button and Back Tap, and the Android widget and notification.
  - The code pad from a cold start.
- Native code compiles only in the Native build workflow; this container has no Android SDK or Swift.
- **ActivityKit:** pairing the app's Live Activity with the widget's view relies on the attributes type having the same name and fields in both (`modules/saakshi-sos/ios/BugModeActivity.swift` and `targets/widget/BugModeLiveActivity.swift`). This is common practice, not checked on a phone.
- Whether the Hindi `Localizable.strings` in the widget target are picked up.
- The viewer page has not been opened against the live server from a browser, because this container can't reach supabase.co.

**Platform limits (R2):**
- **iPhone, sending:** the code pad and confiscation mode still open Messages for the SOS text; Apple requires the Send tap. Bug mode's witness texts can't be sent at all on iPhone (no one can tap Send with the screen locked).
- **iPhone, triggers and indicators:**
  - From a locked iPhone, opening the app from a control or widget asks for Face ID or the passcode (spec S4 accepts this).
  - Controls need iOS 18; the extension targets iOS 18.0, so phones on iOS 16 or 17 get no widget, control or Live Activity, though everything in the app works.
  - The orange microphone dot and the Live Activity are visible to anyone holding the phone (spec E8 accepts this).
  - iOS ends a Live Activity after 8 hours; recording carries on.
- **iPhone, background:** if the app is force-quit, iOS stops both bug mode and live location. A phone call takes the microphone; `AudioPieces` keeps the current piece and retries a piece later.
- **Android, foreground services:**
  - Bug mode and live location must start while Saakshi is on screen (Android 14 forbids starting microphone and location services from the background). The code pad and confiscation mode are on screen, so they can; the widget alone can't start recording.
  - Without notification permission (Android 13+), the recording and sharing notifications show only in the Task Manager.
  - Some makers kill background apps despite foreground services (dontkillmyapp.com). Not tested.
- **Android:** the widget and notification ask the user to unlock before the pad opens. A user can dismiss the quick-alert notification on Android 14+; it comes back when the app opens.
- **Bug mode, gaps and size:**
  - Android pieces have a gap of the time the old recorder takes to stop (expected well under a second), recorded in `capture.gapBeforeMs`.
  - iPhone pieces are `.m4a`, which spec 0.2 already says is not cut-off safe.
  - Android records 64 kbit/s mono, about 29 MB an hour.
- **Live location, server:** the server has no accounts, so anyone with the public key can create shares. Abuse is bounded by the 24-hour limit, 300 positions a share and 20,000 active shares, but there is no per-device rate limit.
- **Live location, Supabase plan:** Supabase pauses inactive free-plan projects. I don't know the current terms for this organisation's plan; see owner questions.
- **Live location, how often:** positions every 30 s or 20 m, whichever comes later per the platform's rules.
- **Supabase MCP:** applying a migration through the MCP timed out whenever a function body held an `INSERT … SELECT` or a `DELETE … NOT IN (SELECT …)`. The same logic was applied as two small helper functions, `live.add_positions` and `live.keep_latest`; the repository migration matches what is applied.

**NEEDS OWNER REVIEW** (none of it is legal content):
- Every new string in `sos.json` (bug mode, live location, trigger, confiscation mode), English and Hindi. The Hindi is a first pass for Stream C; "ज़ब्ती मोड" for confiscation mode needs a check.
- The viewer page text (`web/live/index.html`), in both languages.
- The refused-code list (`src/modules/trigger/code.ts`): 102, 108 and 112 are in Stream C's verified helpline list; 100, 101, 104 and 181 are refused to be safe and are not verified here.

**Owner questions:** see the list at the top (Stream B items).

**Next:**
- Phone testing of R1 and R2; fix what it finds.
- After E7 lands, check the Drive upload through `setPieceUploader()`.
- v1.1: WhatsApp, Signal and Telegram for alerts and live links.

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

  Still owed, because those sites can't be reached from here: the Schedule against the Gazette, the commencement and DPDP notifications, and the D.K. Basu and Arnesh paragraph numbers.
- 126 tests pass (33 new); typecheck and lint pass.

**Not verified:**
- **Official pages:** only NALSA's could be opened (15100 is `page-read`). 112, 108 and 102 still rest on search-engine extracts of official pages (`"how": "search-extract"`). The G5 phone steps and the EFF adaptation rest on search summaries and general knowledge, not on reading Apple's, Google's or EFF's pages: `ssd.eff.org`, `support.apple.com` and `support.google.com` are not reachable from here.
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

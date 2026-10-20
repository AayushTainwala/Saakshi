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
- [ ] (Stream D) **Play signing key.** When you first upload to Google Play, the Console asks who holds the app signing key. Two choices:
  - **(a) Google makes its own key (the default).** The Play copy and the GitHub APK then have different signatures. Android won't install one over the other, so someone switching must uninstall first, which **deletes the recordings kept in the app**.
  - **(b) Upload our EAS keystore as the app signing key.** Both copies share one signature and the user can switch freely.

  I recommend (b). Decide before the first Play upload: it can't easily be changed afterwards. (b) needs the keystore backup (Stream D, step 4) and Google's key-export steps in the Console, which I couldn't read from here.
- [ ] (Stream D) **Public contact email** for the privacy policy, TestFlight feedback, App Review contact and the Play developer page. Until then, the privacy policy points to GitHub issues.
- [ ] (Stream D) **Play target audience.** I suggest 18 and over. Your call.
- [ ] (Stream D) **Mirrors.**
  - Is Codeberg fine as the first mirror (docs/release/mirrors.md)?
  - The Internet Archive's official uploader is AGPL. May CI use it (it never enters the app), or should a later session use plain `curl` instead?
- [x] (Stream B) **Phone backups.** Android backs up an app's files to the user's Google account unless the app turns this off (`android.allowBackup`), and iCloud backs up the documents directory. That would copy trusted contacts (and evidence) off the phone. Turn Android backup off for the whole app, keep it, or exclude only some files? This touches Stream A's evidence too. *Answered 20 Oct:* the user chooses whether anything is backed up and where: local only, or a cloud service of their own (Google Drive, iCloud or another). Nothing ever comes to us. So the app starts local-only, with the phone's automatic backups off for its files, and copies only where the user chooses. SPEC section 2. Work for Streams A and B: see Stream D, "For other streams".
- [x] (Stream B, for Stream D) **Extra Android permissions.** `npx expo config --type introspect` shows the Expo defaults `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the manifest. No feature needs them; consider blocking them in `app.json` (`android.blockedPermissions`) so the Play listing and App Review notes stay short. *Done by Stream D:* `app.config.ts` blocks all three in every Android build.
- [x] (Stream B) **Supabase region for live location (S3).** *Answered 20 Oct:* Mumbai (`ap-south-1`). Project `saakshi-live` created there.
- [x] (Stream B) **Supabase plan for live location.** `saakshi-live` is in the "AT's Desk" organisation. Supabase pauses inactive projects on its free plan, which would break live links without warning. *Answered (owner's review of R2):* free while testing; the plan must be reviewed before R2 goes public. On the release checklist below.
- [x] (Stream B, for Stream D) **Apple Team ID.** The widget extension needs `ios.appleTeamId` in `app.json`. *Answered (owner's review of R2):* `5NYAUT5C56` (not secret); set in `app.json`.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

## Release checklist

Things that must be done or decided before a release goes public. Streams add items as `- [ ] (Stream X, release) item`.

- [ ] (Stream B, R2) **Supabase plan for live location.** `saakshi-live` stays on the free plan while testing (owner's answer). Before R2 goes public, review the plan: free-plan projects can be paused when inactive, which would break every live link without warning.
- [ ] (Stream B, R2, for Stream D) **Privacy texts for live location.** Update the privacy policy, the Apple privacy label and Play's Data safety answers before an R2 build is published (facts in Stream B, "For Stream D").

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
  - Android 13+ shows its notification only if the user has allowed notifications. Per the owner's decision of 22 Oct, the app asks for that permission the first time body-cam starts. The notice has a Stop button, which ends the session as the in-app Stop does. If the user refuses, recording carries on, and the screen says the notice is under Active apps at the bottom of the notification shade. Per Android's [notification permission guide](https://developer.android.com/guide/topics/ui/notifiers/notification-permission), foreground-service notices then appear in the Task Manager but not the drawer. Stopping Saakshi from Active apps ends the whole app ([Android 13 Task Manager](https://developer.android.com/about/versions/13/changes/fgs-manager)); the piece being recorded is then sealed as interrupted at the next start.
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
- **Permissions:** `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` and `VIBRATE` come from Expo's template and no feature uses them. All four are now blocked in every Android build through `ALWAYS_BLOCKED` in `app.config.ts`; Stream D had already blocked the first three, and I added `VIBRATE`, which nothing in the app uses and no library declares. `POST_NOTIFICATIONS` stays, for body-cam's notice.

**Android videos: the original and its MP4 copy (owner decision of 22 Oct).** The `.ts` from the camera stays the original: the chain, the export bundle and the certificate use only it.
- Play and Share on a video in the session screen offer an MP4 copy instead. The copy is made once, without re-encoding (Android `MediaExtractor` into `MediaMuxer`, `Remuxer.kt`), and stored in `copies/`. It is labelled in the app as a copy, not the original, and has its own signed record naming the original's record and file SHA-256 and the method (spec section 11). Sharing asks whether to send the copy or the original.
- MPEG-TS has no field for rotation, so a `.ts` recorded upright may play on its side. The recorder's rotation is now in each record (`capture.rotationDegrees`) and is written into the MP4 copy.
- Not tested on a phone: the remux itself, whether MediaExtractor reads our MediaRecorder `.ts` files, and how the copy plays.
- iPhone videos are `.mov` and need no copy; Play opens Quick Look and Share sends the original.

**Low-battery auto-save (SPEC E1, decided 21 Oct).** While the evidence camera or body-cam mode is recording, the app warns at 10% and 5% (a line on the camera screen, and on body-cam's dark screen, which stays dark) and at 3% stops and saves the recording itself (`endReason: "low-battery"` in the record). Logic: `src/modules/evidence/battery/monitor.ts`, tested.
- Nothing happens while the phone is charging, since the battery isn't running down (owner confirmed 22 Oct).
- expo-battery's level listener fires on Android only around the system's "battery low" point, so the app also reads the level every 30 seconds while recording.
- Older iPhones and iOS versions may report the level only in 5% steps. Then the 3% stop comes at the first reading of 0–3%, which could be too late. Check on a phone.
- **Bug mode (E8) has no 3% save** (owner, 22 Oct): its pieces are already short. Stream B: don't use `useLowBattery` there.

**NEEDS OWNER REVIEW:**
- **Certificate Part A text** (`src/modules/evidence/certificate/html.ts`): checked against the Gazette of India on 21.10.2026 (law.md section 1B). The wording matched, item 3 included; the layout now follows the Gazette too (unnumbered paragraphs, "Make & Model", "Son/daughter/spouse", em dashes). The owner's sign-off is what remains: until `FORM_TEXT_REVIEWED` is `true`, the PDF prints "DRAFT: the text of this form has not yet had its final legal review".
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
- **R2 (S3, S4, E8, confiscation mode):** built and tested in code on `claude/stream-b-r2-efgu96`: https://github.com/AayushTainwala/Saakshi/pull/8. Stream A's #4 is now in `main` and merged into the branch. The owner's review of #8 is addressed (witness texts every 10 minutes at most, Apple Team ID, iCloud backup exclusion, Supabase plan on the release checklist). Not yet run on a phone.

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
  - **Witness texts:** after a sealed piece, its chain head is texted to trusted contacts where the phone can send with no tap (the APK with SEND_SMS allowed).
    - At most one witness message every 10 minutes (SPEC E8, owner's review), so bug mode can't use up the SMS the user may need for an SOS. With 2-minute pieces that is every fifth piece; a skipped piece is still covered by the next chain head.
    - Also at most 20 texts in any 30 minutes, under Android's 30-text limit. With more than 6 contacts this cap is the tighter one.
    - Many Indian prepaid plans cap SMS at about 100 a day. With 10 contacts, bug mode can still send up to 40 texts an hour, so a long recording could reach a daily cap. A daily budget would need the owner's decision.
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
- **SMS flag:** `app.config.ts` and `modules/saakshi-sos/app.plugin.js` agree. Both use `SAAKSHI_SMS_AUTOSEND=1` and remove SEND_SMS otherwise. The app decides at run time from the built manifest, which comes to the same thing as `extra.smsAutoSend`.
- **Pages:** I changed `.github/workflows/pages.yml` so it also publishes `web/live/` at `https://aayushtainwala.github.io/Saakshi/live/` (`LIVE_VIEWER_URL` in `src/modules/location/live/config.ts`). Each deploy replaces the whole site, so it now assembles `store/site/` and `web/live/` together.
- **App Review notes:** I added an optional "R2 features" block to `store/apple/review-notes.md`, covering live location's server, background audio and location, the controls, and why the Location Always string exists though it is never requested. All blocks stay under 4000 bytes (checked by the store tests).
- **Privacy label, Play Data safety and privacy policy for an R2 build.** The policy says it will be updated before live location ships. The facts:
  - Positions (precise location) go to our Supabase server (Mumbai) only while the user shares, for App Functionality, and are deleted when sharing stops or after at most 24 hours.
  - There is no account and nothing that identifies the user: the share is a random id and token.
  - Supabase's request logs probably record the phone's IP address for their own retention period. I have not checked that period.
  - Nothing else goes to us.
- **iOS:**
  - `ios.appleTeamId` is set (`5NYAUT5C56`).
  - EAS needs signing for a second target: the widget extension `in.aayushtainwala.saakshi.widgets`.
  - Prebuild adds `UIBackgroundModes` `fetch` (from a library plugin); no feature uses it.
- **Play:** declare the foreground-service types `microphone` (bug mode, and body-cam) and `location` (live location) in the Play Console.

**Backups (owner's decision of 20 Oct):**
- **Android:** `android.allowBackup` is `false` in `app.json`, for the whole app (Stream A's files too), so Auto Backup copies nothing.
- **iPhone:** new module `@/modules/backup`. `useBackupExclusion()` in the root layout marks the app's Documents folder and everything in it as excluded from iCloud device backup (`isExcludedFromBackup`, native in `modules/saakshi-sos/ios/BackupExclusion.swift`). It runs at launch and each time the app goes to the background. Everything the app keeps (evidence, contacts, settings, live-share state) is under Documents; caches and temporary files are never backed up.
- When the user can choose iCloud as a destination (a later feature), call `setExcludedFromBackup(uri, false)` from `modules/saakshi-sos`.
- **Not verified on a phone:** whether marking the folder alone also covers files created in it later (bug-mode pieces written while locked). Until the next background or launch marks them, they rely on the folder's mark.

**Verified:**
- All tests pass on the merged tree (R2 added 52: live-share client and API calls, code rules and the pad, trigger settings, confiscation orchestration, the bug-mode controller and witness rationing, iCloud backup exclusion, texts to contacts, the alert's live link and immediate start). Typecheck and lint pass.
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
- **Live location, Supabase plan:** Supabase pauses inactive free-plan projects. The project stays on the free plan while testing; reviewing it is on the release checklist.
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
4. **Back up the Android key** (strongly advised, after the first Release run). Losing it means no update can ever install over existing copies, and the published fingerprint changes.
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

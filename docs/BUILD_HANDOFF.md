# Build Handoff

The pickup file for build sessions: where things stand, what is next, and the questions open with the owner. Read [CLAUDE.md](../CLAUDE.md) first. This page is kept short. Reports of finished rounds are in [handoff/](handoff/) and are listed at the end.

## Where things stand (10 Nov 2026)

- **On `main`:** R1 and R2 (#1 to #9), fix round 1 (#16 to #27) and round 2, Part 1 with groups 1.6 and 1.7 (#31 to #36, #41, #43), and repair round A, groups 1 and 2 (#45, #46). Typecheck, lint, 678 tests and both native builds pass.
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
| 2 | **Repair round A: evidence that survives** | The bookkeeping file (`session.json`) written safely and rebuilt from the signed records if unreadable; free storage watched, stage one; one file per signing key, never overwritten. | **Built.** Groups 1 and 2 are merged (#45, #46). Group 3 is in a pull request (#47), the last of the round; it has no native code of its own. Reports below. Brief: [briefs/2026-11-10-repair-round-a.md](briefs/2026-11-10-repair-round-a.md). |
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

- [ ] (Repair A) **Signed records are still written the old way.** Group 1 made the files that are *rewritten* safe (session.json, the markers, the key file). A signed record and its signature are written once and never again, through the file library's plain write, and are not flushed to storage. A cut-off at that moment can leave the newest record half-written; the app now ignores a record that has no signature beside it, so nothing breaks, but that last checkpoint is lost. Writing them through the same one-step write is small (the native function needs a second form that takes bytes, for the signature). **I recommend doing it in this round,** in group 3's pull request. Shall I?
- [ ] (Repair A) **A file with no signed record.** When an index is rebuilt, a file found in the recording's folder with no signed record (the app died after saving it and before signing) is listed, marked "No signed record was found for this file", and can be shared as it is. It is not signed afterwards. Signing it later would need a decision on what such a late record says (its start time is not known; only the file's last write is). **I recommend leaving it as built** until you decide that. Right?
- [ ] (Repair A) **A recording whose index is damaged** (unreadable, and no signed record to rebuild from) shows each recorded file with a "Share this file" button. That is what "its files reachable for export" became, since an evidence bundle needs signed records. Is one-file-at-a-time sharing enough, or do you want one ZIP of the whole folder as it is? **I recommend leaving it:** it should be very rare.
- [ ] (Repair A) **Witness messages now go in the append-only file too,** not into session.json. The brief said the whole file is rewritten when "something other than a checkpoint changes"; I put witness messages beside the checkpoints because that is the only way they survive a rebuild, and it stops a recording in progress from writing over them. Confirm, or say to move them back.
- [ ] (Repair A) **Wording, `NEEDS OWNER REVIEW`:** the rebuilt notice, the damaged screen and the "no signed record" line, in English and Hindi (listed in the report below). In Hindi "index" is "सूची".
- [ ] (Repair A) **Where body-cam's sound-only recording stops, and where Pocket recording stops.** The brief and the SPEC say that at the keep-free amount body-cam drops to sound only "so a recording that would have stopped carries on for hours", and "then" stops. Built so: body-cam's sound carries on **below** the keep-free amount, down to the 300 MB floor, and stops there; with the setting off, body-cam stops at the keep-free amount. **Pocket recording stops at the keep-free amount.** So a body-cam recording that has become sound outlasts a Pocket recording started at the same moment. Sound takes about 30 to 60 MB an hour, so it eats little of the room kept free. Is this what you meant, or should Pocket recording also go on to the floor, or body-cam's sound stop sooner? **I recommend keeping it as built.**
- [ ] (Repair A) **The iPhone evidence camera's rate is not known.** It records through the phone's own movie recorder at 720p, at a rate Saakshi does not set. For "Room for about …" and its warnings I assumed 12 Mbit/s, on the high side so that the app promises less time rather than more. Two ways to make it real: tell me the size and length of a video you recorded with the evidence camera on your iPhone, and I will put the measured rate in; or let me set the rate (3 Mbit/s, as body-cam's), which changes the evidence camera's files and so needs your word. **I recommend the measurement first.**
- [ ] (Repair A) **Photos at the floor.** The brief speaks of the evidence camera's video. I also made the camera refuse a photo when the phone is at or below the 300 MB floor, saying why, because the floor is "never recorded into" and a photo's record must be writable too. Keep, or let photos through?
- [ ] (Repair A) **Android reads a slightly generous figure.** The file library's call gives every unallocated byte on Android (`File.getFreeSpace`), including any the system keeps back from apps; `getUsableSpace` is the exact one. The floor's margin covers the difference as far as I can tell, but I can't measure it without a phone. A three-line native read would make it exact. **I recommend adding it in repair round B's native work,** not here, since the brief asked for the file library's call.
- [ ] (Repair A) **The hash report's words for "low-battery" are out of date.** `src/modules/evidence/export/contents.ts` still says "stopped and saved by the app at 3% battery". Since format 0.9 that reason means the file was closed at 5% and a new one carried on. The hash report goes with the certificate, so I did not reword it without you. Shall I, as: "closed by the app at 5% battery; recording carried on in the next file"?
- [ ] (Repair A) **Wording, `NEEDS OWNER REVIEW`:** everything in the new `storage.json` (English and Hindi), `ended.storageSoundOnly` and `ended.storageFull` in `record.json`, and `storage.*` in `settings.json`.
- [ ] (Repair A) **A key that is still there but can't be used.** Group 3 notices a key that is *gone*: the phone's security chip holds no key (the app's files on a new phone, say), so a new one is made. It does not handle a key the chip still lists but can no longer use (a damaged key store). There, signing fails as it does today: recording carries on, the file is saved and fingerprinted, and its record is not signed until signing works again. Telling "can't be used for good" from "can't be used this minute" needs native code and a phone to try it on, and making a new key on a wrong guess would throw a good key away for nothing. **I recommend leaving it for now** and deciding after the phone tests show whether it ever happens. One thing to know: on iPhone, a key the Secure Enclave can no longer restore stops the app from making a new one at all, as the code stands (`DeviceKey.swift`, `create` loads the old key first). I have not seen it happen; I read it in the code.
- [ ] (Repair A) **A recording whose key has no file.** If a recording was signed by a key whose file is not on the phone (only possible for recordings whose key was written over before this repair), the app now refuses to make a bundle and says why, rather than make one that can't be checked. Its files can still be shared one by one. Is refusing right, or do you want a bundle that says plainly "the key that signed this is missing"? **I recommend refusing,** since a bundle exists to be checked.
- [ ] (Repair A) **README wording, `NEEDS OWNER REVIEW`:** the paragraph a bundle's README gains, in English and Hindi, when a recording was signed by more than one key (`src/modules/evidence/export/readme.ts`), and the hash report's "Signing keys" lines (`export/contents.ts`).

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

### Group 1: the bookkeeping file can't be lost (branch `repair-a/1-session-file`)

**State:** merged on 10 Nov (#45). Typecheck, lint and 628 tests passed, and both native builds. It changes native code (Kotlin, Java, Swift). No change to what a signed record or a bundle holds: the bundle format stays 0.9.

**The reading of the file library, confirmed.** In the installed `expo-file-system` 58.0.10:
- iPhone writes text with `content.write(to: url, atomically: false, …)` (`ios/FileSystemFile.swift`, line 117), and bytes with `data.write(to: url)`, which is not all-or-nothing either.
- Android writes through `file.outputStream(append)` (`android/…/FileSystemFile.kt`, line 101), which is `FileOutputStream(this, append)` (`unifiedfile/JavaFile.kt`, line 74): it empties the file when it opens it.
- **Moving a file over another is not one step either,** on either phone: iPhone removes the target and then moves (`ios/FileSystemPath.swift`, lines 86 to 90); Android deletes the target while preparing the move and then renames (`fsops/CopyMoveStrategy.kt`). `rename()` refuses if the target exists. So the file library alone can't replace a file in one step, and the brief's native function was needed.

**What was built.**
1. **Write beside, then swap.** A native function `writeTextAtomic(uri, text)` in `modules/saakshi-evidence`: the text goes into `<name>.tmp` beside the file, is flushed to storage, and is renamed over the file with `rename(2)`, which replaces in one step (Android: `AtomicFile.java`, `File.renameTo` after `FileDescriptor.sync`; iPhone: `AtomicFile.swift`, `rename` after `F_FULLFSYNC`). If anything fails before the rename, the old file is untouched. `session.json`, the JavaScript-written `pending/` markers and `device-key.json` all go through it (`src/modules/evidence/locker/files.ts`, `replaceText`).
2. **Android's own markers.** The Android recorders wrote their markers with a plain overwrite (`CameraRecorder.kt`, `BugRecorder.kt`); they now write beside and rename too. The iPhone recorders already wrote theirs with `.atomic`.
3. **Leftovers.** A `.tmp` file from an interrupted write is never read, and is removed when the app next opens (`repair`, run before cut-off recordings are sealed).
4. **One line per checkpoint.** A checkpoint adds one line to `session.log` beside `session.json`, which is only ever added to. `session.json` is rewritten only when a file closes or something else changes, and no longer holds what the log holds, so it stays small however long the recording. Reading a session joins the two. A line that can't be read is ignored; each line starts on a new line, so a line cut short does not spoil the next one. Sessions saved before this, with their checkpoints inside `session.json`, read as before and keep them.
5. **Rebuild when unreadable** (`locker/rebuild.ts`). If `session.json` is missing, empty, cut short or not this session's, the index is made again from the session's folder and saved, marked `rebuilt` with the time. It reads every record in `records/` that has its signature beside it, the files in `media/`, the certificate PDF and the log.
6. **Catching up.** When the app opens, any signed record in the folder that the index doesn't list is added to it. This closes a hole that existed before: if the app died between signing a checkpoint and noting it, the cut-off file's record was given the same number at the next open and **overwrote that checkpoint**. Now the cut-off file is chained after it.
7. **Damaged, but listed.** With no readable signed record, the session is listed as "This recording's index is damaged", and its screen shows each recorded file in `media/` and `incoming/` with a share button and the delete button. This state is never saved: the locker tries again each time it reads the session. Recovery never writes into such a session.
8. **On screen.** The record's screen says "This recording's index was rebuilt", when, that the recordings and signed records were not changed, and what could not be brought back.

**What a rebuild cannot bring back,** and what the app shows instead:

| Lost | Why | In its place |
|---|---|---|
| Each file's CRC-32 (used only to write the ZIP) | It is not in the signed record | Worked out again from the file the next time the record is exported; the file is first checked against its signed SHA-256, and the export stops if it differs |
| Witness messages sent before this update | They were only in `session.json` | "Witness message sent: Not yet". Messages sent after this update are in the log and come back |
| The last "Check files" result | Only in `session.json` | "Not yet", and the notice says to tap "Check files" |
| The note of copies made for sharing (Android's MP4 copy, the joined copy) | Only in `session.json` | The copy is made again the next time it is shared or played |
| When the certificate was made | Only in `session.json` | The PDF's last-write time |
| When the session was created | Only in `session.json` | The first file's start time, which is what the list already shows |
| Why a file failed to seal, and that a file differed from what the recorder wrote | Only in `session.json` | A file with no signed record is listed as "No signed record was found for this file", with its times taken from its last write, and can be shared as it is |

Everything a signed record holds comes back exactly: the file's name, kind, size, fingerprints, times, mode, why it ended, whether it was cut off, and its place in the chain.

**What was found.**
- The record-number hole in point 6.
- A recording in progress keeps its own copy of the index and writes that. Anything else written to `session.json` meanwhile (a check result, a copy made for sharing) is lost at the recording's next save. Witness messages are now safe from this, being in the log; the others are not, and I did not change that.
- A signed record and its signature are written once with the plain write and not flushed (first owner question above).
- If a file fails to seal and a later file in the same session seals, the later record's number is one too high and `tools/verify-bundle.mjs` fails the bundle ("a record is missing or out of order"). This is older than this round and outside it; I have suggested it as a separate task.
- The in-app SHA-256 is asynchronous, and a rebuild has to finish before the session is read, so `integrity/sha256Sync.ts` is a small SHA-256 in JavaScript used only for the index. It is tested against Node's at every length around the block edges.

**Tests** (`__tests__/sessionIndex.test.ts`, `sha256Sync.test.ts`, and additions to the two screen tests): a write interrupted before the swap leaves the old file readable, for `session.json`, a marker and the key file; a missing, an empty, a truncated, a garbage and a wrong-session `session.json` are each rebuilt; a rebuilt session passes the on-phone check, exports, and its bundle passes `tools/verify-bundle.mjs` with the same files as before; a session with nothing to rebuild from is listed as damaged and left untouched; a half-written checkpoint line is ignored, and so is one in the middle; a recording in progress when the index is lost carries on and is sealed; a cut-off file is chained after a checkpoint signed just before the cut; a cut-off recording whose index was lost too is rebuilt and sealed. `modules/saakshi-evidence/verify/atomic-write.sh` kills a JVM that is rewriting a file 200 times and checks the file is whole each time (it runs in the native-build workflow). As a control, the same harness against a plain overwrite left a broken file in 12 of 40 kills.

**Not verified** (only a phone, or the native builds, can show):
- That the Kotlin and Swift compile: the native builds on the pull request show it.
- `writeTextAtomic` on a phone at all, and how long it takes there. `F_FULLFSYNC` on iPhone can take tens of milliseconds; it now happens once per file opened or closed, not every 10 seconds.
- A real power cut. The kill test shows the swap survives the process dying, on a JVM, for the Android code only. Nothing has tested the Swift code, and nothing can test a power cut but a phone forced off.
- The file library's append (`writeSync` with `append: true`) on either phone.
- How long a rebuild takes for a long recording. It reads every record (about 360 for an hour) on the app's main thread, once.
- On iPhone, the replaced file is a new file: I have not checked on a phone that it keeps the "not backed up" mark, which is set on the folder and on each file there at the time (`BackupExclusion.swift`).
- The owner's test: start body-cam, hold the power button until the phone goes off, switch on, and find the recording listed, playable to the cut and marked interrupted.

**`NEEDS OWNER REVIEW` (wording, English and Hindi, `record.json`):** `rebuilt.title`, `rebuilt.body`, `rebuilt.lost`; `damaged.title`, `damaged.body`, `damaged.none`, `damaged.files`, `damaged.fileWritten`, `damaged.share`; `locker.itemNoRecord`.

### Group 2: free storage, stage one (branch `repair-a/2-free-storage`)

**State:** merged on 10 Nov (#46). Typecheck, lint and 678 tests passed with group 1 in, and both native builds. It changes native code (Kotlin, Java, Swift). The bundle format goes from 0.9 to **0.10**.

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

### Group 3: one file per signing key (branch `repair-a/3-signing-keys`)

**State:** in a pull request (#47). Typecheck, lint and 695 tests pass. **No native code of its own.** It uses group 1's safe write and takes the format number after group 2's, so it was built on both. Both are now on `main`, and `main` is merged into this branch, so the pull request shows only this group's changes. Its native code is exactly `main`'s; both native builds passed on this branch before the last merge of `main`, which changed no code. The bundle format goes from 0.10 to **0.11**.

**What was built.**
1. **One file per key, never overwritten:** `evidence/keys/<keyId>.json`. A key's file is written when the key is made, and rewritten only for that same key (its App Attest result arriving), through group 1's safe write. No key's file is ever written over by another's. The old `device-key.json` is moved to `keys/<its keyId>.json` the first time anything asks for a key after the update, and also when the app opens; nothing is deleted, and an old file that can't be read stays where it is.
2. **Each recording is exported with the key that signed it.** A bundle's `device-key.json` is now the file of the key named in that recording's own records, taken from that key's file, not whichever key the phone holds on the day. If a recording's records name more than one key, the bundle carries each: `device-key.json` for the key of the first record, then `device-key 2.json` and so on, in the order the records first use them. The manifest lists them (`keys`), the hash report says which records each key signed, and the README gains a paragraph in English and Hindi. `tools/verify-bundle.mjs` checks each record against the key it names.
3. **A key that is gone is noticed when the app next signs.** Before each record the app asks the security chip which key it holds (it used to ask once and remember). If the chip holds none, a new key is made. If the key is not the one this phone had last, the old key's file stays, the new key's file says which key it `replaces`, and the next record says the same in signed data: a new optional member, `key.replaces`. In one recording's chain, any record whose key differs from the record before it says so too, which is what lets the checking tool tell an honest change of key from a record signed by a stranger. Recording is never refused because a key changed: the test that loses the key in the middle of a recording carries on and seals every file.
4. **Two recordings asking at once** make one key, not two.

**Bundle format 0.11** (`docs/spec/evidence-bundle.md`, sections 1, 4, 6, 7, 10 and 12): `key.replaces` in a record; `replaces` in a key file; the extra key files and the manifest's `keys`. No required member was added or removed. The checking tool fails: a record that names a key not in the bundle; a key file no record names, or under the wrong name; a change of key that the record does not say; a change of key, or `key.replaces`, in a record older than 0.11. Bundles of 0.8, 0.9 and 0.10 still verify (tested).

**What was found.**
- The realistic way a key is lost: the app's files are carried to a new phone (a transfer or a restore) and the key is not, because it never leaves the old phone's chip. Before this group, the first signature on the new phone wrote the new key over the old one and every earlier recording failed its check from then on. The tests cover exactly this.
- The app remembered the key's id for as long as it ran, so a key that changed while the app was open would have been signed with one key and labelled with another. Asking before each record closes that.
- A key that is listed but unusable is not handled (owner question above).
- `replaces` is the phone's own statement, signed by the new key. It does not prove the two keys were on the same phone; the spec says so.

**Tests** (`__tests__/signingKeys.test.ts`): a second key leaves the first key's file untouched, byte for byte; an attestation goes into that key's own file and no other; an old recording exported after a key change carries its own key and verifies; a recording that spans a key change carries both keys and verifies, and fails the check if a key file is removed, swapped or added; a cut-off recording sealed on a new phone verifies; the first open after the update moves the old file and loses nothing, including when the phone no longer holds that key; the first record a new key signs says so, and only that one; a recording with no key file is refused a bundle.

**Not verified** (only a phone can show):
- What each phone's security chip really does when a key is gone: that the app is told "no key" (and so makes a new one) rather than given an error. The tests stand in for the chip.
- That asking the chip before every record (about every 10 seconds while recording) costs nothing noticeable.
- The move of the old `device-key.json` on a phone that has one.
- Carrying the app's files to another phone, which is the case this group is for.

**`NEEDS OWNER REVIEW`:** the README paragraph and the hash report's lines, listed in the owner question above.

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

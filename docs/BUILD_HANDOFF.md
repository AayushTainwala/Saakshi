# Build Handoff

The pickup file for build sessions. Each stream keeps its own section current: status, what was done, what's next, questions for the owner. Read [CLAUDE.md](../CLAUDE.md) first.

## Where things stand (21 Oct 2026; fix round 1 from 5 Nov)

- **Merged into `main`:** #1–#9. That is R1 and R2 as planned, apart from E3 and E7, plus the law checks against the Gazette of India (#9). Since then: the owner's docs and briefs (#10–#15), and fix round 1, groups 1, 2 and 2a (#16–#18; see "Fix round 1" below). Typecheck, lint, all tests and both native builds pass on `main`.
- **Pace:** no 24-hour deadline (owner, 21 Oct). The next goal is a beta for about 50 testers on iPhone and Android; see BUILD_PLAN.md, section 1, "Road to the beta".
- **First Release run (21 Oct, iOS only):** the owner set up iOS credentials and the App Store Connect API key with EAS (role App Manager). The EAS build succeeded; the **Submit to TestFlight step failed**. Its log is visible only to someone signed in to GitHub, so the cause isn't known yet. The owner is submitting that build from his Mac with `eas submit --platform ios --latest`. **Stream D:** find the cause and fix the workflow.
- **Owner's phone testing:** round 1 on iPhone through TestFlight, with a checklist and his notes on a claude.ai page (https://claude.ai/artifact/BQU34AZ76SbRZpBKE5iyc6). Android follows when his phone arrives (about 23 Oct). The review session turns his notes into fix work for the streams.
- **Streams:** each opens pull requests into `main`; the owner or a review session merges them.

## Fix round 1 (iPhone test round 1, A–C)

The builder for [docs/briefs/2026-11-05-test-round-1-fixes.md](briefs/2026-11-05-test-round-1-fixes.md) works through its groups in order, one branch and pull request per group, each from the latest `main`. Questions are in "Owner questions" below, marked "(Fix round 1)".

| Group | State |
|---|---|
| 1. Body-cam: back swipe, and sound in the video (C2, C6) | Merged: https://github.com/AayushTainwala/Saakshi/pull/16. Not yet run on a phone. |
| 2. Body-cam: other fixes (C1–C3) | Merged: https://github.com/AayushTainwala/Saakshi/pull/17. Not yet run on a phone. |
| 2a. Body-cam: one continuous file, with checkpoints | Merged: https://github.com/AayushTainwala/Saakshi/pull/18. Not yet run on a phone. |
| 2b. Bug mode: one continuous file, with checkpoints (owner said yes, 6 Nov) | Built: https://github.com/AayushTainwala/Saakshi/pull/20 (branch `claude/keen-rubin-urautd`, from `main` after #19). Not yet run on a phone. |
| 3. Records list and playback (B1, C6) | Built: https://github.com/AayushTainwala/Saakshi/pull/21 (branch `claude/fix-round-1-group-3`, stacked on #20). Not yet run on a phone. |
| 4. Evidence camera: front and back, zoom (B2) | Built: https://github.com/AayushTainwala/Saakshi/pull/22 (branch `claude/fix-round-1-group-4`, stacked on #21). Research items reported below, not built. Not yet run on a phone. |
| 5. Why a recording ended (B8) | Built: https://github.com/AayushTainwala/Saakshi/pull/23 (branch `claude/fix-round-1-group-5`, stacked on #22). Not yet run on a phone. |
| 6. Trusted contacts, three ticks per person (B5) | Built: https://github.com/AayushTainwala/Saakshi/pull/24 (branch `claude/fix-round-1-group-6`, stacked on #23). Not yet run on a phone. |
| 7. Witness message (B5) | Built: https://github.com/AayushTainwala/Saakshi/pull/25 (branch `claude/fix-round-1-group-7`, stacked on #24). Not yet run on a phone. |
| 8. Certificate: one profile (B7) | Built: https://github.com/AayushTainwala/Saakshi/pull/26 (branch `claude/fix-round-1-group-8`, stacked on #25). Not yet run on a phone. |
| 9 | Not started |

### Where fix round 1 stands, and what's next (6 Nov 2026)

For the session that takes over. Read the brief, then this section, then CLAUDE.md as usual.

- **Finished:** groups 1, 2 and 2a are merged into `main` (#16, #17, #18). Each pull request has plain test steps for the owner. Typecheck, lint and all 307 tests pass, and both native builds pass on every one.
- **Built since:** bug mode as one continuous file with checkpoints (#20, "Bug mode: one continuous file" below). With it, typecheck, lint and 320 tests pass (three tests of the old iPhone pieces went with them).
- **Not yet tested:** nothing from fix round 1 has run on a phone. The owner's next TestFlight round should follow the test steps in #16, #17 and #18. Step C of #18, a forced restart while recording, is the genuine cut-off test that round 1 couldn't do.
- **Next: group 3** (records list and playback), on a new branch from the latest `main` (for example `claude/fix-round-1-group-3`), then groups 4 to 9 in the brief's order, one pull request each. The owner merges each pull request; when asked, stack the next group on the previous branch instead, as group 2 was.
- **What group 3 starts from:**
  - **Body-cam files now:** one file per clip. iPhone video is fragmented MP4 (`.mp4`), and each file's timeline starts at 0. iPhone sound-only files are ADTS (`.aac`). Android is MPEG-TS (`.ts`), with its existing MP4 copy (`Remuxer.kt`).
  - **Bug mode (from #20):** one continuous ADTS AAC file (`.aac`) per recording on both phones, with checkpoints; a follow-on file of the same clip only after the microphone was lost (a call) or a file failed.
  - **Group 3's joined MP4 copy:** it needs a multi-file record, which now happens only when an iPhone user left the app. Its "copy" record can follow `export/playableCopy.ts` and spec section 11.
  - **Sessions now hold `checkpoints`** beside `items`. Any list of a session's records must count both; `lastLink()` in `capture/pipeline.ts` gives the chain head.
- **Bundle format:** 0.6 with #20 (bug mode), 0.7 with #21 (joined copies). Group 9 needs a new version (0.8, …). Update `FORMAT_VERSION`, the record-version strings in `seal.test.ts`, `playableCopy.test.ts` and `deviceKey.test.ts`, `SUPPORTED_VERSIONS` in `tools/verify-bundle.mjs`, and spec section 12.
- **Left on purpose for later groups:**
  - putting the latest checkpoint in the witness message (group 7). Bug mode's automatic texts already carry it (#20); the message the user sends from a record does not yet. Bug mode's automatic texts are also not noted in the session's `witness` list (they never were); group 7 could add that;
  - telling "phone locked" from "left Saakshi", and showing end reasons in plain words on the record screen (group 5);
  - in-app playback of sound files (group 3).
- **Owner's decisions so far (all in SPEC.md, body-cam mode):** one record from Start to Stop; video and sound in the same file; unlock with volume-up twice, after a practice step; video stops only when iOS stops the camera; one continuous file with signed checkpoints; upload parts for E7, whose size is a setting.
- **Owner's decision on bug mode (6 Nov):** one continuous file with checkpoints, like body-cam (SPEC E8). Open question from it: the 3% auto-save (see "Owner questions", "(Fix round 1)").
- **How this was built, for the next builder:**
  - Swift and Kotlin compile only in the "Native build" workflow, which runs on pull requests that touch `modules/**`. Its status can be read without signing in from `https://api.github.com/repos/AayushTainwala/Saakshi/actions/runs?branch=<branch>`.
  - `ffmpeg` is installed in the cloud container. `modules/saakshi-evidence/verify/checkpoint-parts.sh` and `cutoff-formats.sh` check the containers with it.
  - There is no Kotlin compiler in the container, but JetBrains' command-line compiler downloads from GitHub releases (`https://github.com/JetBrains/kotlin/releases/download/v2.1.21/kotlin-compiler-2.1.21.zip`) and runs plain Kotlin on the JVM: `modules/saakshi-sos/verify/adts-checkpoints.sh` uses it (`KOTLINC=<path>/kotlinc/bin/kotlinc`). Code that uses Android's classes still compiles only in CI.
  - Apple's documentation reads well as JSON (`https://developer.apple.com/tutorials/data/documentation/<path>.json`). Android source wasn't reachable from Google's hosts, but the LineageOS copy on raw.githubusercontent.com was.
  - Twice, an independent review of the new native code, by a separate agent before merging, found real bugs that the compiler couldn't. Worth repeating for native changes.

### Group 1: what was fixed

1. **Nothing leaves body-cam while it records.** I couldn't pin down from the code alone why the left-edge swipe got through `gestureEnabled: false`. The likeliest cause is that the option was set from inside the screen, after the screen had been pushed. The fix covers every route out, whatever the cause:
   - the root layout turns the back gesture off for the body-cam screen before it opens (`src/app/_layout.tsx`), including iOS 26's full-screen swipe;
   - while recording, the screen refuses to be removed (`usePreventRemove` from expo-router, which also tells iOS not to let the native back gesture dismiss it), hides its header and back button, and swallows Android's back button. A swipe or back press shows "Stop and save first" (or the lock message, if locked);
   - leaving is allowed again only after Stop has saved everything;
   - if the screen were ever removed anyway, the recording is stopped and the session finished as one record, instead of being left open.
2. **Body-cam video on iPhone now has its sound in the same file.** The iPhone side of body-cam has its own recorder (`modules/saakshi-evidence/ios/BodyCamRecorder.swift`), in place of expo-camera (muted) plus expo-audio:
   - the camera (no microphone input) and one microphone stream (`AVAudioEngine`, started on screen when you press Start) feed `AVAssetWriter`;
   - while Saakshi is on screen, each one-minute video piece is a `.mov` with H.264 video and AAC sound, with a movie fragment every 10 seconds, so it is cut-off safe like the evidence camera's;
   - iOS can't write a video file in the background (Apple's `AVAssetWriter.h`: a writer still writing when the app goes into the background fails; see [this Apple forum reply](https://developer.apple.com/forums/thread/672056)). So the video piece is closed the moment the app goes into the background, inside a background task that gives it time to finish;
   - from then on the same sound goes into sound-only `.m4a` pieces, written by `AVAudioFile`, which works in the background. The first starts half a second before the video's sound ended, or up to 11 seconds before if the video file didn't close properly (such a file keeps only its complete 10-second fragments). When you come back, video with sound starts again and the sound-only piece ends half a second later. So the sound has no gap, and the picture's gap is in the next video clip's record;
   - a phone call: a sound-only piece ends; a video piece carries on without sound, and ends when sound comes back, so the next piece has sound again;
   - every file has its crash-recovery marker and its signed record in the same session, as before.

   An independent review of the recorder (before your test) found and I fixed: the background-writing failure above; starting body-cam during a call left the whole session without sound (the microphone is now retried until it starts); a stale microphone format after a route change (a fresh engine is made each time); extra tiny files when sound came back; and smaller timing errors in the gaps recorded.

   Bundle format **0.3** (`docs/spec/evidence-bundle.md`, section 3, step 8): two new end reasons, `video-resumed` (a sound-only piece ended because video came back) and `sound-resumed` (a video piece recorded without sound, after a phone call for example, ended because sound came back). `tools/verify-bundle.mjs` reads 0.1 to 0.3.

### Group 1: what I found on sharing the microphone (research)

The brief asked whether iOS lets the camera and the background recorder share the microphone, or whether a hand-over is needed. What Apple documents:
- The camera can't be used in the background: iOS interrupts it with [`videoDeviceNotAvailableInBackground`](https://developer.apple.com/documentation/avfoundation/avcapturesession/interruptionreason/videodevicenotavailableinbackground).
- A capture session uses the app's shared audio session by default ([`usesApplicationAudioSession`](https://developer.apple.com/documentation/avfoundation/avcapturesession/usesapplicationaudiosession)) and, by default, reconfigures it for its own recording and does not restore it afterwards ([`automaticallyConfiguresApplicationAudioSession`](https://developer.apple.com/documentation/avfoundation/avcapturesession/automaticallyconfiguresapplicationaudiosession)). expo-camera leaves both at their defaults.
- Starting a recording from the background can be refused: [`AVAudioSession.ErrorCode.cannotStartRecording`](https://developer.apple.com/documentation/coreaudiotypes/avaudiosession/errorcode/cannotstartrecording) "usually occurs when an app starts a mixable recording from the background". Body-cam's sound is mixable, so that other apps' music doesn't stop it.

What Apple does not document is whether a capture session with a microphone input and a separate recorder in the same app can both record at once; developer-forum reports disagree, and I couldn't test it here. A hand-over would have to start the sound recorder at the moment the app leaves the screen, which is already the background, where iOS may refuse it. So I built neither: the camera has no microphone input, and a single microphone stream, started on screen, is written into the video file or the sound-only file. There is no hand-over of the microphone and no second recorder, and the only gap is in the picture while you are away. Whether all of this behaves as designed needs your next phone test.

### Group 1: not verified

- Nothing has run on a phone. The Swift compiles only in the Native build workflow.
- Sound carrying on in the background: the old build relied on it too (expo-audio), but confirm it with the phone locked for several minutes.
- After a phone call that ends while Saakshi is in the background, sound may not restart until you return to the app (the mixable rule above). The recorder then tries as a non-mixable recording, which it stays until Stop, so other apps' sound could then interrupt it; untested.
- Whether the background task gives the video file enough time to finish when the phone locks. If not, the file's record says `error`, and the sound-only file reaches 11 seconds back to cover it.
- iOS 26's full-screen back swipe is blocked by the same settings; untested.
- Audio and video timing in the files (lip sync), and the half-second overlaps, need checking by playing the files.

### Group 2: what was fixed, and what was found

1. **Notification Center stopping video.** The new recorder from group 1 never stops video because the app is covered or inactive: under Control Center or Notification Center it keeps recording unless iOS actually stops the camera or sends the app into the background. Each video piece's record now gives iOS's reason (bundle format **0.4**): `app-left` (the app left the screen or the phone locked), `camera-in-use` (another app took the camera), `system-pressure` (Apple's example is heat), or `camera-lost` for anything else. The raw iOS reason is also written to the phone's log. If Notification Center still stops video in your next test, its record will say `app-left`, which means iOS itself treated pulling it down as leaving the app; the app can't prevent that.
2. **Unlock with one button only.** Apple's button API ([`AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction)) tells an app only whether a press was "primary" or "secondary"; a [capture event](https://developer.apple.com/documentation/avkit/avcaptureevent) carries nothing else. Apple's WWDC 2025 session 253 ([transcript](https://developer.apple.com/videos/play/wwdc2025/253/)): "Primary actions are triggered by the volume down button, Action button, and the Camera Control, while the secondary action is triggered by the volume up button", and from iOS 26 AirPods stem clicks are primary too. So volume-down can't be told apart from the others. **You decided (5 Nov): unlock with volume-up twice, on both platforms.** Volume-down, Camera Control, the Action button and AirPods now do nothing while the lock shows. On iOS 16.4–17.1, which lack that API, the app watches the volume level instead, so there the unlock doesn't work when the volume is already at its highest.
3. **Practice step.** The "I know how to unlock it" tick is gone. The start screen says "Press volume-up twice now", and Start becomes available only once you have done it; afterwards a one-line reminder stays above Start, with "Practise again". On iPhone the camera turns on during the practice (nothing is recorded), because iOS passes button presses only to an app that is using the camera; the screen says so. The old tick doesn't count, since it was for volume-down, so everyone practises once.
4. **The side button.** Locking the phone stops video (an iOS limit) and sound carries on. The hash report in the bundle now says so in words: "video stopped because Saakshi left the screen or the phone was locked (iPhone records video only while the app is on screen); sound carried on in the next file". The app itself can't yet tell locking apart from leaving the app; showing the reason on the record's screen, and telling those two apart if possible, is group 5.

### Group 2: not verified

- Nothing has run on a phone. Most important: that Camera Control, the Action button (set to Camera) and AirPods really do nothing while the lock shows; and that volume-up twice unlocks, during the practice and while recording.
- Whether Notification Center sends Saakshi into the background (then video stops, and the record says `app-left`) or only covers it (then video carries on).

### Group 2a: what was checked before building (brief item 4)

All three checks came out feasible, so nothing falls back to pieces.

1. **Reading a file while the recorder is still writing it.**
   - *iPhone: nothing has to be read back.* The asset writer can hand its output to the app segment by segment instead of writing a file. Apple: "The asset writer stops normal file writing when you implement this method" ([`assetWriter(_:didOutputSegmentData:segmentType:segmentReport:)`](https://developer.apple.com/documentation/avfoundation/avassetwriterdelegate/assetwriter(_:didoutputsegmentdata:segmenttype:segmentreport:))). With Apple's HLS profile it sends an initialization segment, then a segment every 10 seconds, video and sound together ([WWDC 2020, session 10011](https://developer.apple.com/videos/play/wwdc2020/10011/): "If you encode both audio and video, one AVAssetWriterInput for each media can be added"). The app writes each segment to the file and fingerprints it on the way. So the iPhone body-cam video is now fragmented MP4 (`.mp4`), not `.mov`. For a `.mov` that the asset writer writes itself, Apple doesn't say whether bytes already written stay untouched when it finishes; this way the question doesn't arise.
   - *iPhone sound-only files:* the app now encodes and writes them itself too, as ADTS AAC (`.aac`). That is append-only, cut-off safe and works in the background.
   - *Android:* MediaRecorder writes MPEG-TS through Android's `MPEG2TSWriter`. In the Android 15 source (the LineageOS 22.1 copy of AOSP, [`MPEG2TSWriter.cpp`](https://raw.githubusercontent.com/LineageOS/android_frameworks_av/lineage-22.1/media/libstagefright/MPEG2TSWriter.cpp); Google's own source host isn't reachable from here), every write is an `fwrite` of a 188-byte packet to a stream opened with `fdopen(dup(fd), "wb")`, and there is no seek anywhere in the file. `StagefrightRecorder::setupMPEG2TSRecording` creates it ([`StagefrightRecorder.cpp`](https://raw.githubusercontent.com/LineageOS/android_frameworks_av/lineage-22.1/media/libmediaplayerservice/StagefrightRecorder.cpp), line 1601). So the bytes on disk only grow. The app reads only the new bytes, up to the last whole packet, after flushing the file to storage. Phone makers can change this code; it needs testing on a Samsung and a Xiaomi, Oppo or Vivo.
   - *Android MP4 fallback (Android 7, or a phone that refuses MPEG-TS):* MediaRecorder rewrites an MP4's header when it stops, so these files get no checkpoints.
2. **That parts never split a file in a way that breaks it.** `modules/saakshi-evidence/verify/checkpoint-parts.sh` makes 40-second MPEG-TS and fragmented MP4 files with ffmpeg (not phones' recorders) and found:
   - a running SHA-256 snapshotted at each checkpoint equals the SHA-256 of the prefix re-read from disk;
   - parts ending on checkpoints, joined in order, are the file byte for byte;
   - every checkpointed prefix plays: 301, 600 and 901 video frames at the MPEG-TS checkpoints; 300, 600, 900 and 1200 at the fMP4 segment ends.
3. **Battery.** I couldn't measure this on a phone. Estimate:
   - Body-cam writes about 0.4 MB a second at 720p (0.8 at 1080p).
   - SHA-256 runs at about 1,400 MB a second on this cloud machine. Current phones have the same kind of SHA instructions in their processors.
   - So even at a tenth of that speed, the hashing would use well under 1% of one core.
   - Each checkpoint adds one signature and one flush to storage every 10 seconds; Android also reads each byte once more, from memory.

   I expect this to be small next to the camera, the encoder and the screen. Your last test used about 2% battery in 10.5 minutes; the next test will show whether that changes.

### Group 2a: what was built

- **One continuous file.** Body-cam records one file from Start to Stop, with its sound, on both platforms. On iPhone a new file starts only when it must: you came back to Saakshi, sound came back after a call, or a file couldn't be written. The sound-only file still covers only the time video couldn't record.
- **Signed checkpoints, about every 10 seconds.** On iPhone they come at each video segment, and about every 10 seconds of sound for sound-only files; on Android, every 10 seconds at a packet boundary.
  - Each checkpoint is the length so far and the SHA-256 of those bytes, from the running hash. It is signed into the session's chain as it comes (bundle format **0.5**: a new record type, `saakshi.evidence.checkpoint`).
  - When the file closes, its usual record carries the same `recording` id. The app also compares the file as hashed with what the recorder wrote, and notes any difference.
  - The body-cam screen shows how many checkpoints are signed and the time of the last one.
- **Upload parts, for E7.** Byte ranges of the file, each ending on a checkpoint, about `uploadPartSeconds` long. That is a stored setting, 60 seconds for now, to be decided with E7. E7 gets them through `setBodyCamPartListener` from `@/modules/evidence`. Nothing is uploaded yet.
- **The checker.** `tools/verify-bundle.mjs` checks every checkpoint against its file in one pass: the file's first bytes must have the SHA-256 the checkpoint signed. Tests build real signed bundles and catch a changed byte, a file shorter than its checkpoints, a missing checkpoint, and checkpoints without their file.
- **Not done:** the witness message could carry the latest checkpoint (the brief says "can"); group 7 redesigns that message, so I left it there. Bug mode is unchanged, as the brief says.
- **An independent review** of the new phone code found eleven problems, all fixed in this pull request:
  - an iPhone video file whose writer failed mid-recording would have dropped everything until Stop; it now ends at once and a new file starts;
  - on Android, a failed stop (for example, the phone full) would have deleted a recording that had checkpoints; it is now kept and marked as an error;
  - each iPhone `.mp4` now starts its own timeline at 0, so players show the right length;
  - a write that fails part-way cuts the file back to the last fingerprinted byte;
  - a checkpoint can no longer reach the app after its file's close event;
  - the checker accepts a missing checkpoint number (one that couldn't be signed);
  - and smaller things: waiting for Android's last packets before the final fingerprint, flushing after measuring, a full flush on iPhone (`F_FULLFSYNC`), and sound-only files from unusual microphones being resampled or mixed down instead of refused.

### Group 2a: not verified

- Nothing has run on a phone. Most important:
  - that the iPhone segments arrive every 10 seconds and the `.mp4` plays in Photos, Files and QuickTime;
  - that the `.aac` sound-only file encodes in the background;
  - that Android's checkpoints keep up with the recorder on several makers' phones;
  - that a recording cut off by a forced restart verifies up to its last checkpoint.
- `MessageDigest.clone()` (Android's way of snapshotting the running hash) is supported by Android's standard SHA-256. If a phone refused it, that phone would give no checkpoints; recording would carry on.
- Apple doesn't document that an asset writer hands over its last segment before `finishWriting` reports done. If it didn't, the last few seconds would be missing and the app would show a recording problem.
- AAC's start-up delay (about 44 ms) isn't marked in the `.mp4` (Apple's HLS profile writes no edit list), so sound may run that much behind the picture.

### Bug mode: one continuous file, with checkpoints (#20)

**The owner said yes (6 Nov):** bug mode records like body-cam, one continuous file with checkpoints; on iPhone with the cut-off-safe AAC writer; its witness texts, at most every 10 minutes, carry the latest checkpoint. Recorded in SPEC E8.

**Checked before building:**
- *Android: reading the file while MediaRecorder writes it.* Bug mode already wrote ADTS AAC (`MediaRecorder.OutputFormat.AAC_ADTS`). In the Android 15 source (LineageOS 22.1 copy of AOSP), `StagefrightRecorder::setupAACRecording` makes an `AACWriter` for that format ([`StagefrightRecorder.cpp`](https://raw.githubusercontent.com/LineageOS/android_frameworks_av/lineage-22.1/media/libmediaplayerservice/StagefrightRecorder.cpp), line 1478). [`AACWriter.cpp`](https://raw.githubusercontent.com/LineageOS/android_frameworks_av/lineage-22.1/media/libstagefright/AACWriter.cpp) writes each frame as a 7-byte header, one byte at a time (`writeAdtsHeader`), and then the frame's data (`threadFunc`), each with `write()` on its own descriptor, with no seek or truncate anywhere. So the bytes on disk only grow, and a checkpoint may find the file ending part-way through a header. Phone makers can change this code; the checkpointer stops checkpointing (and says so once) if the bytes aren't ADTS, and recording carries on.
- *That checkpoints never split a frame.* `modules/saakshi-sos/verify/adts-checkpoints.sh` makes a 40-second ffmpeg AAC file at the recorder's settings (mono, 44.1 kHz, 64 kbit/s), and runs the real `AdtsCheckpointer.kt`, compiled for the JVM, on a copy that grows the way `AACWriter` writes it. Result: 80 checkpoints, every one on a frame boundary, each SHA-256 equal to the prefix re-read; every checkpointed prefix decodes with ffmpeg with no errors; parts ending on checkpoints join into the file byte for byte; bytes that aren't ADTS give one error and no more checkpoints; a file shorter than its checkpoints is refused.
- *iPhone:* nothing is read back. The app encodes and writes every byte itself (`AdtsWriter` and `CheckpointedFile`, body-cam's sound-only writer from group 2a), so the running hash is over exactly what was written.
- *Cost.* Sound is about 8 KB a second on Android (64 kbit/s) and 16 KB on iPhone (128 kbit/s). Each checkpoint reads about 80 KB once on Android, and on both phones flushes the file, signs one record and rewrites `session.json`. That last step grows with the recording: the session's bookkeeping lists every checkpoint, so after an hour `session.json` is about 135 KB (24 MB written in all), after 8 hours about 1.1 MB (about 1.5 GB written in all, 1 MB every 10 seconds by then). My estimate is that this is small next to the microphone and the screen-off phone's own drain (perhaps 1–2% of the battery over 8 hours), but it isn't measured. If the owner's test shows it matters, the fix is to keep checkpoints in an append-only file beside `session.json` (body-cam would gain too); I haven't built it.

**What was built:**
- **Android** (`modules/saakshi-sos`): `BugRecorder` records one `.aac` file from Start to Stop; `AdtsCheckpointer` reads only the new bytes up to the last whole ADTS frame, every 10 seconds, on the recorder's own thread, so a checkpoint always comes before its file's close and never after. A new file starts only if MediaRecorder reports an error (then the old file ends with `"error"`, and a new one starts, retried every 5 seconds until it does). The service now says when Stop has closed the last file (`onBugRecorderStopped`).
- **iPhone** (`modules/saakshi-evidence/ios/SoundRecorder.swift`): replaces expo-audio's 2-minute `.m4a` pieces. `AVAudioEngine`'s microphone, started on screen, goes into `AdtsWriter`, with a checkpoint about every 10 seconds of sound. A new file starts only when the microphone stops and comes back (a phone call, a route change, a media-services reset; the old file ends with `"audio-interrupted"`) or a file can't be written. The microphone is retried every 10 seconds while it is off, as body-cam's is. Start fails, with the reason on screen, if the microphone can't start at all.
- **One JavaScript path for both** (`startSoundRecording` in `@/modules/evidence`): each checkpoint is signed into the session's chain as it comes; each file is hashed, moved and sealed when it closes, and compared with the recorder's own fingerprint. Upload parts for E7 come through `setBugModePartListener` from `@/modules/bugmode` (it replaces `setPieceUploader`), with the same part-size setting as body-cam. If nothing was recorded because the microphone couldn't start, no empty session is left in the Record tab.
- **Witness texts:** after a new signed record, if 10 minutes have passed since the last text, the newest chain head goes to trusted contacts (where the phone can send with no tap): "Saakshi bug mode: recording since 10:40 IST, signed up to 10:50 IST. SHA-256: …". The 20-texts-in-30-minutes cap stays.
- **Screens:** the bug-mode screen shows how many checkpoints are signed and the time of the last; the iPhone Live Activity shows "Signed up to 10:50 IST", updated at most once a minute. The text explains one file and checkpoints in place of pieces, in English and Hindi.
- **Location:** each record takes the latest fix, now asked for at most once a minute (it was once per piece).
- **Bundle format 0.6** (`docs/spec/evidence-bundle.md`): bug mode's files, checkpoints and follow-on files as above; no record member was added or removed. `tools/verify-bundle.mjs` reads 0.1 to 0.6. A test makes a real signed bug-mode bundle (two files after a call, four checkpoints) and the checker passes it.
- The App Review note on bug mode (`store/apple/review-notes.md`) now says one file, signed every 10 seconds.
- **An independent review** of the new code (by a separate agent, before the pull request was ready) found no compile errors and no case where a checkpoint could disagree with its file or come after its file's close. It found ten problems in how failures are handled, all fixed in #20:
  - Android: if MediaRecorder stops writing (AOSP's `AACWriter` stops on a write or microphone error without telling anyone, for example when the phone is full), nothing noticed. Now a file that hasn't grown for 30 seconds ends as `"error"` and a new one starts. A failure while closing a file can no longer crash the app, and the service always says when Stop is done.
  - Android: a recorder could be left running if its marker couldn't be written. The marker is now written before the recorder starts.
  - Recorder problems never reached the screen, and an Android start that never recorded looked like success. Now the bug-mode screen shows the latest problem, and on Android Start waits (up to 8 seconds) until the first file is recording, or fails with the reason.
  - iPhone: a microphone whose first sound took more than 2 seconds could loop without ever recording, silently. Late first sound is now kept; an engine with no sound after 5 seconds is started afresh; 10 seconds without sound is reported on screen.
  - Android: file end times were taken after the final fingerprint (up to a second late); now right after the recorder stops.
  - A stop taking more than 5 seconds could let the old file's late events reach the next recording. Each recording now takes only events for files in its own session folder, and a Start while the last recording is still stopping fails with a message.
  - iPhone: bug mode now leaves the sound session as it is while body-cam runs, sets it only when it differs, and restarts its microphone at most once a second, so the two can't make each other restart in a loop.
  - iPhone: the stall and retry timers now use the uptime clock, which a clock change doesn't move.
  - Upload parts could end on a checkpoint that wasn't signed. Parts are now cut only from signed checkpoints, and the last part from the file as sealed. Body-cam had the same pattern (group 2a) and is fixed the same way here.
  - Android: the service released its wake lock before the last file was closed and fingerprinted; now it waits.
- **Compiled before CI:** `BugRecorder.kt` and `AdtsCheckpointer.kt` compile with the JetBrains compiler against small Java stand-ins for the Android classes they use (signatures copied from the Android API). The rest of the Kotlin and all Swift compile only in the Native build workflow.

**Not verified:**
- Nothing has run on a phone, and the Swift and Android Kotlin compile only in the Native build workflow.
- Most important to test: an iPhone recording with the phone locked for 30 minutes or more (that sound keeps coming, and checkpoints keep being signed); a phone call during bug mode on both phones; a forced restart while recording (the file should play up to the cut and be sealed as interrupted when the app opens, with its checkpoints); Android with the screen off for an hour on a Samsung and a Xiaomi, Oppo or Vivo.
- As before for iPhone, after a call that ends while Saakshi is in the background, sound may not restart until the user returns to the app (iOS may refuse to start a recording from the background; the recorder then tries it as non-mixable).
- If body-cam and bug mode ever ran together on iPhone (for example, confiscation mode started from the code pad over body-cam), both would use the microphone at once; neither switches the sound session off or changes it under the other, but this hasn't been tried.
- Found by the review, not changed (it was so before #20): the crash-recovery check at app start trusts that a session not marked active in the running JavaScript is finished. If the app's JavaScript ever restarted while Android's service kept recording, the file being written could be sealed early as interrupted. Nothing calls `bugRecorderRunning()` yet.

### Group 3: records list and playback (#21)

**What was built:**
- **The records list** shows each record as what it is: "Body-cam", "Bug mode", "Photo", "2 videos", "Video and 2 photos". It also shows its length ("12 min 5 s"), "Started 06/11/2026 10:40 IST" and a picture.
  - The picture is the photo itself, or a video's frame at one second, made once by `expo-video-thumbnails`.
  - Video pictures are kept in the session's `thumbs/` folder. They are not evidence, never go in a bundle, and go when the record is deleted.
  - Body-cam and bug mode are measured from Start to Stop; the evidence camera adds up its videos' lengths.
  - Each file's mode and rotation are now kept in the locker's bookkeeping. Older sessions read them from the signed record.
- **Photos** open full screen.
- **Sound files** play in the app.
- **One player per body-cam or bug-mode record** (`expo-video`): it plays the files end to end with their sound, and shows the total length and which file is playing.
  - Each file starts where the one before stopped, so iPhone's half-second hand-over overlaps aren't heard twice.
  - Sound-only stretches say so. Gaps where nothing was recorded (a phone call) are said too.
  - Android `.ts` videos play from their MP4 copy.
  - **Older body-cam records** (your test round 1) saved muted video pieces with sound in separate overlapping files. The player plays their sound end to end, says why, and each video still plays on its own.
- **Nothing plays while Saakshi is recording** (bug mode in the background, for example). The microphone would pick the playback up, and on iPhone playing takes the sound session from the recorder. **For you to confirm** (SPEC E5 says "built so").
- **Joined MP4 copy for sharing**, offered where a body-cam record has more than one video file: on iPhone after you left the app; on Android only after a recorder error. "Share the whole video" makes it once.
  - Each video file's picture sits at its place in time, with no new picture in between. The sound comes from the video and sound-only files, each stretch once, placed by each file's own clock so picture and sound stay in step.
  - iPhone (`Joiner.swift`): `AVMutableComposition` exported with the passthrough preset. It re-encodes only if the clips were filmed turned different ways or passthrough fails, and then the record says so.
  - Android (`Remuxer.join`): `MediaExtractor` into `MediaMuxer`, samples copied unchanged and interleaved by time. Files turned different ways are not joined, and the app says why.
  - Its own signed record (`saakshi.evidence.joined-copy`, bundle format **0.7**, spec section 11a) lists every source file's record and SHA-256, and where each stretch went, naming only what the phone actually placed.
  - It is labelled as a copy, and is never in the bundle or the certificate.
- **New dependencies:** `expo-video` 58.0.13 and `expo-video-thumbnails` 58.0.2, both MIT, SDK-matched, with no new permissions. expo-video's config plugin is **not** in `app.json`: given `false` options, it removes iPhone's background `audio` mode, which bug mode and body-cam need.
- **An independent review** found and I fixed:
  - the older records above;
  - playback that could start during a recording (after making an Android copy);
  - the plugin problem;
  - evidence pictures left in expo-image's disk cache after a delete (now never cached);
  - deletes racing a copy or thumbnail (now refused until it's done);
  - duplicate copy jobs;
  - session updates lost while a copy was signed;
  - sound drifting from picture in the joined copy;
  - Android trimming inside a file;
  - rotation of Android MP4-fallback files;
  - untranslated join errors.

**Not verified:**
- Nothing has run on a phone. The Swift and Kotlin compiled in the Native build workflow for the first version; the review fixes are building.
- Whether the iPhone passthrough export accepts a composition with empty stretches and sound from both `.mp4` and `.aac` files. If not, it re-encodes and says so.
- Whether AVPlayer and ExoPlayer play every file as expected: fragmented `.mp4` with no edit list, ADTS `.aac`, older `.m4a`.
- Android video frames from MPEG-TS for thumbnails (`MediaMetadataRetriever`).

### Group 4: evidence camera, front and back, and zoom (#22)

**What was built:**
- **Front and back camera:** a switch button (⇄) beside the shutter, for photos and video. It is off during a video (see the research below).
  - Android video uses the app's own recorder, which now opens the front camera too, with Camera2's front-camera rotation for the file.
- **Zoom:** pinch with two fingers anywhere on the picture, plus quick buttons:
  - **0.5×** where the phone has a wider lens. On iPhone that is the ultra-wide lens, chosen with expo-camera's `selectedLens`. On Android video it is the camera's own zoom below 1×, on phones that offer it (Android 11+); the button then shows its real value, for example "0.6×".
  - **1×**, and **2×** where the camera reaches it. The current zoom shows on the selected button, for example "1.4×".
  - Zoom can change while recording, except iPhone's 0.5×, which is a different lens: expo-camera changes lens by changing the camera, and that would end the file.
  - Android photos (expo-camera, CameraX) can't go below 1×.
  - `capture/zoom.ts` turns the zoom into what each camera needs, and is tested:
    - iPhone expo-camera: `zoom` 0..1 rises exponentially to the lens's maximum, which the native module reads from the device's current format;
    - Android expo-camera: the ratio over the camera's maximum;
    - Android video: `CONTROL_ZOOM_RATIO`, or a sensor crop before Android 11.
- **Leaving the camera:** unchanged (group 5 records why).
- **An independent review** found and I fixed:
  - on iPhone, one tap on ⇄ left the shutter off until the camera was closed. expo-camera says it is ready only once per view, so the camera view is now made afresh for each camera and each mode;
  - on Android video, the preview froze after a switch, while recording used the new camera (the preview view is now made afresh too);
  - a double tap on ⇄ that could leave a camera open (⇄ is off until the camera is ready, and the recorder closes a camera that opens after a newer open or a close);
  - zoom left wrong after changing between photo and video on iPhone (learnt again);
  - a lens change racing a recording's start (the shutter waits for the new lens);
  - iPhone lenses changing back and forth while pinching (they change only when the fingers lift);
  - a pinch jumping after one finger lifted;
  - Android zoom updates sent faster than the camera needs (now at most about 30 a second);
  - the digital-zoom crop before Android 11 being slightly off centre.
- **Joining front and back videos (Android):** a record with both front- and back-camera videos can't be joined, because their turns differ. The app now says it was filmed with different cameras. On iPhone the joiner re-encodes such a record and says so.

**Research (brief item 3), not built; your decision:**
1. **Switching camera during a video, keeping one file.**
   - **iPhone with expo-camera: not possible.** Changing `facing` makes expo-camera swap the camera input inside a configuration change (`CameraSessionManager.swift`, `addDevice`), with no check for a recording.
     - Apple has an error for this case: "Recording stopped because the configuration of media sources and destinations changed" ([AVError.Code.sessionConfigurationChanged](https://developer.apple.com/documentation/avfoundation/averror-swift.struct/code/sessionconfigurationchanged)).
     - Apple's AVCamManual sample disables the camera button "until recording finishes" ([listing](https://developer.apple.com/library/archive/samplecode/AVCamManual/Listings/AVCamManual_AVCamManualCameraViewController_m.html)).
     - An Apple media engineer advises a video data output into `AVAssetWriter` instead ([forum](https://developer.apple.com/forums/thread/101833)).
   - **iPhone with the app's own recorder:** possible.
     - It is the body-cam recorder's design (`BodyCamRecorder.swift`) plus a preview and the switch, with both cameras set to the same size: "ensure that sample buffers you append are of the specified format" ([AVAssetWriterInput](https://developer.apple.com/documentation/avfoundation/avassetwriterinput/init(mediatype:outputsettings:sourceformathint:))).
     - The file's turn can't change once writing starts ("You can't set this value after writing starts", [transform](https://developer.apple.com/documentation/avfoundation/avassetwriterinput/transform)), so the front camera's frames would need turning one by one.
     - My estimate: 400–700 lines of Swift, medium risk.
   - **Android, the app's recorder:** not documented either way.
     - A persistent surface "can be reused by subsequent MediaCodec or MediaRecorder instances" ([MediaCodec](https://developer.android.com/reference/android/media/MediaCodec#createPersistentInputSurface())), but nothing says a second camera may feed it while MediaRecorder runs.
     - The size and the rotation are fixed before `prepare()` ([setOrientationHint](https://developer.android.com/reference/android/media/MediaRecorder#setOrientationHint(int))), and two cameras' timestamps may not be comparable ([SENSOR_INFO_TIMESTAMP_SOURCE_UNKNOWN](https://developer.android.com/reference/android/hardware/camera2/CameraMetadata#SENSOR_INFO_TIMESTAMP_SOURCE_UNKNOWN)).
     - A safe version needs a GPU step that scales, turns and re-times frames. The file's rotation would also vary within one file, which MPEG-TS can't hold and our records would need (a bundle-format change).
     - My estimate: 150–250 lines of Kotlin, high risk until tried on phones; 600–1,000 more with the GPU step.
2. **Dual capture (front and back at once, picture-in-picture).**
   - **iPhone:** `AVCaptureMultiCamSession`, iOS 13 and later, on "an iPhone with an A12 or later processor" ([Apple's sample](https://developer.apple.com/documentation/avfoundation/avmulticampip-capturing-from-multiple-cameras)), which is iPhone XS, XS Max and XR onwards (WWDC 2019).
     - The app must check `isMultiCamSupported` on the phone. A configuration whose `hardwareCost` is over 1.0 won't run ([docs](https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession/hardwarecost)).
     - Under heat, the system pressure state can stop capture ([docs](https://developer.apple.com/documentation/avfoundation/avcapturedevice/systempressurestate-swift.class)). WWDC 2019 session 249 gives "up to 15 minutes" at moderate pressure.
   - **Android:** concurrent cameras from Android 11 (`CameraManager.getConcurrentCameraIds`). Only on phones that declare `FEATURE_CAMERA_CONCURRENT`: "The device's main front and back cameras can stream concurrently" ([PackageManager](https://developer.android.com/reference/android/content/pm/PackageManager#FEATURE_CAMERA_CONCURRENT)).
     - The guaranteed sizes are small, 720p plus 1440p at most ([CameraDevice](https://developer.android.com/reference/android/hardware/camera2/CameraDevice)).
     - Google publishes no list of phones. I couldn't read the Android CDD's wording (source.android.com isn't reachable from here).
   - **Cost:** both platforms need the two pictures combined on the GPU into one encoder. My estimate: 1,000–1,500 lines of Swift and 1,200–2,000 of Kotlin, high risk, with battery and heat to be measured. CameraX 1.5+ can do picture-in-picture recording, but only to MP4, which isn't cut-off safe.

**Not verified:**
- Nothing has run on a phone. Most important:
  - that 0.5× and 2× match the phone's own Camera app;
  - that zoom during a video doesn't end the file;
  - that front-camera video on Android plays upright.
- Whether expo-camera calls `onCameraReady` again after a lens change. The zoom controls are learnt there, and stay as they were if it doesn't.

### Group 5: why a recording ended (#23)

**What was built:**
- Each file on the record screen, and the recording as a whole (its last file), says why it ended, in plain words, in English and Hindi. There are words for all twelve end reasons the records can hold. The ones the brief named:
  - "You stopped it."
  - "Stopped when you left Saakshi or locked the phone."
  - "Battery low: stopped and saved."
  - "Cut off: the app closed or the phone switched off…".
  - A test checks that every end reason has words in both languages.
- **The evidence camera** now stops a video only when Saakshi goes into the background, and records that as `app-left` (it recorded `stopped`). Only covering the app (Control Center, Notification Center) leaves it recording, as you decided for body-cam in group 2.

**Found:** iPhone doesn't tell an app whether the user locked the phone or left the app; both look the same to the app (it goes into the background). The only public signal is `UIApplication.protectedDataWillBecomeUnavailableNotification`, "posts shortly before protected files are locked down and become inaccessible" ([Apple](https://developer.apple.com/documentation/uikit/uiapplication/protecteddatawillbecomeunavailablenotification)). It comes only on a phone with a passcode, and Apple gives no timing, so a lock a few seconds after leaving can't be told apart. So one sentence covers both, and says why. Android records in the background, so it never needs this.

**For the next test round, a genuine cut-off:** while recording (evidence camera, body-cam or bug mode), force-restart the iPhone: volume up, volume down, then hold the side button until the Apple logo. When Saakshi opens again, the record should say "Cut off: …", and Check files should pass.

**Not verified:** on a phone, that the evidence camera now keeps recording under Control Center and Notification Center (expo-camera's capture session isn't stopped when the app is only covered; untested).

### Group 6: trusted contacts, three ticks per person (#24)

**What was built** (your decision of 5 Nov; SPEC S1):
- Each trusted contact has three ticks: **SOS alerts**, **Live location**, **Witness messages**.
  - All are ticked for someone new, and for everyone saved before. The contacts file is now version 2; older files read as all ticked.
  - The ticks show under each person on the contacts screen, with a warning if none is ticked.
- Every message fills in the people ticked for it, so nobody types a recipient at the moment of sending:
  - SOS alert, including confiscation mode's: SOS.
  - Live-location link, including "send again" and confiscation mode's late link: live location.
  - The witness message from a record: witness. It now fills its recipients in; before, you chose them in Messages.
  - Bug mode's witness texts: witness.
- **Confiscation mode:** when its SOS alert carries the live link, the link also goes on its own to anyone ticked for live location but not for SOS alerts, who would otherwise not get it.
- **For other modules:** `getTrustedContacts(use?)` and `textTrustedContacts(message, { use })` from `@/modules/sos`.

**Not verified:** on a phone, that iPhone's Messages composer opens with the witness recipients filled in.

### Group 7: the witness message (#25)

**What was built:** the witness message from a record is now **format v1**, specified in `docs/spec/evidence-bundle.md`, section 9. Its own version is independent of the bundle's.
- **Line 1** is always `Saakshi witness v1`.
- **Then, in a fixed order:**
  - the record's name ("2026-11-06 10-40 IST Body-cam");
  - Started and Ended, with seconds, in IST, and the length ("0:12:18");
  - the place where it started, with its accuracy and a map link;
  - the number of files, and each file's SHA-256 when there are three or fewer ("video 1 SHA-256: …");
  - the whole record's SHA-256 (the chain head);
  - the app version and the record's id.
- **Language:** labels follow the app's language, as before; values never change. Software reads the lines by their order.
- **Length:** at most 6 SMS parts. Over that, it leaves out, in turn, the per-file lines, the map link and the id. English uses only GSM characters ("within 13 m", not "±13 m"), so it stays in the cheaper encoding. Hindi is Unicode and loses the per-file lines first.
- **Times:**
  - The 03:42 / 03:43 mismatch you saw: the bundle's file name used the time the session was opened, and the message used the time the last file ended. Now the bundle's name uses the time recording started, the same "Started" the app and the message show.
  - The bundle's `hash-report.txt` and the certificate's enclosed hash report label each file's times "Started" and "Ended". Neither is the Schedule's form wording, which is unchanged.
- **Names** (`naming.ts`): "2026-11-06 10-40 IST Body-cam" for a record, and "video 1", "sound 2" for its files. They follow the brief's group 9 examples, so that the bundle can use the same names.
- **Bug mode's automatic texts** keep their own short form ("Saakshi bug mode: recording since 10:40 IST, signed up to 10:50 IST. SHA-256: …"), which the spec now describes. They are still not noted in the session's `witness` list.

**Not verified:** on a phone, how Messages shows a six-part message, and whether it splits it.

### Group 8: certificate, one profile (#26)

**What was built** (your decision of 5 Nov; SPEC E4):
- **Settings → Certificates → "Your details for certificates"**: the phone's one profile.
  - The fields: name; son, daughter or spouse of, and that person's name; residing or employed at, and the address; IMEI(s) with the `*#06#` help; colour; serial number; the ownership boxes.
  - It is saved on the phone as it is typed, in the same file the form used, so details typed before carry over.
  - It says it is of the person who owns, maintains, manages or operates the phone, and that anyone else changes it first.
- **Making a certificate shows no form.**
  - If the profile is incomplete: "Your details for certificates aren't complete yet. Part A needs them", and a button to fill them in.
  - If it is complete: "Part A will be made for Asha Rao, who owns and operates this phone (IMEI 356938035643809)", and **Make certificate**, plus "Change your details".
- **Unchanged:** existing certificates, and the form's wording (`certificate/html.ts`).

**NEEDS OWNER REVIEW:** the new strings (`profile` in `record.json`, `certificates` in `settings.json`, English and Hindi). The Settings line refers to "section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023", as the existing certificate screen does (law.md 1A).

## Owner questions

Streams add questions here as `- [ ] (Stream X) question`.

- [x] (Stream A) **Deleting recordings.** *Answered 20 Oct:* ordinary delete ships in R1, one session at a time with a confirmation. Quick delete (E9) stays held back. SPEC E5.
- [x] (Stream A) **Segment length.** *Answered 20 Oct:* the evidence camera saves one file from start to stop, with no segments and no joining; the format must survive a sudden cut-off (check its cost on both platforms first and report in this handoff). Segments are for bug mode and body-cam mode only. SPEC E1, E8, body-cam mode.
- [x] (Stream A) **Certificate language.** *Answered 20 Oct:* English only for now, with the Hindi help text kept. SPEC E4.
- [x] (Stream A) **App Attest environment.** *Answered 20 Oct:* `production` confirmed.
- [x] (Stream D) **Play signing key.** *Answered 21 Oct:* (b), upload our EAS keystore as the app signing key. When you first upload to Google Play, the Console asks who holds the app signing key. Two choices:
  - **(a) Google makes its own key (the default).** The Play copy and the GitHub APK then have different signatures. Android won't install one over the other, so someone switching must uninstall first, which **deletes the recordings kept in the app**.
  - **(b) Upload our EAS keystore as the app signing key.** Both copies share one signature and the user can switch freely.

  I recommend (b). Decide before the first Play upload: it can't easily be changed afterwards. (b) needs the keystore backup (Stream D, step 4) and Google's key-export steps in the Console, which I couldn't read from here.
- [x] (Stream D) **Public contact email** *Answered 21 Oct:* tainwala.aayush@gmail.com. For the privacy policy, TestFlight feedback, App Review contact and the Play developer page. Until then, the privacy policy points to GitHub issues.
- [x] (Stream D) **Play target audience.** I suggest 18 and over. *Answered 21 Oct:* 18 and over.
- [x] (Stream D) **Mirrors.** *Answered 21 Oct:* yes to both: Codeberg first, and CI may use the Internet Archive's uploader.
  - Is Codeberg fine as the first mirror (docs/release/mirrors.md)?
  - The Internet Archive's official uploader is AGPL. May CI use it (it never enters the app), or should a later session use plain `curl` instead?
- [x] (Stream B) **Phone backups.** Android backs up an app's files to the user's Google account unless the app turns this off (`android.allowBackup`), and iCloud backs up the documents directory. That would copy trusted contacts (and evidence) off the phone. Turn Android backup off for the whole app, keep it, or exclude only some files? This touches Stream A's evidence too. *Answered 20 Oct:* the user chooses whether anything is backed up and where: local only, or a cloud service of their own (Google Drive, iCloud or another). Nothing ever comes to us. So the app starts local-only, with the phone's automatic backups off for its files, and copies only where the user chooses. SPEC section 2. Work for Streams A and B: see Stream D, "For other streams".
- [x] (Stream B, for Stream D) **Extra Android permissions.** `npx expo config --type introspect` shows the Expo defaults `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in the manifest. No feature needs them; consider blocking them in `app.json` (`android.blockedPermissions`) so the Play listing and App Review notes stay short. *Done by Stream D:* `app.config.ts` blocks all three in every Android build.
- [x] (Stream B) **Supabase region for live location (S3).** *Answered 20 Oct:* Mumbai (`ap-south-1`). Project `saakshi-live` created there.
- [x] (Stream B) **Supabase plan for live location.** `saakshi-live` is in the "AT's Desk" organisation. Supabase pauses inactive projects on its free plan, which would break live links without warning. *Answered (owner's review of R2):* free while testing; the plan must be reviewed before R2 goes public. On the release checklist below.
- [x] (Stream B, for Stream D) **Apple Team ID.** The widget extension needs `ios.appleTeamId` in `app.json`. *Answered (owner's review of R2):* `5NYAUT5C56` (not secret); set in `app.json`.
- [x] (Fix round 1) **Camera picture on the iPhone body-cam screen.** *Withdrawn 5 Nov:* the old iPhone body-cam drew the camera's live picture under its controls, but behind an 85%-black layer, so it couldn't really be seen (the owner never noticed it). The new recorder draws no picture, as Android never did. Nothing changes for the user.
- [x] (Fix round 1) **Bug mode, continuous too?** *Answered 6 Nov:* yes, like body-cam (iPhone: the cut-off-safe AAC writer; witness texts, at most every 10 minutes, carry the latest checkpoint). Built in #20; SPEC E8.
- [ ] (Fix round 1) **Camera research (group 4).** Switching between front and back during one video needs the app's own iPhone recorder (about 400–700 lines of Swift, medium risk) and, on Android, either an undocumented hand-over (high risk) or a GPU step (600–1,000 more lines). Dual capture is a larger separate feature (1,000–2,000 lines per platform, high risk, newer phones only). Build either, and when? Details in "Group 4" above.
- [ ] (Fix round 1) **No playback while recording.** Group 3 lets nothing play while Saakshi is recording (for example, bug mode in the background), so the recording doesn't pick the playback up, and iPhone doesn't take the microphone from the recorder. The player says so. Is that right, or should playback be allowed (on Android, where the microphone isn't taken)?
- [ ] (Fix round 1) **Bug mode and the 3% auto-save.** You decided on 22 Oct that bug mode has no 3% auto-save, because its pieces were short and a dying battery lost at most the piece being recorded. With one file, a dying battery now leaves that one file cut off: it still plays up to the cut, its checkpoints prove all but about the last 10 seconds, and it is sealed as interrupted when the app next opens. Keep it so, or add the 3% stop-and-save that body-cam has (which would end bug mode cleanly at 3%, before the phone dies)? I've kept your 22 Oct decision until you answer.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

## Release checklist

Things that must be done or decided before a release goes public. Streams add items as `- [ ] (Stream X, release) item`.

- [ ] (Stream B, R2) **Supabase plan for live location.** `saakshi-live` stays on the free plan while testing (owner's answer). Before R2 goes public, review the plan: free-plan projects can be paused when inactive, which would break every live link without warning.
- [ ] (Stream B, R2, for Stream D) **Privacy texts for live location.** Update the privacy policy, the Apple privacy label and Play's Data safety answers before an R2 build is published (facts in Stream B, "For Stream D").
- [ ] (Review, beta) **Owner's sign-offs:** the certificate text (then set `FORM_TEXT_REVIEWED`), the rights prompts, and every Hindi string.
- [ ] (Review, beta) **Design pass:** directions mocked up and chosen by the owner, then applied; a real app icon and launch screen in place of Expo's placeholders.
- [ ] (Review, beta) **Phone testing:** every feature on at least one iPhone and two different Android phones (one Samsung, one Xiaomi, Oppo or Vivo), with what was found fixed.
- [ ] (Stream D, beta) **TestFlight Submit step** in the Release workflow works from CI.
- [ ] (Stream D, beta) **Dependency audit:** `npm ci` reports 61 known vulnerabilities in build tools. Triage which, if any, reach the app; don't run `npm audit fix --force`.
- [ ] (Stream D, beta) **TestFlight public link** (Apple's beta review) and **Play closed test** (12 or more testers for 14 days).
- [ ] (Review, beta) **Rights and safety guides (G1, G2):** the owner decides whether they join the beta.

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

**Body-cam mode (B1–B4): how it works and every platform limit found (21 Oct).** Record tab → "Body-cam mode". The first time, the user must acknowledge how to unlock before Start is enabled. Since fix round 1, group 2a, one continuous file from Start to Stop with signed checkpoints every 10 seconds (it was 60-second pieces); 720p by default with 1080p as an option, sealed through `createEvidenceSession()`. Nothing is uploaded in R1.

- **Reading the volume buttons:**
  - *Android, screen on:* key events reach the app's window while it is on screen. `VolumeKeys.kt` wraps the window's callback while the lock is showing, takes volume-up presses (volume-down before fix round 1, group 2), and swallows both volume keys so the volume doesn't change.
  - *Android, screen off:* apps get no key events. Volume keys go to the system, or to an active media session that takes remote volume handling ([`MediaSession.setPlaybackToRemote`](https://developer.android.com/reference/android/media/session/MediaSession): "This must be called to receive volume button events"). That would mean presenting a fake playing media session, so it isn't used. Unlocking needs the dark screen (which is on, at minimum brightness). If the user turns the screen off, recording carries on and they unlock the phone as usual.
  - *iPhone, iOS 17.2+:* [`AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction): "The system sends capture events only to apps that actively use the camera. Backgrounded capture apps … don't receive events." Volume down is a "primary" event (WWDC 2025 session 253), and so are the **Action button and Camera Control** (and AirPods clicks from iOS 26). Since fix round 1, group 2, only volume-up (the "secondary" event) unlocks, and the primary buttons do nothing while the lock shows.
  - *iPhone, iOS 16.4–17.1:* no public API reads the buttons. The fallback watches the system output volume and counts each decrease as a press, so it **does not work when the volume is already at zero**, and the presses do change the volume.
- **Dark screen:** Android dims only Saakshi's window (no `WRITE_SETTINGS` permission; I removed expo-brightness, whose plugin would add it). iPhone sets the system brightness and restores the previous level on unlock; iOS also restores it when the phone locks. The screen stays on (keep-awake) so that it can be unlocked, which costs battery.
- **Android foreground service** (`BodyCamService.kt`, types camera and microphone, partial wake lock):
  - It can only be started while the app is on screen ([while-in-use rule](https://developer.android.com/develop/background-work/services/fgs/service-types)), which it always is when the user taps Start.
  - Android 13+ shows its notification only if the user has allowed notifications. Per the owner's decision of 22 Oct, the app asks for that permission the first time body-cam starts. The notice has a Stop button, which ends the session as the in-app Stop does. If the user refuses, recording carries on, and the screen says the notice is under Active apps at the bottom of the notification shade. Per Android's [notification permission guide](https://developer.android.com/guide/topics/ui/notifiers/notification-permission), foreground-service notices then appear in the Task Manager but not the drawer. Stopping Saakshi from Active apps ends the whole app ([Android 13 Task Manager](https://developer.android.com/about/versions/13/changes/fgs-manager)); the piece being recorded is then sealed as interrupted at the next start.
  - Some makers' battery managers (Xiaomi, Oppo, Vivo and others) may stop background services. Test.
  - During a phone call Android may give the microphone to the call and silence other apps' recording; video continues. Not yet tested.
  - Google Play requires a declaration for camera and microphone foreground services (Stream D).
- **iPhone** (rebuilt in fix round 1, group 1: see "Fix round 1" above; the old expo-camera and expo-audio design is gone from body-cam):
  - Apple allows video only while the app is on screen, as the spec says. Video pieces stop with `endReason: "app-left"` when the app leaves the screen, and a new clip starts on return; `gapBeforeMs` in the first piece's record gives the gap.
  - The screen warns about this before Start, and again whenever it is unlocked. iOS gives no notice before the user leaves an app, so a warning at the moment of leaving isn't possible.
  - While the app is on screen, each video piece has its sound in the same file. Sound-only `.m4a` pieces are written only while video can't record.
  - There is no way to open the Low Power Mode setting directly, so the app explains where it is. On Android the button opens Battery Saver settings.
- **Gaps between pieces:**
  - Android: about the time to stop one `MediaRecorder` and start the next.
  - iPhone: none between pieces (one writer ends on the frame where the next begins); the gap in the picture while the app is away is in the next video clip's `gapBeforeMs`.
  - Both are recorded in `gapBeforeMs` and are untested on phones.
- **For Stream C:** the chest-mount guide (G4) should teach the unlock (volume up, twice, since fix round 1, group 2). The lock message deliberately doesn't name the buttons.
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
- volume-up unlock on each platform, including iOS 16 and 17.0–17.1;
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
- **E8, bug mode.** New module `@/modules/bugmode`; SOS → Bug mode. *Since fix round 1 (#20) bug mode records one continuous file with checkpoints, on iPhone with its own recorder in place of `AudioPieces`, and its E7 hook is `setBugModePartListener()`; see "Bug mode: one continuous file, with checkpoints" under fix round 1. The pieces described here are how R2 built it.*
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
- **E7:** call `setBugModePartListener()` from `@/modules/bugmode` with the Drive upload (it replaced `setPieceUploader()` in fix round 1). Bug mode then uploads each part, a byte range of its one file ending on a signed checkpoint, as soon as it exists.

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
- **iPhone, background:** if the app is force-quit, iOS stops both bug mode and live location. A phone call takes the microphone; since fix round 1 the file ends there (`"audio-interrupted"`) and a new one starts when the microphone comes back.
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
- After E7 lands, check the Drive upload through `setBugModePartListener()`.
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
1. **Expo token.** *Done 20 Oct.* If not done yet (BUILD_PLAN section 5, step 1):
   - revoke the token that was shared in chat;
   - at expo.dev → your account → Settings → Access tokens, create a new one;
   - on GitHub, open Saakshi → Settings → Secrets and variables → Actions → **New repository secret**, named `EXPO_TOKEN`.
2. **Android: nothing.** The first run of the Release workflow makes the signing key.
3. **iPhone: one command on your own computer (Mac, Windows or Linux), once.** *Done 21 Oct on the owner's Mac (`~/Code/Saakshi`): distribution certificate and provisioning profiles for the app and the widget, and an App Store Connect API key (App Manager) for EAS Submit.* It can't run in a cloud session, because it needs your Apple ID login and the two-factor code on your phone.
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

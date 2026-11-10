# Fix round 1: builders' reports (iPhone test round 1, 5 to 6 Nov 2026)

> Archived from `docs/BUILD_HANDOFF.md` on 10 Nov 2026, word for word (links to other files adjusted for the new folder). It is a record of a finished round: read it for how something was built or why. The current state is in [BUILD_HANDOFF.md](../BUILD_HANDOFF.md).

Merged as #16 to #27.

## Fix round 1 (iPhone test round 1, A–C)

The builder for [docs/briefs/2026-11-05-test-round-1-fixes.md](../briefs/2026-11-05-test-round-1-fixes.md) works through its groups in order, one branch and pull request per group, each from the latest `main`. Questions are in "Owner questions" below, marked "(Fix round 1)".

| Group | State |
|---|---|
| 1. Body-cam: back swipe, and sound in the video (C2, C6) | Merged: https://github.com/AayushTainwala/Saakshi/pull/16. Not yet run on a phone. |
| 2. Body-cam: other fixes (C1–C3) | Merged: https://github.com/AayushTainwala/Saakshi/pull/17. Not yet run on a phone. |
| 2a. Body-cam: one continuous file, with checkpoints | Merged: https://github.com/AayushTainwala/Saakshi/pull/18. Not yet run on a phone. |
| 2b. Bug mode: one continuous file, with checkpoints (owner said yes, 6 Nov) | Merged: https://github.com/AayushTainwala/Saakshi/pull/20. Not yet run on a phone. |
| 3. Records list and playback (B1, C6) | Merged: https://github.com/AayushTainwala/Saakshi/pull/21. Not yet run on a phone. |
| 4. Evidence camera: front and back, zoom (B2) | Merged: https://github.com/AayushTainwala/Saakshi/pull/22. Research items reported below, not built. Not yet run on a phone. |
| 5. Why a recording ended (B8) | Merged: https://github.com/AayushTainwala/Saakshi/pull/23. Not yet run on a phone. |
| 6. Trusted contacts, three ticks per person (B5) | Merged: https://github.com/AayushTainwala/Saakshi/pull/24. Not yet run on a phone. |
| 7. Witness message (B5) | Merged: https://github.com/AayushTainwala/Saakshi/pull/25. Not yet run on a phone. |
| 8. Certificate: one profile (B7) | Merged: https://github.com/AayushTainwala/Saakshi/pull/26. Not yet run on a phone. |
| 9. Export (B6) | Built: https://github.com/AayushTainwala/Saakshi/pull/27 (branch `claude/fix-round-1-group-9`, on `main`). Not yet run on a phone. |

### Where fix round 1 stands, and what's next (6 Nov 2026)

For the session that takes over. Read the brief, then this section, then CLAUDE.md as usual.

- **Finished:** groups 1 to 8 are merged into `main`: #16, #17 and #18, bug mode (#20), then #21 to #26. Each pull request has plain test steps for the owner, and both native builds passed on every one.
- **Open:** group 9, export (#27, on `main`). It is the brief's last group. Typecheck, lint and 396 tests pass, and both native builds pass on its native code.
- **Not yet tested:** nothing from fix round 1 has run on a phone. The owner's next TestFlight round should follow the test steps in each pull request, #16 to #27. Step C of #18, a forced restart while recording, is the genuine cut-off test that round 1 couldn't do.
- **Next:** the owner's answers to the "(Fix round 1)" questions below, then whatever they decide. Nothing else in the brief is left to build.
- **What group 3 starts from:**
  - **Body-cam files now:** one file per clip. iPhone video is fragmented MP4 (`.mp4`), and each file's timeline starts at 0. iPhone sound-only files are ADTS (`.aac`). Android is MPEG-TS (`.ts`), with its existing MP4 copy (`Remuxer.kt`).
  - **Bug mode (from #20):** one continuous ADTS AAC file (`.aac`) per recording on both phones, with checkpoints; a follow-on file of the same clip only after the microphone was lost (a call) or a file failed.
  - **Group 3's joined MP4 copy:** it needs a multi-file record, which now happens only when an iPhone user left the app. Its "copy" record can follow `export/playableCopy.ts` and spec section 11.
  - **Sessions now hold `checkpoints`** beside `items`. Any list of a session's records must count both; `lastLink()` in `capture/pipeline.ts` gives the chain head.
- **Bundle format:** 0.6 with #20 (bug mode), 0.7 with #21 (joined copies), 0.8 with group 9 (names a person can read). A later change needs 0.9: update `FORMAT_VERSION`, the record-version strings in `seal.test.ts`, `playableCopy.test.ts`, `deviceKey.test.ts`, `joinedCopy.test.ts` and `checkpointBundle.test.ts`, `SUPPORTED_VERSIONS` in `tools/verify-bundle.mjs`, and spec section 12.
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

### Group 9: export (#27)

**What was built** (brief section 9; SPEC E5, "Export"):
- **Two clear actions on every record**, in one card under the player:
  - **"Share video"** (or "Share photo") sends a playable file through the share sheet, to WhatsApp, Instagram, YouTube, Mail and so on. On iPhone it is the original. On Android it is the MP4 copy, with no question first: the original goes in the bundle. A body-cam record with several video files shares its joined copy (group 3).
  - **"Export evidence bundle"** saves the full ZIP. The card says where it saves, or that the first time asks for a folder, and offers "Change folder" and "Share the bundle instead".
  - Each file's card also has its own "Share video", "Share photo" or "Share sound".
- **The default export folder.** The user picks it once.
  - iPhone: Apple's document picker for folders, kept as a security-scoped bookmark (`ExportFolder.swift`). Each export resolves the bookmark, opens the folder, copies the ZIP in under file coordination, and closes it. A name that is taken becomes "… (2).zip". A stale bookmark is made again. This follows Apple's "Providing access to directories".
  - Android: expo-file-system's folder picker, which takes a persistable Storage Access Framework permission. The ZIP is written straight into the folder, and a half-written one is deleted if the export fails.
  - If the folder has gone, the app says so and offers to choose another or to share instead. The choice is kept on the phone (`evidence/export-folder.json`).
- **Names a person can read: bundle format 0.8** (spec section 7). For example:
  - the bundle: `Saakshi 2026-11-06 10-40 IST Body-cam.zip`;
  - the originals: `Original files/2026-11-06 10-40-12 IST video 1.mp4`;
  - the records: `Signed records/0074 video 1.json`, and checkpoints like `Signed records/0000 video 1 checkpoint 0.json`. The number is the record's place in the chain, so the folder lists them in order;
  - also `Hash report.txt` and `Certificate Part A.pdf`.
  
  The machine identifiers (session id, record ids, the app's own file names) stay in `manifest.json`. The manifest now says which original goes with which record. The hash report gives both names for every file. `tools/verify-bundle.mjs` reads 0.8 and every older layout. The tests check it with `openssl`, `sha256sum`-style hashing, and Python's `zipfile` reading the names.
- **README.txt in English and then Hindi**, for someone with no technical background (`export/readme.ts`). It covers:
  - what each file and folder is, and why it is there;
  - how the fingerprints and the chain prove nothing changed;
  - how a lawyer or expert checks the bundle: the one-line tool, or by hand, with commands that name this bundle's own files.
  
  It has a byte-order mark and Windows line ends, so Notepad on an older PC shows the Hindi and the lines.
- **A certificate made from now on** names the files as the bundle does. One made before keeps the old names (`media/0003-clip0-seg0.mp4`), which the hash report gives as each file's "Name in record".
- **Guards:** a bundle can't be made while its record is still recording or being sealed, and a record can't be deleted while its bundle is being written or copied.
- **An independent review** found these, and I fixed them:
  - **the checking tool could say "OK" about a tampered 0.8 bundle.** It found each original through the manifest, which isn't signed, so a doctored file could sit at the readable name with the genuine one elsewhere. Now each record's file must be directly in `Original files/`, no file may be claimed twice, every file there must be claimed, and paths outside the bundle are refused. The tool lists each file it checked. Four new tests make such bundles, and each fails as it should (they passed the old tool);
  - **the README claimed too much:** that a record "cannot be removed" without it showing. Records taken off the end show only against a chain head held elsewhere, such as a witness message. The README (both languages), the spec and the tool now say so;
  - **every export failure blamed the folder,** even a missing file in the record. Folder problems and bundle problems now have their own messages;
  - **the iPhone's folder errors were in English only.** They now have codes, which the app says in English or Hindi;
  - **on iPhone, a failed copy could leave half a bundle behind,** and the record could be deleted during the copy. Both are fixed. The folder's name is now the one the Files app shows ("iCloud Drive", not "com~apple~CloudDocs").
- **A second review of those fixes** found three more ways to get "OK" about a misleading bundle, and a small race. All are fixed:
  - **the readable names weren't checked.** A video renamed to another start time, with the manifest changed to match, passed. Now the tool works every name out from the signed records (spec section 7 gives the rule exactly) and fails on any difference, so the time in a file's name is as trustworthy as its record. The app names files by the same rule;
  - **a copy in a look-alike folder passed.** Examples are "ORIGINAL FILES/", a Cyrillic "О" and a trailing space, and on a Mac or Windows PC such a copy can land on the real file when unzipped. Now nothing may sit outside the bundle's one layout (except `key.pem`, which the README's steps make), and names a computer would treat as one fail;
  - **a ZIP holding a name twice passed,** because unzip tools differ on which copy they keep. That now fails, as does a ZIP entry whose local header gives another name;
  - **every export shared one cache folder,** so sharing one record during another's long copy could remove the file being copied. Each record now has its own.
  - Seven new tests make such bundles; each passed the earlier tool and fails now.
- **A third review** found that a crafted ZIP, though not a folder, could still unpack a doctored copy at the readable name: through `.` in a name, a local header naming another file on an entry the tool never read, or the Unicode Path extra field, which Python's `zipfile` takes as the name. The app writes plain ZIPs, so the tool now refuses anything else: every name a plain path, every local header the same as the central directory, no extra fields but ZIP64's and timestamps, no gaps between entries, no symbolic links. It skips only the exact files a computer adds (`.DS_Store`, `._`, `__MACOSX/`, `Thumbs.db`, `desktop.ini`), and a `key.pem` left in the bundle must be its key. Three more tests; the reviewer's own attack bundles all fail now.
- **A fourth, last review** of the ZIP reader found one more: nothing after the central directory was checked, so a second archive could follow it, which Info-ZIP, Python and Java would unpack instead. The tool now requires exactly the ending the app writes (the end record in the last 22 bytes, no comment, the directory right before it or before the ZIP64 records, which must agree). The reviewer found nothing else, and confirmed the app's own ZIPs, ordinary and ZIP64, pass and unpack the same in those tools. One more test.
- **Left as they are:**
  - on Android, if the app is killed while it writes, a cut-short ZIP can stay in the folder under the bundle's name. expo-file-system can't rename a file in such a folder, so it can't be written under a temporary name first. No ZIP tool or the checking tool will accept it;
  - on iPhone, the bundle is made in the cache, then copied in, so it needs about twice its size free for a moment.
- Typecheck, lint and 396 tests pass.

**Built so, for you to confirm** (also in "Owner questions"):
- A sound-only record (bug mode) has **"Share sound"**.
- An evidence-camera record with several photos or videos has no record-level share. Each is shared from its own card, because the share sheet takes one file.
- File and folder names in the bundle are in English, whatever the app's language, so that they read the same for every lawyer and court and every ZIP tool handles them.

**NEEDS OWNER REVIEW:**
- The README as a whole, since a court reader may rely on what it says the bundle proves: in particular "How the proof works".
- Its Hindi.
- Its closing lines on section 63(4)(c). They say what the old README said: Part A by the person in charge of the device, Part B by an expert (law.md 1A, s.63(4)(c); 1B, the Schedule).
- The new strings (`share` and `export` in `record.json`, English and Hindi).

**Not checked:** the brief asks the README to agree with the bundle walkthrough the review session is giving you. That walkthrough isn't in the repository, so I couldn't compare them. Please check them against each other, or point me to it.

**Not verified (needs a phone):**
- iPhone: the folder picker and bookmark with "On My iPhone", iCloud Drive and a third-party provider, including after the app restarts.
- Android: a folder on the phone and one in Google Drive's provider. Writing into Drive's provider is the least certain.
- How long a large bundle takes to save.

# Spec change log

> The history of [SPEC.md](SPEC.md): who decided what, when, and what each decision replaced. The spec itself states each feature once, as it stands today, with no dates. Decisions are the owner's (Aayush) unless marked otherwise. Newest first.
>
> **When the spec changes:** change the sentence in SPEC.md, add a line here under a new date, and update the owner's features-by-build table ([spec/features-by-build.json](spec/features-by-build.json)) in the same pull request. `node tools/features-table/check.mjs` checks the table against the spec.

## 14 Nov 2026: the features-by-build table

- The owner's table was built from the settled spec: [spec/features-by-build.json](spec/features-by-build.json), 79 rows in 14 groups, five builds across the top. No decision in the spec changed. Where the spec names no build for a decided feature (the stamped copy; Telegram and email; the iPhone Shortcut test; the lawyers and medics list; switching on "making room from the cloud"), the table says so in the box.
- The round 1 test build is the build of commit `9b81f92`: the owner's seven exported bundles are all in bundle format 0.2, which only that build wrote.

## 14 Nov 2026: the owner's answers to the five small points

The review session had filled in five points the owner's decisions did not cover (SPEC section 10 as it then stood). His answers, on the open-items page:

- **The battery reserve can be switched off** (SPEC section 4, "Battery"). The review session had written fixed steps with no "off". With it off, body-cam and Pocket recording record until the phone dies, handing over at 5%.
- **Saving mode starts at 5% whenever a location share is on,** whether or not anything is recording (SPEC section 4, "Low battery"). It was the review session's proposal; the owner accepted it. It is built with "when a recording stops by itself".
- Confirmed as the review session had written them: the evidence camera is not stopped at the keep-free amount (it warns, and its video stops at the 300 MB floor); a body-cam or Pocket recording started at or below the reserve starts with a notice and records until the phone dies; the failing-camera alert is five long vibrations.
- Section 10 no longer lists these five.

## 14 Nov 2026: the spec rewritten as settled text

- SPEC.md was rewritten so that each feature is stated once, with its state (built, to build, later). The dated layers ("decided on, then changed on") moved to this file. Section numbers and module codes did not change.
- A ledger accounting for every decision in the old text is in [handoff/spec-rewrite-2026-11-14.md](handoff/spec-rewrite-2026-11-14.md).
- New sections: "How to read this", "Recordings that survive a fault" (under E1), "When a recording stops by itself" (section 4), 9 "Look and feel" and 10 "Open with the owner".
- No legal sentence was changed. The sentence on BNS s.37 stands as it was, with the question against it listed in section 10.
- **The spec is the master; the features-by-build table is the owner's mirror** (owner, 14 Nov). Five builds across the top of the table (the round 1 test build, the round 2 test build, the beta, the public release, later); each box shows the feature as it is in that build, with changes marked; grouped under headings and collapsible; engineering content kept to what the owner needs for design and function, in plain words.

## 13 and 14 Nov 2026: the owner's answers on the open-items pages

**When a recording stops by itself** (SPEC section 4). All of it is built together, as the builder's next piece.

- **Storage.** This replaces stage one of 10 Nov:
  - Body-cam never drops to sound only to save room. The step built in repair round A (#46) on both phones comes out, with its setting.
  - A video does not start below the 300 MB safety floor, and a running video stops there. Before: at the floor everything stopped, and a photo was refused there too.
  - Photos and sound can be made below 300 MB, with a notice that room is critically low, down to a last floor of about 50 MB (the builder works out the figure).
  - A recording may start below the keep-free amount, with a notice of the room and minutes left. Before: body-cam and Pocket recording did not start at or below it.
  - A video that started above the keep-free amount stops at that amount. A running sound recording does not stop there. Before: Pocket recording stopped at the keep-free amount, and body-cam's sound carried on below it.
  - Nothing is recorded to external memory for now (the owner had raised it).
  - The rate estimates are tuned from measurements on both phones. The iPhone evidence camera's rate is measured, not set.
- **Battery reserve.** Body-cam and Pocket recording stop at a battery level the user sets, 10% to start, never while charging. Before: nothing stopped for the battery; at 5% the file closed and a new one carried on until the phone died.
- **Efficiency.** Two separate switches: one for the last 5% of battery above the reserve, one for the last stretch of storage (the owner suggested 1 GB). Both start switched on (review session, with the owner's leave to say otherwise).
- **Time limit.** Off until the user sets one, for body-cam and Pocket recording. Two pulses of vibration at one minute before the end, then a stronger, continuous vibration for the last ten seconds. (The owner's first note suggested limits of 30 minutes for video and 1 hour for sound from the start; he then chose off until set.)
- **"My phone is being taken"** ignores the battery reserve and the time limit and records to the end.
- Filled in by the review session, for the owner to confirm (SPEC section 10): the evidence camera is not held by the keep-free amount; a recording started below the reserve is not stopped by it; the reserve is chosen from fixed steps.

**A camera that keeps failing part-way** (body-cam, both phones; the owner's wording of 14 Nov). It replaces the restart rule of 10 Nov (a try after 1 second, then every 5 seconds, without limit) and the guard the review session had proposed (after three restarts in a row under 10 seconds each, wait 30 seconds):

1. Video breaks: sound carries on, one vibration, video tried again every 1 second.
2. After three tries in a row that fail, or that die within 30 seconds: five long vibrations, the dark screen lights up with "Video has stopped. Sound is still recording." and three buttons (Keep trying video, Carry on with sound only, Stop and save); as a notification if the phone's own screen is off.
3. Until a button is tapped: sound records and the vibrations repeat every minute. **Video is not tried in that time** (owner, 14 Nov, answering the review session's question; the review session had proposed a try every 30 seconds).
4. Carry on with sound only ends the video tries; Stop and save ends the recording and returns to the Record tab.

**Six rare faults** found in repair round A (SPEC E1, "Recordings that survive a fault"):

1. Signed records are written in one step, like the index.
2. Notes of witness messages stay in the add-only log, as built.
3. A file saved but never signed is signed when the app next opens, from its start note, with the record saying it was signed late and when. The start note is kept until the signature is written. (The owner asked why the app would not know when a recording began; it does, and the old order of work threw the note away too early.)
4. A damaged recording gets a "Share everything that is left" button (one ZIP, with a note that the files have no signed records) and shows its size beside Delete. Nothing recorded is ever deleted automatically. (Both points were the owner's.)
5. A key the phone lists but will not use: decided after trying it on a real phone.
6. Recordings whose key was written over (test recordings from before #47): no bundle; files shared one by one; recovery of the public key from the signatures stays possible later.

**Other answers.**

- The domain names are bought before the beta build goes to testers (13 Nov: "closer to launch"; 14 Nov: before the beta build).
- The Help tab's numbers download automatically, and the list is sealed before the public release.
- The list of volunteer lawyers and medics is parked until after the beta.
- Android's exact free-space reading goes into repair round B.
- The hash report's low-battery line takes the proposed words: "closed by the app at 5% battery; recording carried on in the next file".
- "What police may ask of a phone" is researched with the next on-phone cycle, together with the cloud-copies point.
- Parked, to be answered with the test results: the sentence on BNS s.37, how to cite *D.K. Basu* and *Arnesh Kumar*, photo ID in or out, and the four new lines in the bundle.
- **Design** (SPEC section 9): mock-ups start now, beside the repairs; one look on both phones; built on the lines of the most-used camera, sound-recorder and gallery apps; the records list as a gallery with the evidence detail only when asked for; the three export details "built so" are discussed with that redesign.

## 10 Nov 2026: after the review of `main`

- **Storage, in two stages** (review item 3). Stage one, built in repair round A (#46) and replaced on 13 and 14 Nov: a fixed safety floor (about 300 MB; the builder confirmed 300 MB) at which everything stops; a keep-free amount starting at 5 GB; **at the keep-free amount body-cam drops to sound only** (on unless switched off), then stops cleanly with the end reason `storage-full`; Pocket recording stops at the keep-free amount; "My phone is being taken" records past the keep-free amount, down to the floor; body-cam and Pocket recording do not start at or below the keep-free amount. Stage two (making room from the cloud) stands, in SPEC E7.
- **The keep-free amount starts at 5 GB or a tenth of the phone's storage, whichever is smaller.** As first built it started at a plain 5 GB.
- **Body-cam:** a clean start is confirmed before the screen goes dark, and nothing is retried at Start; a position is not a condition. A recorder that fails part-way restarts by itself with no limit, at most 5 seconds between tries, with sound throughout and a vibration (the owner asked what a retry costs, and capped the gap at 5 seconds instead of 30). Replaced on 14 Nov by the failing-camera design.
- **Time and place on the picture:** a stamped copy when sharing; no setting to stamp the original; nothing added to the law notes for it. (The owner had first asked for a stamp on the picture as a user setting.)
- **Proofs** (review item 9): the bundle is described as several proofs, never as "unimpeachable"; the key check before the beta; motion readings, the public timestamp (E3, brought forward from after the public release) and a "not earlier than" anchor before the public release.
- **"My phone is being taken":** the lock is immediate (group 1.7's lock waited up to 20 seconds); the alert goes at once with the live link following (before, it waited up to 8 seconds for the link); the microphone is essential (arm only with the microphone; about two seconds of retries; the lock regardless); the mode restarts by itself after the app is killed and reopened; the app says that Saakshi's lock needs the PIN only after a phone test confirms it; the Play listing states the lock and the uninstall step openly.
- **The secret code's waits** stop following the phone's clock when the silence alarm is built (changing 9 Nov, when following the clock was accepted).
- **A phone with no SIM set for texts** is detected and the user guided; no new permission.
- **The map on the live page stays,** and the privacy policy says so.
- **Our own web address:** a `.org` and a `.in` name; the owner chose `saakshiapp`.
- New feature code is paused until review items 1 to 4 are done; no emulator sitting.

## 9 Nov 2026: round 2 follow-ups

- **Cloud copies go to any service the owner designates;** round 2 builds Google Drive and iCloud Drive (before: Google Drive).
- **No paid maps:** MapLibre with OpenFreeMap's tiles.
- **The battery level is sent and shown only at 20% or less** (narrowing 6 Nov, when it went with every alert).
- **A forgotten code is reset with the phone's passcode only,** never a face or fingerprint; a phone with no passcode, or on Android 7 to 10, gets a recovery code.
- **A swipe counts past about 85% of its track,** after Apple's slide-to-unlock design.
- **Saving mode:** positions keep full accuracy (to revisit after a phone test); the "battery at 5%" notice goes by text where no tap is needed and by notification to Saakshi contacts, never as a text from an iPhone.
- **Body-cam's low-power file on Android** keeps the picture size, at 15 frames a second and a lower data rate, so the camera is never rebuilt mid-recording (before: 480p on both phones).
- **"My phone is being taken" locks the phone's screen:** on Android through an opt-in device-admin permission used only to lock; on iPhone, and on Android without it, a large "Now lock your phone".
- Kept as built: the code's waits follow the phone's clock (changed on 10 Nov); stopping "My phone is being taken" stops everything it runs; "I need help" goes at once after a full swipe; a file saved after a cut-off records no battery level; plugging in at 5% does not start a new full-quality file; a Stop when no code is set asks for one first.

## 6 Nov 2026: round 2, after the owner's SOS test

- **Section 5 was rewritten.** It replaced R1 and R2's SOS-tab layout, the 3-digit code pad and confiscation mode with: the SOS page with three swipes; "Share my location" as a calm action; the quick trigger opening the swipe screen; one secret code of 4 digits on every Stop; "My phone is being taken"; trusted contacts with a way to be reached each, in Settings; Saakshi-to-Saakshi; the silence alarm; the first-open walkthrough.
- **Bug mode became Pocket recording,** moved to the Record page, as one continuous file with checkpoints like body-cam. Until then it was saved in fixed pieces of 1 to 3 minutes (on iPhone as `.m4a` pieces, replaced by the app's own cut-off-safe writer).
- **Low battery: the 5% handover** replaced the 3% stop-and-save of 21 and 22 Oct for every mode. The evidence camera never stops by itself. Pocket recording has no 3% auto-save (closing a question left open in fix round 1).
- **Upload parts lengthen:** 10 seconds for the first minute, 30 seconds for the next five minutes, then one minute; no live audio. This replaced "a minute or two" of 5 Nov.
- **G5:** the phone setup the walkthrough covers; a power-off lock named as an essential safety feature that phones lack, with requests to Apple, Google and makers filed at release.
- **Camera:** no switching camera during a video and no front-and-back recording at once, for now. **No playback while recording:** kept as built.
- **Wording:** all wording, English and Hindi, legal and ordinary, is reviewed together in one test round.
- **Ideas for later, not to build now:** a second device that carries on when the phone is off. Snatch detection is not wanted for now.

## 5 Nov 2026: test round 1 on the owner's iPhone

- **Trusted contacts:** one list with three ticks per person.
- **Certificate:** one profile per phone, no per-certificate form.
- **Body-cam unlock: volume-up twice.** It was volume-down; iPhone cannot tell volume-down apart from the Camera Control, the Action button and AirPods clicks. A practice step replaced the "I know how to unlock it" tick.
- **Body-cam saves one continuous file with checkpoints** about every 10 seconds. It was saved in one-minute pieces; thirty one-minute files for a thirty-minute recording is unmanageable, so splitting became only a fail-safe.
- **Body-cam:** video and sound in the same file; one record from Start to Stop; video stops only when iOS stops the camera; a body-cam or Pocket-recording recording is one recording with a single player.
- **Upload parts** defined as byte ranges ending on checkpoints.
- **Records list and playback; export** with two actions, a default folder and readable names (bundle format 0.8); **the witness message's contents**; **front and back camera, and zoom**.

## 20 to 22 Oct 2026: R1 and R2

- **Backups are the user's choice** (20 Oct): nothing is backed up automatically.
- **Ordinary delete ships in R1,** one recording at a time; quick delete (E9) held back.
- **The evidence camera saves one file from start to stop,** in a format that survives a cut-off (it had been 60-second pieces joined when recording stopped). The build cost of the format on each phone was checked and reported before it was built ([handoff/streams-r1-r2.md](handoff/streams-r1-r2.md)).
- **Android videos** (22 Oct): the `.ts` original stays the evidence; an MP4 copy for playing and sharing.
- **Certificate in English only for now,** with the help text in both languages.
- **Body-cam mode moved from v1.1 into R1** (20 Oct). As first built: one-minute pieces, volume-down twice to unlock.
- **Low-battery auto-save** (21 and 22 Oct, replaced on 6 Nov): warnings at 10% and 5%; at 3% the recording stopped and saved; not while charging; not in bug mode.
- **Android notice** (22 Oct): body-cam asks for the notification permission the first time, on Android 13 and later.
- **Bug mode's witness texts:** at most one every 10 minutes.
- **Live location:** the server in Mumbai; Supabase's free plan while testing, reviewed before the public release (tightened on 6 Nov to before the beta).
- **Release** (21 Oct): the repository public; the Play signing key our own; the name Saakshi, with Shamash as the fallback.

## 17 Oct 2026: the first spec

- Written from the owner's picks and notes on the V1 scope board, rounds 1 and 2: build afresh in Expo, learning from Tella, as one complete app; APK, TestFlight and store submissions, no web version; SMS only in v1; live location by our own link; Hindi for the whole app.
- **Licence: MIT.**

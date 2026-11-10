# Saakshi v1 Spec

> Every product decision for v1, from Aayush's picks and notes on the [V1 scope board](https://claude.ai/artifact/SApsbjwDz8sQA55CxX5fH9) (rounds 1 and 2). Items marked **Proposed** await his decision; everything else is decided. Module codes (E1, S4 and so on) are the board's. How the build is sequenced: [BUILD_PLAN.md](BUILD_PLAN.md). Comment with `[AT: ...]`. Round 2 (6 Nov 2026) is in sections 4 (E1, E7, E8, body-cam), 5 and 6 (G5), and in [briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md).

## 1. What it is

A free, open-source phone app that helps people in India protect themselves and their rights. It records evidence fit for court under BSA s.63; it alerts the user's own contacts with their location; it protects them when their phone is taken from them; and it teaches what to do, in English and Hindi. It is published under Aayush's own name, as a lawyer, as an app that helps people protect their rights. It is not presented as a protest app.

**Working name:** Saakshi (witness), subject to store and trademark checks. Fallback: Shamash.

## 2. Ground rules

- **Protect yourself, protect your rights.** Every feature is framed as self-preservation and protection of rights under Indian law, to life and liberty above all (the project register, section 1, kept in the owner's notes; summarised in [CLAUDE.md](../CLAUDE.md)).
- **One complete app.** Everything useful that Tella does is built into this app, learning from Tella's code (MIT). Users never need a second app for the same job.
- **Interoperable.** The app works through what people already use: SMS in v1, then WhatsApp, Signal and Telegram; the user's own cloud drive; plain web links that open in any browser.
- **Nothing of the user's leaves the phone unless the user turns it on.** The exceptions, all opt-in, are (a) uploads to the user's own cloud account; (b) live location while sharing is on, with the silence alarm's check-ins (section 5.7); and (c) alerts to trusted contacts who have Saakshi, which pass through our server encrypted so that only the contact's phone can read them (section 5.6).
- **Backups are the user's choice** (decided 20 Oct 2026). The user decides whether their files and documents are backed up and where: kept on the phone only, or copied to a cloud service of their own, such as Google Drive or iCloud. Either way, nothing comes to us. So the app starts local-only and backs nothing up, the phone's automatic backups included, until the user chooses a destination.
- **Law from statutes and judgments only**, each card with its pinpoint, reviewed by Aayush before release. The app never tells a user they have a right the law doesn't give them.
- **Self-protection only.** Nothing that helps anyone attack, injure or obstruct.
- **Modular.** Each module ships, waits or is swapped on its own.
- **Survives a block.** Every release is published with its SHA-256 checksum and signing fingerprint, on more than one host.

## 3. Platforms and release

- **Native apps only**, iPhone and Android, built from one Expo (React Native) codebase. No web version.
- **Android:** a signed APK on GitHub Releases and mirrors, from day 1. Google Play once the new account clears its 14-day closed test and review.
- **iPhone:** TestFlight public link (up to 10,000 people) as soon as Apple's beta review passes; App Store review submitted at the same time.
- **Languages:** English and Hindi for the whole app (every button, menu and screen, and all content). Built for more languages from day 1.

## 4. Evidence

**E1. Evidence camera with fingerprint.** Photo and video recorded inside the app. In v1:
- each file's SHA-256 hash is computed when it closes;
- a record beside it holds the hash, time, GPS position and accuracy, device make and model, and app version;
- the record is signed with a key held in the phone's security chip, with key attestation showing it came from the genuine app on an untampered phone;
- a video runs from start to stop as **one file**, straight from the camera, with one fingerprint and one signed record. That one file is what is identified, fingerprinted, played, shared and certified. Each record also carries the previous record's hash, so a session's files are chained and nothing can be added or removed unnoticed;
- the recording format is chosen so that a video cut off suddenly (the phone forced off, the app crashing) stays playable up to the moment it stopped. Such a file is fingerprinted and signed when the app next opens, and its record says the recording was interrupted. The build cost of this format on each phone is checked and reported before it is built;
- **Android videos (decided 22 Oct).** On Android the original is an MPEG-TS file (`.ts`), exactly as it came from the camera, and it stays the evidence: the export bundle and the certificate always use it. When the user plays or shares an Android video, the app uses an MP4 copy made without re-encoding (a remux), labelled in the app as a copy (from fix round 1, group 9, sharing always sends the copy; the original goes in the bundle). The copy has its own signed record naming the original's SHA-256 and the method;
- **battery while recording (owner, 6 Nov 2026, replacing the 3% stop-and-save of 21–22 Oct).** The app warns at 10% and 5%. The **evidence camera never stops by itself**: it has warnings only. Body-cam and Pocket recording change at 5% (below), because their formats survive a cut-off and their files are proven up to the last checkpoint.
- **Storage (owner, 10 Nov 2026), in two stages.** Body-cam and Pocket recording are made for long recordings nobody is watching, so the app manages the phone's room for them.
  - **Stage one (with the repairs):**
    - **A safety floor,** fixed and not a setting (about 300 MB; the builder confirms the figure). Saakshi never records into it, so the signed records can always be written. At the floor everything stops.
    - **A "keep free" amount** the user sets: how much of the phone to leave for everything else. It starts at **5 GB**. **Proposed:** 5 GB or a tenth of the phone's storage, whichever is smaller, so that a small phone can still record.
    - **What the user is told:** the first time they open body-cam or Pocket recording, and always under Settings → Storage: that these are made for long recordings; roughly how much room an hour of video and an hour of sound take; and what happens when the keep-free amount is reached.
    - **Always shown:** on each Start screen, how long the free room allows; warnings as it runs low; in Settings, how much Saakshi's recordings take.
    - **At the keep-free amount, body-cam drops to sound only** (on unless the user switches it off), so a recording that would have stopped carries on for hours. Then the recording **stops cleanly**, its file closed and signed with the end reason `storage-full` (a bundle-format addition).
    - **"My phone is being taken" records past the keep-free amount,** down to the safety floor.
  - **Stage two (with cloud copies, E7):** making room by removing recordings that are safely in the user's cloud, oldest first, under four rules: only a recording whose every byte and signed record is confirmed in the cloud against the cloud's own fingerprint of the file; the signed records stay on the phone and only the media file goes, with the list saying where it now is; the removal is itself a signed entry in the chain; never the recording in progress, one the user marked to keep, or one with a certificate made. **It is switched on only after the owner's research** on whether the cloud copy stands as well in court (docs/research/law.md, item 8). Until then the app makes no claim either way.

- **Front and back camera, and zoom (owner, 5 Nov 2026, test round 1).** A switch for the front and back camera, for photos and video (not during a video). Pinch to zoom, and quick buttons for 0.5×, 1× and 2× where the phone has those lenses or reaches that zoom. Switching camera during a video, and recording front and back at once, are researched and await the owner's decision (handoff/fix-round-1.md, group 4).

Physical damage to the phone during a recording is not solved for in v1.

- **Time and place on the picture (owner, 10 Nov 2026; Proposed, awaiting his decision).** As built, nothing is drawn on a photo or video: the time and position are in the signed record, and for body-cam and Pocket recording in a signed checkpoint about every 10 seconds. The owner wants the time and place visible on the picture, as a user setting, with the app recommending a choice from what the stamp does to the proofs. What it does: the fingerprint and signature cover the file as recorded, stamp included, so the proofs stand; the stamp itself proves nothing, being text drawn from the same clock and position as the signed record; it is permanent, covers part of the picture, and shows the user's location on every copy. Proposed:
  - **a stamped copy when sharing** (recommended): the time, position and accuracy drawn on a copy from the signed records, labelled as a copy, with its own signed record naming the original's hash, as for the MP4 copy;
  - **a setting to stamp the original as it is recorded**, off by default, with that explanation beside it.

  New feature code: it waits behind the repairs. Rights prompts stay off the picture in every case (E6).

**Before the public release (owner, 10 Nov 2026):** motion readings (accelerometer and gyroscope) in a signed file beside each recording. In v1.1, C2PA Content Credentials and compass and network readings are added. The aim is to make a claim that a recording is AI-generated implausible and to put the burden on whoever makes it; nothing makes a recording unquestionable.

**E2. Witness message.** One tap sends the hash, time and place by SMS to the user's chosen contacts.
- **What it says (test round 1, 5 Nov 2026).** The message identifies the recording and is easy for a person to read and for software to read later: a format tag and version, the record's name, its start and end times in IST and its length, the place with a map link, each file's SHA-256 (or the chain head and a count when there are many), and the app version. It goes to the contacts ticked for witness messages, and is kept short enough to send. The same labelled times appear in the app, the message, the bundle's name and the certificate's hash report. Format: docs/spec/evidence-bundle.md, section 9 (v1).

**E3. Public timestamp.** When the phone next has internet, each hash is stamped through OpenTimestamps, implemented against its public calendar servers. The official clients are LGPL-3.0, so we write our own rather than bundle theirs.
- **Brought forward (owner, 10 Nov 2026): before the public release,** together with a **"not earlier than" anchor**: a value published by an outside source shortly before the recording, put into the recording's first signed record, showing that the record was not made before it. The timestamp shows a record existed no later than a time; the anchor shows it did not exist earlier. Which source is used is settled in the design.
- **Several proofs, each saying what it shows (owner, 10 Nov 2026).** The app, the bundle's README and the checking tool describe a bundle as a set of separate proofs (fingerprint, signature and chain; the key check; checkpoints; witness messages; time proofs; motion readings), each stating exactly what it shows and what it does not. Nothing is described as "unimpeachable" or beyond question.
- **The key check before the beta (owner, 10 Nov 2026).** The checking tool verifies each phone's key attestation. Until it does, the README and the tool say plainly what "OK" covers.

**E4. BSA s.63 certificate.** For each recording, Part A of the certificate in the Schedule is pre-filled: device type Mobile, make and model, hash value and algorithm (SHA256), with the hash report attached. The user adds name, address and IMEI (the screen shows how: *#06#) and signs. The PDF states that s.63(4)(c) also requires Part B signed by an expert. The form text is checked against the central Gazette before release. The certificate is printed in English; its help text on screen is in English and Hindi.
- **One profile per phone (decided 5 Nov 2026, test round 1).** The details for Part A are kept once, in Settings → "Your details for certificates": the person who owns, maintains, manages or operates the phone, with their relation and that person's name, address, IMEI(s), colour, serial number and the ownership boxes, on the phone only. There is no per-certificate override: anyone else changes the profile first. Making a certificate shows no form: if the profile is incomplete, the app says so and opens it; if it is complete, it says whom Part A is for and makes it with one tap. Existing certificates are unchanged, and the form's wording is not changed by this.

**E5. Evidence locker and export.** Every recording with its status (hash checked, witness sent, timestamped, uploaded, certificate made). Export a bundle (original file, signed record, timestamp proof, certificate, hash report) to a folder the user picks once, or through the share sheet. **Ordinary delete:** the user deletes one recording session at a time, after a confirmation, which removes its media, records and certificate. Quick delete (E9) stays held back.
- **Records list and playback (owner, 5 Nov 2026, test round 1).** Each record shows what it is (Photo, Video, Body-cam, Pocket recording), a picture for photos and videos, its start time and its length. A photo opens full screen; sound files play in the app.
- **A body-cam or Pocket-recording recording is one recording (decided 5 Nov 2026).** Its record has a single player that plays its files end to end, with sound, and shows the total length; the files stay listed as the evidence. Where a record has more than one video file, the app makes a joined MP4 copy for sharing, without re-encoding where possible, labelled as a copy, with its own signed record listing the SHA-256 of every source file. (Built so, for the owner to confirm: nothing plays while the app is recording, so the recording doesn't pick the playback up.)
- **Export (owner, 5 Nov 2026, test round 1).** Every record has two clear actions. **"Share video"** (or "Share photo") sends a playable file through the share sheet, to WhatsApp, Instagram, YouTube, Mail and so on: on iPhone the original, on Android the MP4 copy; for a body-cam record with several video files, the joined copy. (Built so, for the owner to confirm: a Pocket-recording or other sound-only record's button is "Share sound", and an evidence-camera record with several photos or videos shares each from its own card.) **"Export evidence bundle"** saves the full ZIP to a default folder: the user picks it once (iPhone: the document picker, kept with a security-scoped bookmark; Android: a Storage Access Framework folder with a persistable permission), and later exports go there with one tap, with "Change folder" and the share sheet still available. The bundle, its folders and its files have names a person can read, such as `Saakshi 2026-11-05 10-40 IST Body-cam.zip` holding `Original files/2026-11-05 10-40-12 IST video 1.mp4`; machine identifiers stay in `manifest.json` (bundle format 0.8). Its README.txt explains, in English and Hindi, for someone with no technical background, what each file and folder is, why it is there, and how a lawyer or expert checks the bundle.

**E6. Rights prompts while recording.** Short on-screen prompts of what to say, such as asking for the grounds of arrest in writing. Drawn on screen only, never burned into the video.

**E7. Copies to the user's cloud.** The user connects their own cloud account, and each finished file or segment uploads when there is signal. Links can be sent to emergency contacts.
- **Any cloud service the owner designates (owner, 9 Nov 2026).** The upload side is built so that a service can be added without changing the recorders or the upload queue. **Round 2 builds Google Drive and iCloud Drive.** Google Drive uses Drive's narrowest permission (only files the app creates); the owner's one-time setup is a Google Cloud project, shared with Android notifications. iCloud Drive is for iPhone only and uses the phone's own Apple account, so there is no sign-in in Saakshi; the owner's one-time setup is an iCloud container (BUILD_PLAN section 5). Other services follow as the owner designates them.
- **Upload parts lengthen as the recording goes on (owner's design, 6 Nov 2026).** A recording is uploaded in byte ranges that start and end on checkpoints: **10-second parts for the first minute, then 30-second parts for the next five minutes, then one-minute parts.** The reason: someone who has not switched the phone off in the first minutes has probably not thought of it, so the early minutes are the ones most worth getting off the phone at once. The parts still rejoin byte for byte (section 4, body-cam, upload parts). **No live audio streaming.** Built so: body-cam uses the same schedule, replacing the 5 Nov "a minute or two".
- **Saving mode** (below, low battery): uploads go in the same bursts as the location updates.
- Whether the on-phone copy is encrypted is the user's choice.
- The app tells the user that cloud copies can be obtained from the provider through legal process, so the feature is not for private content.

**E8. Pocket recording** (was bug mode; renamed by the owner, 6 Nov 2026, and moved to the **Record** page). Sound only, with the phone in a pocket or bag: think of it as a sound-only body-cam. "My phone is being taken" (section 5.4) uses the same recorder. The phone becomes a voice recorder:
- **one continuous file, with checkpoints (owner, 6 Nov 2026, fix round 1, as for body-cam).** The sound is saved as one file from Start to Stop, in a format that survives a sudden cut-off (AAC in ADTS framing, `.aac`, on both phones; on iPhone the app's own cut-off-safe writer, which replaced the `.m4a` pieces). About every 10 seconds, while the file is being written, the app signs a checkpoint into the recording's chain: the bytes written so far and their SHA-256, from a running hash, never re-reading the file. A clean stop gives the file its usual record, which must agree with the last checkpoint; a recording cut off is proven up to its last checkpoint and plays up to the cut. A new file starts only as a fail-safe (the microphone stopped and came back, for example after a phone call, or a file could not be written). It was saved in fixed pieces of 1–3 minutes until this decision;
- the latest checkpoint's hash is sent to contacts, and the recording is uploaded to the user's cloud in upload parts as it is made (byte ranges ending on checkpoints, as for body-cam), with its link shared with contacts. Parts made without signal upload as soon as it returns. This continues until the battery runs out;
- the hash sent to contacts is rationed: at most one witness message every 10 minutes, so Pocket recording can't use up the SMS the user may need for an SOS. Each message carries the latest checkpoint's hash; each record carries the previous record's hash, so the hash sent vouches for everything recorded before it (owner's review of R2; checkpoints from 6 Nov 2026);
- **no 3% auto-save (owner, 6 Nov 2026, closing the open question of fix round 1).** At 5% battery the file is closed cleanly and a new one continues until the phone dies (below, low battery);
- recording continues with the screen locked;
- on iPhone, Apple shows an orange dot and, in Pocket recording, a Live Activity while recording, which is acceptable. In "My phone is being taken" Saakshi's own Live Activity is dropped (section 5.4); the orange dot remains.

**Body-cam mode (B1–B4), R1.** The phone is worn on the chest, round the neck or clipped to clothing, and records video continuously, so the user's hands stay free in a crowd. On both iPhone and Android:
- **Start:** one button. The screen goes dark at minimum brightness and touch is locked; recording carries on. The app prompts the user to turn on Battery Saver or Low Power Mode.
- **A clean start before the screen goes dark (owner, 10 Nov 2026).** Starting body-cam is not an emergency, so nothing is retried at Start: after the button, the screen stays lit on a short checklist and goes dark only when recording is confirmed: picture arriving from the camera, sound arriving from the microphone, the file growing on storage with room to record, the first record signed, and on Android the recording notice up. If anything fails, the screen stays lit and says what failed. **Proposed, awaiting the owner:** a position is shown as found or not yet found, but is not a condition for going dark, since a first fix can take a minute or more indoors.
- **A recorder that fails part-way (owner, 10 Nov 2026).** On Android, where the video recorder is the app's own code, a failed or stalled recorder is noticed and video restarts by itself into a new file of the same recording, as on iPhone. There is **no limit on restarts** (owner). **Proposed, awaiting the owner:** attempts at widening gaps for as long as the session runs, sound recording throughout, and a vibration so the wearer knows.
- **Unlock (decided 5 Nov 2026, test round 1):** pressing **volume-up twice** unlocks the screen, and no other button does. (It was volume-down; on iPhone, Apple's button API sends volume-down, the Camera Control, the Action button and AirPods clicks as one kind of event that can't be told apart, and only volume-up separately, so the owner chose volume-up for both platforms.) Touching the locked screen shows only "Screen locked. Use your unlock buttons." without naming them; the buttons are taught in the chest-mount guide (G4) and by a practice step.
- **Practice step (decided 5 Nov 2026, test round 1):** in place of an "I know how to unlock it" tick, the start screen asks the user to press volume-up twice, and Start becomes available only once they have done it. A short reminder stays on the start screen, and the practice can be repeated.
- **Video stops only when iOS stops the camera (5 Nov 2026, test round 1).** On iPhone, video carries on while the app is only covered or inactive (Notification Center, Control Center), and stops only when iOS actually interrupts the camera; the record gives iOS's reason. Pressing the side button locks the phone, which stops video (an iOS limit) while sound carries on, and the record says so in plain words.
- **Saving: one continuous file, with checkpoints (decided 5 Nov 2026, test round 1).** A body-cam recording is saved the way the evidence camera saves video: one continuous file from Start to Stop, with its sound. Thirty one-minute files for a thirty-minute recording is unmanageable, so splitting is only a fail-safe. On iPhone, where video has to stop while Saakshi is in the background, leaving and coming back starts a new file in the same record, and a sound-only file covers only the time video couldn't record. While a file is being written, about every 10 seconds (in step with the file's own fragments), the app signs a checkpoint into the session's chain: the bytes written so far and their SHA-256, from a running hash, never re-reading the file. A clean stop gives the file its usual record, which must agree with the last checkpoint; a recording cut off is proven up to its last checkpoint and plays up to the cut.
- **Upload parts (decided 5 Nov 2026, for E7; schedule from 6 Nov 2026).** Parts exist only to get footage off the phone during the recording. Each is a byte range of the file that starts and ends on checkpoints; joined in order they are the original byte for byte, and the bytes up to any part match that checkpoint's signed SHA-256. Their lengths follow E7's schedule (10 seconds, then 30 seconds, then a minute) and are settings, not constants. Whether a copy rebuilt from uploaded parts is primary or secondary evidence is an open research question (docs/research/law.md, item 8); nothing in the app may claim either until it is answered.
- **Quality:** 720p by default; the user can raise it.
- **Calls, messages and notifications keep working.** On Android, recording continues with the screen off through a foreground service while the user takes calls and uses other apps. On iPhone, Apple allows video only while the app is on screen: before the user leaves the app, it warns that video will stop; if they leave anyway, sound keeps recording, and video restarts when they return. Every gap is logged in the record.
- **Video and sound in the same file (owner, 5 Nov 2026, test round 1).** As with the evidence camera, body-cam video is recorded with its sound in the same file. On iPhone, a separate sound-only recording runs only while video can't (the app in the background, the phone locked) and hands back to video with sound when the user returns, with the gap kept as small as possible.
- **One record from Start to Stop (owner, 5 Nov 2026, test round 1).** While body-cam records, nothing navigates away from its screen: not the back swipe on iPhone, not the back button on Android. One body-cam session stays one record from Start to Stop, including when the user leaves the app and comes back.
- **Android notice (decided 22 Oct).** On Android 13 and later, the first time body-cam mode starts, the app asks for permission to show notifications, so the foreground-service notice with its Stop button appears. If the user refuses, recording carries on, and the app says where to find the running service (Active apps, at the bottom of the notification shade).

**Low battery (owner, 6 Nov 2026).** At **5%** battery, in **Pocket recording** (and so in "My phone is being taken") and in **body-cam**:
- the current file closes cleanly with the end reason `low-battery`, and a **new file continues** until the phone dies;
- **saving mode**: location every 5 minutes, and uploads in the same bursts, with positions at full accuracy (owner, 9 Nov 2026; to be revisited after a phone test shows what a coarser position would save); the contacts are told "battery at 5%, location now every 5 minutes" (owner, 9 Nov 2026): by text where the phone can send one without a tap (the Android APK now, and the Play Store build once Google grants the SMS permission), and by notification to contacts who have Saakshi (Part 3). No text goes from an iPhone, which lets no app send one without a tap; the live page shows the warning for everyone;
- **body-cam's new file uses less power** (owner, 9 Nov 2026): on iPhone, 480p at 15 frames a second, made in the file writer without touching the camera; on Android, the same picture size at 15 frames a second and a lower data rate, so the camera is never rebuilt in the middle of a recording;
- the **evidence camera never stops by itself**: warnings at 10% and 5% only.
This replaces the 3% stop-and-save of 21–22 Oct for every mode. The bundle format records the handover (bundle spec 0.9).

**E9 (v1.1). Vault, disguised icon, quick lock**, learning from Tella. Quick delete of evidence is held back pending Aayush's decision.

## 5. SOS, Pocket recording and "My phone is being taken"

> Rewritten on 6 Nov 2026 (round 2), from the owner's decisions after he tested the SOS page on his iPhone. It replaces R1 and R2's SOS-tab layout, the 3-digit code pad and confiscation mode. Decisions are marked "owner, 6 Nov 2026". Detail the review session has filled in is marked "built so", for the owner to confirm. The work is in [docs/briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md).

### 5.1 The SOS page: three swipes

The SOS page has three controls, each a **swipe** like Apple's slide controls, so that a full swipe cannot happen by accident (owner, 6 Nov 2026):

1. **Call 112.** Dials 112. Saakshi is not an emergency service and never says so.
2. **I need help.** Alerts the user's trusted contacts (below).
3. **My phone is being taken.** Starts the protections for a phone that is about to leave the user's hands (section 5.4). It replaces confiscation mode.

**How far a swipe must go** (owner's instruction, 9 Nov 2026: natural to use, still deliberate). Apple's slide-to-unlock, as its patent describes it, completes when the knob is dragged to an unlock region at the end of its channel, and springs back if released short of it. Saakshi follows that, with a region a hurried thumb can reach: the swipe counts when the handle is released past about **85%** of its track, or when it reaches the end; released short of that, it springs back. The phone gives a light tap (haptic) as the handle enters the region. A quick flick that doesn't carry the handle there does nothing.

With a screen reader on, each swipe can be done by activating it and confirming (built so; a person who can't swipe must not be shut out).

**Share my location** is the fourth situation action: live location only, with a calm message, not an alert (owner, 6 Nov 2026). Built so: a plain button under the swipes, since it is not an alert and should be easy to start.

**The quick trigger** (Action Button, Back Tap, and Lock Screen and Control Center controls on iPhone; a home-screen widget and a notification on Android) **opens this swipe screen**. There is no code pad to trigger (owner, 6 Nov 2026). On iPhone, opening from a locked phone may ask for the phone's passcode first.

### 5.2 What each action does

- **I need help.** One alert to the people ticked for SOS alerts. It carries the time, the **battery level when it is 20% or less**, the **live-location link** and the **current-location map link** (Google Maps), and live location starts, for the length set in Settings (default **4 hours**).
- **The alert goes at once (owner, 10 Nov 2026).** "I need help" and "My phone is being taken" send the alert without waiting for the live link: it carries the time and the map link, and the live link follows in a second message as soon as there is one. (Until the repairs it waits up to 8 seconds for the link.)
- **Share my location.** Live location only, to the people ticked for live location. The message is calm, for example "I'm sharing my location with you", with the link, and the battery level when it is 20% or less. It is not worded or sent as an alert.
- **My phone is being taken.** Section 5.4.
- **The battery level is sent and shown only when it is 20% or less** (owner, 9 Nov 2026, narrowing 6 Nov). Above that, or when the phone can't read it, the phone leaves it out of alerts, messages and location updates, so nothing unneeded leaves the phone.
- The feature is worded as alerting trusted contacts, never as an emergency service. 112 stays one swipe away.

### 5.3 One secret code

- **One secret code of 4 digits**, set in Settings, used to **turn off anything that was turned on**: body-cam, "My phone is being taken", live location and Pocket recording (owner, 6 Nov 2026). Nothing else in the app uses a code.
- **Waits get longer after each wrong try** (owner). Built so: two wrong tries cost nothing; then 30 seconds, 1, 2, 5, 15, 30 minutes, and 1 hour from there. The count survives closing the app and restarting the phone. The code is kept only as a salted hash in the phone's secure storage.
  - **The waits stop following the phone's clock when the silence alarm is built** (owner, 10 Nov 2026, changing 9 Nov): they are counted on the phone's time since restart, which a user cannot set. Until then they follow the clock, as built.
- **A forgotten code is reset with the phone's own passcode, and only the passcode** (owner; no face or fingerprint, owner, 9 Nov 2026). Built so: only while nothing is running, because whoever holds the phone and its passcode could otherwise reset the code and switch off "My phone is being taken". While something is running, the code screen offers no reset.
- **A phone with no passcode gets a recovery code** (owner, 9 Nov 2026). Setting the secret code on a phone with no screen lock, or on Android 7 to 10 (which can't ask for the screen lock without also taking a fingerprint or face; owner, 9 Nov 2026), also sets up a recovery code, shown once, for the user to keep away from the phone. It resets the secret code under the same rules as the passcode: only while nothing is running, and wrong tries count towards the waits. Nothing is sent anywhere.
- **No Stop control outside the app's code screen** (owner, 6 Nov 2026). Every Stop in the app opens the code screen; Android's body-cam notification loses its Stop button.
- Built so: obviously guessable codes (one digit repeated, straight runs) are refused with a plain reason.

### 5.4 "My phone is being taken"

One swipe starts everything at once (owner, 6 Nov 2026):

- **the alert** to the people ticked for SOS alerts, with both links (and the battery level when it is 20% or less);
- **live location until the battery dies.** Built so: the share has no fixed end; it stays alive while the phone checks in, and the server deletes it a week after the last check-in;
- **Pocket recording with uploads** (section 4, E8 and E7), in upload parts that lengthen as the recording goes on (section 4, E7);
- **the low-battery handover** (section 4);
- **the silence alarm** (section 5.7);
- **locking the phone's screen** (owner, 9 Nov 2026), so that force-quitting or deleting Saakshi needs the phone's passcode:
  - **Android:** if the user has switched it on in advance, Saakshi locks the screen at once. It uses Android's device-admin permission with the force-lock policy only (no wipe, nothing else), offered as a plain opt-in in Settings and the first-open walkthrough, and switched off from Saakshi's Settings as easily as it was switched on. While it is on, Android asks for it to be switched off before Saakshi can be deleted.
  - **iPhone, and Android without it:** no app can lock the screen, so Saakshi shows, large and first, "Now lock your phone" with which button to press.

- **The lock is immediate (owner, 10 Nov 2026).** It does not wait for location to be shared or for texts to be confirmed sent. Built so, from the repairs: the phone's own location updates start first, the alert is handed to the phone, the screen locks, and the share is then made on the server with the positions held meanwhile. (An Android app cannot start location updates once it is off screen, which is why they start before the lock.) Group 1.7's lock, which waits up to 20 seconds, is replaced.
- **The microphone is essential (owner, 10 Nov 2026).** A sound recording that never starts makes the mode meaningless. **Proposed, awaiting the owner:** the mode cannot be armed without the microphone (the permission is asked in advance, and the SOS page shows whether the mode is ready); at the moment, the microphone is retried for about two seconds before the lock; the lock then happens regardless, and the microphone is retried behind the locked screen. The alternative is a lock that waits until sound is recording.
- **After the app is killed and reopened (owner, 10 Nov 2026),** the mode restarts by itself whatever the phone allows, without a tap. Setup takes the user to their phone's battery setting for Saakshi, by maker, so that the phone is less likely to stop it.
- **After Saakshi's lock on Android, the next unlock needs the PIN, pattern or password** according to Android's source. The app says so only once a phone test confirms it (owner, 10 Nov 2026).


It **cannot be stopped without the secret code**. In this mode Saakshi's own Lock Screen Live Activity is dropped, so the locked screen shows less (owner).

**What this does and does not promise.** "Cannot be stopped" means it cannot be stopped inside Saakshi without the code. The phone's own controls remain: someone can force-quit the app, switch the phone off or put it in airplane mode, and iPhone stops recording and location when an app is force-quit. That is what the silence alarm is for. The app must never tell the user that recording can't be stopped by any means; its wording says it can only be stopped in Saakshi with the code.

### 5.5 Trusted contacts and how each is reached

**S1. Trusted contacts.** One list, stored only on the phone, with three ticks per person (decided 5 Nov 2026): SOS alerts, live location, witness messages, all ticked by default. Every message fills in the people ticked for it; the user never types a recipient at the moment of sending. Moved to Settings (owner, 6 Nov 2026).

**How each person is reached (owner, 6 Nov 2026).** Each trusted contact has a method:
- **SMS** (the default; works without data);
- **the Saakshi app** (they have Saakshi; section 5.6);
- **Telegram** and **email** (from the **user's own** account, Gmail first, never a Saakshi mailbox): **after round 2**.

Round 2 builds SMS and the Saakshi app. After it: Telegram, email, a phone test of whether an iPhone Shortcut can send the SMS with no tap, and Google Play's emergency-SMS permission. Google's review of email sending and the Play SMS application go on the release checklist as approvals to start early.

**S2. SOS sends itself on Android.** In the Android APK, SMS goes out with no tap. The Play build keeps tap-to-send until Play approves the emergency-alert exception: the owner applies under "Apps that send SMS alerts in emergency situations" so that the Play version also sends by itself (owner, 6 Nov 2026). On iPhone the user taps Send once, until the Shortcut test shows otherwise. **A phone with no SIM set for texts (owner, 10 Nov 2026):** many phones in India hold two SIMs and ask each time which to use. Saakshi detects that no SIM is set for texts and guides the user to set one, in setup and on the SOS page; it asks for no new permission.

**S3. Live location by link.** Contacts get a web link that opens in any browser, so they need no app. A small server of ours holds the location only while sharing is on and deletes it when sharing ends. The viewer page shows the battery level when it is 20% or less, and (section 5.7) the silence warning. **The map on the page stays (owner, 10 Nov 2026):** it is an OpenStreetMap frame, which receives the position being viewed, and the privacy policy says so.

**S4. Quick trigger.** Section 5.1.

### 5.6 Saakshi-to-Saakshi (round 2; the owner will test it at the round's end)

- Contacts who have Saakshi get alerts **in the app**, not by SMS.
- **Pairing without accounts**, for example by a QR code that each phone shows and the other scans. Nobody signs up, and we hold no list of users.
- Alerts reach the contact's phone as a **notification through our server** (Apple's push service and Google's notification service). The alert's content is **encrypted so that only the contact's phone can read it**; the notification itself carries nothing readable. The owner's one-time setup is the Apple push key and the Google Cloud project (BUILD_PLAN section 5).
- **Received-alerts page.** Who has alerted you; their locations with times on a map (live, or the last five to ten); and the link to their recordings. **No paid maps** (owner, 9 Nov 2026): the map in the app is free and open source (MapLibre, with OpenFreeMap's free public tiles, made from OpenStreetMap data), with "Open in Maps" beside it.
- Testing needs a second phone with the TestFlight build (a friend).
- The protocol is written down before it is built: `docs/spec/alerts.md`, by the Part 3 builder, reviewed before any code.

### 5.7 The silence alarm

While "My phone is being taken" (and any location share) is on, the phone checks in with our server (owner, 6 Nov 2026). If it stops checking in for about **2 minutes**, the server warns the contacts: last location, time, battery level and the link to the recordings.
- It fires on switch-off, airplane mode, a signal-blocking pouch or a broken phone.
- **Saakshi-app contacts** get a notification. **SMS contacts** see the warning on the live-location page (they get no text: our server sends no SMS); Telegram and email contacts get it once those exist.
- Built so: the check-in is its own heartbeat, not a location update, since a phone standing still sends no new position. The warning says the phone has stopped reporting, not that anything has happened to the user, and a "reporting again" message follows when it comes back, so that a tunnel or a flat spot in the signal does not read as an emergency.
- **Start sharing before anything happens.** The guide and the walkthrough tell users to switch on Share my location for risky stretches (walking home late, cabs, protests), so the silence alarm covers them without a swipe.

### 5.8 Settings

Settings holds (owner, 6 Nov 2026): the trusted contacts with each one's way of being reached; the live-location length (default **4 hours**); the secret code; the quick-trigger setup; and the existing items (language, details for certificates, export folder).

### 5.9 First-open walkthrough (built last in round 2)

Five to seven pages that introduce each feature and set it up at the same time, so that no user meets a feature unset (owner, 6 Nov 2026): language; what Saakshi does; the secret code; trusted contacts and how each is reached; the phone's own protections (section 6, G5); the quick trigger; the certificate profile. Permissions are asked at the step that needs them. **"Skip for now"** is on every step. Call 112 and the camera work from the first screen.

## 6. Guides and help

**G3. Helplines.** Verified public numbers (112, ambulance, legal services authorities), plus lawyers and medics who consent to be listed. The list updates without a new app release.

**G4. Chest-mount guide.** A GoPro-style harness with a phone clamp, a no-tools lanyard method, and links to open 3D-printable mounts under their licences. The DIY methods are tested before they ship.

**G5. Digital safety and preparedness.** Turn off Face ID and fingerprint unlock before going out, and how to force passcode-only at the moment; what to leave at home; what police may ask of a phone; setting up contacts and confiscation mode in advance. Adapted from EFF Surveillance Self-Defense (CC BY).
- **Phone setup the walkthrough covers (owner, 6 Nov 2026).**
  - **Passcode only; Face ID and fingerprint off.**
  - **iPhone:** turn off Control Center on the Lock Screen (Settings → Face ID & Passcode → Allow access when locked), so airplane mode can't be switched on while the phone is locked.
  - **The phone's own Emergency SOS**, set up with the same trusted people: iPhone in India, the side button three times; Android 12 and later, the power button five or more times (Google: it does not work with Battery Saver on).
  - **iPhone: Find My**, "findable after power off" (iPhone 11 and later; reportedly up to 24 hours, from a secondary source: confirm on Apple's page before the walkthrough says so), and sharing location with a trusted person.
  - **The maker's own "require password to power off" where it exists** (reportedly Realme, Oppo and OnePlus; Samsung, Xiaomi, Vivo and Pixel to be checked). **No app can put a code on power-off** on iPhone or on Android phones whose maker doesn't offer one: only an accessibility service (banned by CLAUDE.md), rooting or a managed device could. The research is in docs/research/power-off-locks.md.
  - **Guided Access:** unproven. It is on the phone-test list, together with how it interacts with India's triple-click Emergency SOS.
- **A power-off lock is an essential safety feature that phones lack (owner, 6 Nov 2026).** At release, the release notes say so, say which phones offer it, say that we have asked Apple, Google and phone makers to add it, and tell readers how they can ask too. The requests (Apple's Feedback Assistant, Google, makers) are drafted and filed at release (release/checklist.md), not now.

**G6. Hindi.** The whole app and all its content.

**O1. Offline communication.** Briar for Android users. No mesh app is recommended for iPhone, because no audited one exists in India. Every user gets the same alternatives: agree meeting points, a check-in time and an SMS plan before going out.

**G1 (v1.1). Know your rights.** Short cards for being stopped, searched, detained or arrested, at the station, and when the phone is demanded. Each card cites its statute or judgment.

**G2 (v1.1). Physical safety.** Before, during and after; tear gas first aid is water first, with remedies labelled unproven.

**Unlawful detention** is taught as prior knowledge, read before going out:
- evading a *lawful* arrest is an offence (BNS s.262) and must not be done;
- what makes an arrest lawful, from BNSS and the judgments;
- how to free yourself when those ingredients are missing.

The card must also state the limit in BNS s.37 ([research/law.md](research/law.md)): no right of private defence against a public servant acting in good faith under colour of office, even where the act is not strictly justifiable by law, unless it reasonably causes apprehension of death or grievous hurt. Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked.

## 7. Later

- **After round 2:** contacts reached by Telegram and by email from the user's own account; the iPhone Shortcut test; Google Play's emergency-SMS permission.
- **v1.1:** E9; G1; G2; C2PA and sensor readings; WhatsApp and Signal; more cloud providers.
- **Ideas for later, not to build now (owner, 6 Nov 2026):** a second device that carries on when the phone is off (a Bluetooth tag such as an AirTag or JioTag Go, a cellular Apple Watch, or a second phone running Saakshi paired to the first). Snatch detection that starts "My phone is being taken" by itself is **not wanted** for now, and is not to be researched.
- **v2:** a request-help network for lawyers and medics, with verified volunteers, a one-hour commitment, confirmation by the person helped, and strikes for no-shows.
- **Separate companion app (parked):** offline mesh messaging.

## 8. Tech

- Expo (React Native) and TypeScript, with native modules (Kotlin and Swift) where Expo falls short: hardware-key signing, background audio, Android SMS sending, lock-screen and widget triggers, background location.
- An open, documented evidence-bundle format, so other apps and forks stay compatible.
- Supabase (Mumbai, `ap-south-1`) for the live-location server and the helpline list. It holds only active shares and deletes each one when it ends. **From round 2** it also holds, for Saakshi-to-Saakshi, encrypted alerts it cannot read and the push addresses of paired phones, and, for the silence alarm, each share's last check-in. Decisions of 20 Oct: Supabase's free plan while testing, reviewed before the public release; round 2 makes the server part of a safety feature, so the plan is reviewed before the beta (release checklist).
- **Our own web address (owner, 10 Nov 2026).** The server and the live page sit behind names on a domain the project controls, one `.org` and one `.in`, and the app carries a short list of addresses to try in order, so that a block on one host does not need a new release. Until then the app talks to a `supabase.co` address and contacts open a `github.io` page.
- No analytics, advertising or crash-reporting SDKs.
- **Licence:** MIT (decided 17 Oct 2026). Code taken from Tella keeps Horizontal's MIT notice in `THIRD_PARTY_NOTICES.md`.

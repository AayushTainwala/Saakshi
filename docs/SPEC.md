# Saakshi v1 Spec

> Every product decision for v1, each stated once, as it stands today (14 Nov 2026). This document is the master, for the review session and the builders. The owner's features-by-build table is a mirror of it, and both are updated at every change.
>
> - **Where the decisions came from:** Aayush's picks on the [V1 scope board](https://claude.ai/artifact/SApsbjwDz8sQA55CxX5fH9) and his decisions since. Who decided what, on which date, and what each decision replaced: [SPEC_CHANGELOG.md](SPEC_CHANGELOG.md).
> - **How the build is sequenced:** [BUILD_PLAN.md](BUILD_PLAN.md). **Where the build stands:** [BUILD_HANDOFF.md](BUILD_HANDOFF.md).
> - **Module codes** (E1, S4 and so on) are the scope board's. **Section numbers and codes do not change:** comments in the code cite them.
> - Comment with `[AT: ...]`.

## How to read this

Each feature ends with its **state**:

| State | Meaning |
|---|---|
| **Built** | In `main` and passing the automatic tests. Unless it says "run on a phone", it has not yet run on one. |
| **Built, run on a phone** | Also run on the owner's iPhone on 5 Nov 2026, as it then stood. The Android app has not yet run on any phone. |
| **To build** | Decided, not yet built. The brief or round that builds it is named. |
| **Later** | Decided for after the beta, for v1.1 or for v2. |

Two other marks:

- **Built so** means a detail the builder or the review session chose where the owner's decision was silent. Each one that still waits for the owner's word is listed in section 10.
- **Proposed** means the owner has not decided. Section 10 lists these too.

## 1. What it is

A free, open-source phone app that helps people in India protect themselves and their rights. It records evidence fit for court under BSA s.63; it alerts the user's own contacts with their location; it protects them when their phone is taken from them; and it teaches what to do, in English and Hindi. It is published under Aayush's own name, as a lawyer, as an app that helps people protect their rights. It is not presented as a protest app.

**Working name:** Saakshi (witness), subject to store and trademark checks. Fallback: Shamash.

## 2. Ground rules

- **Protect yourself, protect your rights.** Every feature is framed as self-preservation and protection of rights under Indian law, to life and liberty above all (the project register, section 1, kept in the owner's notes; summarised in [CLAUDE.md](../CLAUDE.md)).
- **One complete app.** Everything useful that Tella does is built into this app, learning from Tella's code (MIT). Users never need a second app for the same job.
- **Interoperable.** The app works through what people already use: SMS in v1, then WhatsApp, Signal and Telegram; the user's own cloud drive; plain web links that open in any browser.
- **Nothing of the user's leaves the phone unless the user turns it on.** The exceptions, all opt-in, are (a) uploads to the user's own cloud account; (b) live location while sharing is on, with the silence alarm's check-ins (section 5.7); and (c) alerts to trusted contacts who have Saakshi, which pass through our server encrypted so that only the contact's phone can read them (section 5.6).
- **Backups are the user's choice.** The user decides whether their files and documents are backed up and where: kept on the phone only, or copied to a cloud service of their own, such as Google Drive or iCloud. Either way, nothing comes to us. So the app starts local-only and backs nothing up, the phone's automatic backups included, until the user chooses a destination.
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

### E1. Evidence camera with fingerprint

Photo and video recorded inside the app.

- Each file's SHA-256 hash is computed when it closes.
- A record beside it holds the hash, time, GPS position and accuracy, device make and model, and app version.
- The record is signed with a key held in the phone's security chip, with key attestation showing it came from the genuine app on an untampered phone.
- A video runs from start to stop as **one file**, straight from the camera, with one fingerprint and one signed record. That one file is what is identified, fingerprinted, played, shared and certified. Each record also carries the previous record's hash, so a session's files are chained and nothing can be added or removed unnoticed.
- The recording format is chosen so that a video cut off suddenly (the phone forced off, the app crashing) stays playable up to the moment it stopped. Such a file is fingerprinted and signed when the app next opens, and its record says the recording was interrupted.
- **Android videos.** On Android the original is an MPEG-TS file (`.ts`), exactly as it came from the camera, and it stays the evidence: the export bundle and the certificate always use it. When the user plays or shares an Android video, the app uses an MP4 copy made without re-encoding (a remux), labelled in the app as a copy. Sharing always sends the copy; the original goes in the bundle. The copy has its own signed record naming the original's SHA-256 and the method.
- **Front and back camera, and zoom.** A switch for the front and back camera, for photos and video (not during a video). Pinch to zoom, and quick buttons for 0.5×, 1× and 2× where the phone has those lenses or reaches that zoom. Switching camera during a video, and recording front and back at once, are not built for now (the research is in [handoff/fix-round-1.md](handoff/fix-round-1.md), group 4).
- **The evidence camera never stops by itself for the battery.** It warns at 10% and 5%, and nothing more. What it does when the phone runs out of room is under "When a recording stops by itself", below.
- Physical damage to the phone during a recording is not solved for in v1.

*State: built, run on a phone (the camera as it stood on 5 Nov; the front and back switch and the zoom were built after that test).*

**Time and place on the picture: a stamped copy, never a stamped original.** Nothing is drawn on an original photo or video: the time and position are in the signed record, and for body-cam and Pocket recording in a signed checkpoint about every 10 seconds. When the user shares, the app offers a **stamped copy**: the time, position and accuracy drawn on a copy from the signed records, labelled as a copy, with its own signed record naming the original's hash, as for the MP4 copy. There is **no setting to stamp the original**. The reasons: a stamp adds no proof, being text drawn from the same clock and position as the signed record; on an original it would be permanent, cover part of the picture and show the user's location on every copy. Rights prompts stay off the picture in every case (E6).

*State: to build, after the repairs.*

**More proofs.** Before the public release: motion readings (accelerometer and gyroscope) in a signed file beside each recording. In v1.1, C2PA Content Credentials and compass and network readings are added. The aim is to make a claim that a recording is AI-generated implausible and to put the burden on whoever makes it; nothing makes a recording unquestionable.

*State: to build (motion readings before the public release); later (C2PA, compass and network readings).*

#### Recordings that survive a fault

The events Saakshi is built for (the phone forced off, the app killed, the storage full, the phone's key remade) must not lose a recording or make it uncheckable.

- **The recording's index cannot be wiped by a cut-off.** The index is the app's own list of a recording's files and signed records. It is written beside itself and swapped in one step, so a readable copy exists at every moment. If it is ever lost or unreadable, it is made again from the signed records, which are the truth; the record's screen then says "This recording's index was rebuilt", and what could not be brought back. *State: built.*
- **Notes that a witness message went out** are kept in a log that is only ever added to, so they survive a rebuilt index. *State: built.*
- **One file for each signing key, never written over.** Each recording is exported with the key that signed it. If the phone's key is ever remade (the usual cause: the app's files moved to a new phone, where the old key does not exist), the old key's file stays, and the next signed record says that the key changed. Recording is never refused because a key changed. *State: built.*
- **Signed records are written in one step,** like the index, so a power-off cannot leave one half-written. *State: to build ([briefs/2026-11-14-when-a-recording-stops.md](briefs/2026-11-14-when-a-recording-stops.md)).*
- **A file saved but never signed is signed when the app next opens.** At the start of every file the app writes a start note holding the start time and the position. The note is kept until the signature is written, so a file that was saved but not signed (a cut-off between saving and signing, or a key that was busy) is signed at the next open, from its note, with its true start time and position. Its record says plainly that it was signed late, and when. A late signature shows that the file has not changed since the late signing; for the time between recording and signing, body-cam and Pocket recordings have their checkpoints, and a hand-held photo or video has none. *State: to build (repair round B); it needs a new bundle-format version for the late-signing fields.*
- **A damaged recording** (its index unreadable, and no signed record to rebuild from) is still listed, as "This recording's index is damaged", with each of its files shareable. It gains one button, **"Share everything that is left"**, which makes a single ZIP of every surviving file with a short note inside saying that these files have no signed records, and why; and the page shows how much room the recording takes, beside its Delete button. **Nothing recorded is ever deleted automatically:** the app cannot know that a recording is of no use to the user. Half-written leftovers of an interrupted save are removed when the app opens. *State: built (listed, with each file shareable); to build (the ZIP button and the size, repair round B).*
- **A signing key the phone still lists but can no longer use:** what the app does is decided after it has been tried on a real phone. Until then, recording carries on, the file is saved and fingerprinted, and it is signed late as above. *State: waits for a phone test.*
- **Recordings whose key was written over** (possible only for test recordings made before the one-file-per-key repair of 10 Nov): the app makes no bundle for them and says why; their files are shared one by one. The public half of such a key can be worked out later from the recording's own signatures (each record names its key by the SHA-256 of the public key); this is not built or tested. The key's attestation cannot be recovered. *State: built (the refusal).*

### E2. Witness message

One tap sends the hash, time and place by SMS to the user's chosen contacts.

- **What it says.** The message identifies the recording and is easy for a person to read and for software to read later: a format tag and version, the record's name, its start and end times in IST and its length, the place with a map link, each file's SHA-256 (or the chain head and a count when there are many), and the app version. It goes to the contacts ticked for witness messages, and is kept short enough to send. The same labelled times appear in the app, the message, the bundle's name and the certificate's hash report. Format: [spec/evidence-bundle.md](spec/evidence-bundle.md), section 9 (v1).

*State: built.*

### E3. Public timestamp, and what a bundle proves

**Public timestamp.** When the phone next has internet, each hash is stamped through OpenTimestamps, implemented against its public calendar servers. The official clients are LGPL-3.0, so we write our own rather than bundle theirs.

- It is built **before the public release**, together with a **"not earlier than" anchor**: a value published by an outside source shortly before the recording, put into the recording's first signed record, showing that the record was not made before it. The timestamp shows a record existed no later than a time; the anchor shows it did not exist earlier. Which source is used is settled in the design.
- **Several proofs, each saying what it shows.** The app, the bundle's README and the checking tool describe a bundle as a set of separate proofs (fingerprint, signature and chain; the key check; checkpoints; witness messages; time proofs; motion readings), each stating exactly what it shows and what it does not. Nothing is described as "unimpeachable" or beyond question.
- **The key check before the beta.** The checking tool verifies each phone's key attestation. Until it does, the README and the tool say plainly what "OK" covers.

*State: to build (the key check before the beta; the timestamp, the anchor and the note on what each proof shows before the public release).*

### E4. BSA s.63 certificate

For each recording, Part A of the certificate in the Schedule is pre-filled: device type Mobile, make and model, hash value and algorithm (SHA256), with the hash report attached. The user adds name, address and IMEI (the screen shows how: *#06#) and signs. The PDF states that s.63(4)(c) also requires Part B signed by an expert. The form text is checked against the central Gazette before release. The certificate is printed in English; its help text on screen is in English and Hindi.

- **One profile per phone.** The details for Part A are kept once, in Settings → "Your details for certificates": the person who owns, maintains, manages or operates the phone, with their relation and that person's name, address, IMEI(s), colour, serial number and the ownership boxes, on the phone only. There is no per-certificate override: anyone else changes the profile first. Making a certificate shows no form: if the profile is incomplete, the app says so and opens it; if it is complete, it says whom Part A is for and makes it with one tap. Existing certificates are unchanged, and the form's wording is not changed by this.
- **The hash report's line for a file closed at low battery** reads: "closed by the app at 5% battery; recording carried on in the next file". *State: to build ([briefs/2026-11-14-when-a-recording-stops.md](briefs/2026-11-14-when-a-recording-stops.md)); today it still gives the words of the old 3% stop.*

*State: built. The form's wording matched the Gazette of India on 21 Oct 2026; the certificate carries a "DRAFT" notice until the owner signs off its text.*

### E5. Evidence locker and export

Every recording with its status (hash checked, witness sent, timestamped, uploaded, certificate made). Export a bundle (original file, signed record, timestamp proof, certificate, hash report) to a folder the user picks once, or through the share sheet. **Ordinary delete:** the user deletes one recording session at a time, after a confirmation, which removes its media, records and certificate. Quick delete (E9) stays held back.

- **Records list and playback.** Each record shows what it is (Photo, Video, Body-cam, Pocket recording), a picture for photos and videos, its start time and its length. A photo opens full screen; sound files play in the app.
- **A body-cam or Pocket-recording recording is one recording.** Its record has a single player that plays its files end to end, with sound, and shows the total length; the files stay listed as the evidence. Where a record has more than one video file, the app makes a joined MP4 copy for sharing, without re-encoding where possible, labelled as a copy, with its own signed record listing the SHA-256 of every source file.
- **Nothing plays while the app is recording,** so the recording doesn't pick the playback up.
- **Export.** Every record has two clear actions. **"Share video"** (or "Share photo") sends a playable file through the share sheet, to WhatsApp, Instagram, YouTube, Mail and so on: on iPhone the original, on Android the MP4 copy; for a body-cam record with several video files, the joined copy. **"Export evidence bundle"** saves the full ZIP to a default folder: the user picks it once (iPhone: the document picker, kept with a security-scoped bookmark; Android: a Storage Access Framework folder with a persistable permission), and later exports go there with one tap, with "Change folder" and the share sheet still available. The bundle, its folders and its files have names a person can read, such as `Saakshi 2026-11-05 10-40 IST Body-cam.zip` holding `Original files/2026-11-05 10-40-12 IST video 1.mp4`; machine identifiers stay in `manifest.json` (bundle format 0.8). Its README.txt explains, in English and Hindi, for someone with no technical background, what each file and folder is, why it is there, and how a lawyer or expert checks the bundle.
- **Built so** (section 10): a Pocket-recording or other sound-only record's button is "Share sound"; an evidence-camera record with several photos or videos shares each from its own card; the bundle's file and folder names are in English in both languages of the app.
- **The records list becomes a gallery** (section 9): the list and the viewer are redesigned before the beta, and the detail above may change with that design.

*State: built, run on a phone (the list, playback and export as they stood on 5 Nov; the redesigned list, the two export actions and the readable bundle names were built after that test).*

### E6. Rights prompts while recording

Short on-screen prompts of what to say, such as asking for the grounds of arrest in writing. Drawn on screen only, never burned into the video.

*State: built. The prompts' wording waits for the owner's review.*

### E7. Copies to the user's cloud

The user connects their own cloud account, and each finished file or segment uploads when there is signal. Links can be sent to emergency contacts.

- **Any cloud service the owner designates.** The upload side is built so that a service can be added without changing the recorders or the upload queue. **Round 2 builds Google Drive and iCloud Drive.** Google Drive uses Drive's narrowest permission (only files the app creates); the owner's one-time setup is a Google Cloud project, shared with Android notifications. iCloud Drive is for iPhone only and uses the phone's own Apple account, so there is no sign-in in Saakshi; the owner's one-time setup is an iCloud container (BUILD_PLAN section 5). Other services follow as the owner designates them.
- **Upload parts lengthen as the recording goes on.** A recording is uploaded in byte ranges that start and end on checkpoints: **10-second parts for the first minute, then 30-second parts for the next five minutes, then one-minute parts.** The reason: someone who has not switched the phone off in the first minutes has probably not thought of it, so the early minutes are the ones most worth getting off the phone at once. The lengths are settings, not constants. Body-cam and Pocket recording use the same schedule (built so, section 10). **No live audio streaming.**
- **What the parts are.** Parts exist only to get footage off the phone during the recording. Each is a byte range of the file that starts and ends on checkpoints; joined in order they are the original byte for byte, and the bytes up to any part match that checkpoint's signed SHA-256. Whether a copy rebuilt from uploaded parts is primary or secondary evidence is an open research question (docs/research/law.md, item 8); nothing in the app may claim either until it is answered.
- **Saving mode** (below, "Low battery"): uploads go in the same bursts as the location updates.
- Whether the on-phone copy is encrypted is the user's choice.
- The app tells the user that cloud copies can be obtained from the provider through legal process, so the feature is not for private content.
- **Making room from the cloud** (storage, stage two): making room by removing recordings that are safely in the user's cloud, oldest first, under four rules: only a recording whose every byte and signed record is confirmed in the cloud against the cloud's own fingerprint of the file; the signed records stay on the phone and only the media file goes, with the list saying where it now is; the removal is itself a signed entry in the chain; never the recording in progress, one the user marked to keep, or one with a certificate made. **It is switched on only after the owner's research** on whether the cloud copy stands as well in court (docs/research/law.md, item 8). Until then the app makes no claim either way.

*State: to build (round 2, Part 2; paused behind the repairs, and it needs Parts C and D of the owner's setup).*

### E8. Pocket recording

Sound only, with the phone in a pocket or bag: think of it as a sound-only body-cam. It is on the **Record** page. "My phone is being taken" (section 5.4) uses the same recorder. The phone becomes a voice recorder:

- **One continuous file, with checkpoints.** The sound is saved as one file from Start to Stop, in a format that survives a sudden cut-off (AAC in ADTS framing, `.aac`, on both phones; on iPhone the app's own cut-off-safe writer). About every 10 seconds, while the file is being written, the app signs a checkpoint into the recording's chain: the bytes written so far and their SHA-256, from a running hash, never re-reading the file. A clean stop gives the file its usual record, which must agree with the last checkpoint; a recording cut off is proven up to its last checkpoint and plays up to the cut. A new file starts only as a fail-safe (the microphone stopped and came back, for example after a phone call, or a file could not be written).
- The latest checkpoint's hash is sent to contacts, and the recording is uploaded to the user's cloud in upload parts as it is made (byte ranges ending on checkpoints, as for body-cam), with its link shared with contacts. Parts made without signal upload as soon as it returns.
- The hash sent to contacts is rationed: at most one witness message every 10 minutes, so Pocket recording can't use up the SMS the user may need for an SOS. Each message carries the latest checkpoint's hash; each record carries the previous record's hash, so the hash sent vouches for everything recorded before it.
- Recording continues with the screen locked.
- On iPhone, Apple shows an orange dot and, in Pocket recording, a Live Activity while recording, which is acceptable. In "My phone is being taken" Saakshi's own Live Activity is dropped (section 5.4); the orange dot remains.
- When it stops by itself (room, battery, a time limit) is under "When a recording stops by itself", below.

*State: built (the recorder, its checkpoints and its witness messages); to build (uploads, with E7).*

### Body-cam mode (B1–B4)

The phone is worn on the chest, round the neck or clipped to clothing, and records video continuously, so the user's hands stay free in a crowd. On both iPhone and Android:

- **Start:** one button. The screen goes dark at minimum brightness and touch is locked; recording carries on. The app prompts the user to turn on Battery Saver or Low Power Mode.
- **A clean start before the screen goes dark.** Starting body-cam is not an emergency, so nothing is retried at Start: after the button, the screen stays lit on a short checklist and goes dark only when recording is confirmed: picture arriving from the camera, sound arriving from the microphone, the file growing on storage with room to record, the first record signed, and on Android the recording notice up. If anything fails, the screen stays lit and says what failed. **A position is not a condition**: the checklist shows it as found or not yet found, and body-cam may go dark without one, since a first fix can take a minute or more indoors. *State: to build (repair round B); today the screen goes dark as soon as the recorder says it has started.*
- **A camera that keeps failing part-way** (both phones):
  1. Video breaks: sound carries on, the phone vibrates once, and video is tried again every 1 second, into a new file of the same recording.
  2. After three tries in a row that fail, or that die within 30 seconds: five long vibrations, and the dark screen lights up with "Video has stopped. Sound is still recording." and three buttons: **Keep trying video**, **Carry on with sound only**, **Stop and save**. If the phone's own screen is off, the same message appears as a notification.
  3. Until a button is tapped: sound records, **video is not tried**, and the five long vibrations repeat every minute.
  4. **Keep trying video** starts the tries again, under the same rule. **Carry on with sound only** ends the video tries; the recording continues as sound, in the same recording. **Stop and save** ends it and returns to the Record tab, where another mode can be started.

  This is the wearer's own choice after the camera has failed. It is not a step the app takes by itself: body-cam never drops to sound only to save room (below). *State: to build (repair round B). Today iPhone restarts video by itself when it can; on Android a failed recorder is not noticed.*
- **Unlock:** pressing **volume-up twice** unlocks the screen, and no other button does. (On iPhone, Apple's button API sends volume-down, the Camera Control, the Action button and AirPods clicks as one kind of event that can't be told apart, and only volume-up separately, so volume-up is the key on both platforms.) Touching the locked screen shows only "Screen locked. Use your unlock buttons." without naming them; the buttons are taught in the chest-mount guide (G4) and by a practice step.
- **Practice step:** the start screen asks the user to press volume-up twice, and Start becomes available only once they have done it. A short reminder stays on the start screen, and the practice can be repeated.
- **Video stops only when iOS stops the camera.** On iPhone, video carries on while the app is only covered or inactive (Notification Center, Control Center), and stops only when iOS actually interrupts the camera; the record gives iOS's reason. Pressing the side button locks the phone, which stops video (an iOS limit) while sound carries on, and the record says so in plain words.
- **Saving: one continuous file, with checkpoints.** A body-cam recording is saved the way the evidence camera saves video: one continuous file from Start to Stop, with its sound. Splitting is only a fail-safe. On iPhone, where video has to stop while Saakshi is in the background, leaving and coming back starts a new file in the same record, and a sound-only file covers only the time video couldn't record. While a file is being written, about every 10 seconds (in step with the file's own fragments), the app signs a checkpoint into the session's chain: the bytes written so far and their SHA-256, from a running hash, never re-reading the file. A clean stop gives the file its usual record, which must agree with the last checkpoint; a recording cut off is proven up to its last checkpoint and plays up to the cut.
- **Upload parts:** as E7.
- **Quality:** 720p by default; the user can raise it.
- **Calls, messages and notifications keep working.** On Android, recording continues with the screen off through a foreground service while the user takes calls and uses other apps. On iPhone, Apple allows video only while the app is on screen: before the user leaves the app, it warns that video will stop; if they leave anyway, sound keeps recording, and video restarts when they return. Every gap is logged in the record.
- **Video and sound in the same file.** As with the evidence camera, body-cam video is recorded with its sound in the same file. On iPhone, a separate sound-only recording runs only while video can't (the app in the background, the phone locked) and hands back to video with sound when the user returns, with the gap kept as small as possible.
- **One record from Start to Stop.** While body-cam records, nothing navigates away from its screen: not the back swipe on iPhone, not the back button on Android. One body-cam session stays one record from Start to Stop, including when the user leaves the app and comes back.
- **Android notice.** On Android 13 and later, the first time body-cam mode starts, the app asks for permission to show notifications, so the foreground-service notice appears. If the user refuses, recording carries on, and the app says where to find the running service (Active apps, at the bottom of the notification shade). The notice has no Stop button (section 5.3).

*State: built, run on a phone (body-cam on iPhone as it stood on 5 Nov; the single continuous file, the checkpoints and the volume-up unlock were built after that test). The two items marked above are to build.*

### When a recording stops by itself

Body-cam and Pocket recording are made for long recordings nobody is watching, so the app manages the phone's room, battery and time for them. Four things can stop a recording without the user: the room running out, the battery reserve, a time limit, and (for body-cam's video only) a camera that keeps failing, above.

*State of this whole part: to build ([briefs/2026-11-14-when-a-recording-stops.md](briefs/2026-11-14-when-a-recording-stops.md)), except where a line says otherwise. Until it is built, `main` holds the storage design of 10 Nov and the 5% handover alone, which [SPEC_CHANGELOG.md](SPEC_CHANGELOG.md) describes.*

#### Storage

- **A safety floor,** fixed and not a setting: **300 MB**. No video starts below it, and a running video stops at it, in every mode.
- **A last floor,** fixed and not a setting: about **50 MB** (the builder works out the figure). Photos and sound can still be made below the safety floor, with a notice that room is critically low, down to the last floor. Saakshi never records into the last floor, so the signed records can always be written. At the last floor everything stops.
- **A "keep free" amount** the user sets: how much of the phone to leave for everything else. It starts at **5 GB or a tenth of the phone's storage, whichever is smaller**, so that a small phone can still record.
- **A recording may start below the keep-free amount,** with a notice saying how much room is left and about how many minutes of this kind of recording that is.
- **A body-cam video that started above the keep-free amount stops at that amount.** One that started below it runs to the safety floor.
- **A running sound recording does not stop at the keep-free amount.** Pocket recording runs to the last floor.
- **Body-cam never drops to sound only to save room.** Body-cam continues both video and sound, and Pocket recording continues sound, until one of the limits in this part is reached.
- **The evidence camera** is held in the user's hand, so the keep-free amount does not stop it: it shows the warnings, says once when the phone is below the keep-free amount, stops a video at the safety floor, and takes photos down to the last floor (built so, section 10).
- **"My phone is being taken"** is not held by the keep-free amount: its sound recording runs to the last floor.
- **A clean stop.** A recording stopped for room is closed and signed in the ordinary way, with the end reason `storage-full`.
- **What the user is told:** the first time they open body-cam or Pocket recording, and always under Settings → Storage: that these are made for long recordings; roughly how much room an hour of video and an hour of sound take; and what happens at the keep-free amount and at the floors.
- **Always shown:** on each Start screen, how long the free room allows; warnings as it runs low; in Settings, how much Saakshi's recordings take.
- **The estimates of recording time are tuned from measurements on both phones.** The iPhone evidence camera's rate is measured from a recording, not set by Saakshi.
- **Nothing is recorded to external memory** (a memory card) for now.
- **Android's exact free-space reading** replaces the slightly generous figure the file library gives. *State: to build (repair round B).*
- **Making room from the cloud** (stage two) is under E7.

#### Battery

- **The evidence camera never stops by itself:** warnings at 10% and 5% only.
- **A battery reserve.** Body-cam and Pocket recording stop cleanly at a battery level the user sets, so that the phone is still usable afterwards. It starts at **10%**. It never stops a recording while the phone is charging.
- **"My phone is being taken" ignores the reserve** and records to the end (below, "Low battery").

#### Efficiency

Two separate switches in Settings, for body-cam. Both start switched on.

- **For the battery:** in the last **5%** of battery above the reserve, body-cam carries on in a new file that uses less power (as in "Low battery", below).
- **For storage:** in the last stretch of room before the recording would stop (**1 GB**), body-cam carries on in a new file at a lower quality, so that the room goes as far as possible. The lower quality is whatever is cleanest to build on both phones; it reuses the low-battery file.

With a switch off, body-cam records at the same quality until it stops.

#### Time limit

- Body-cam and Pocket recording each have a time limit, **off until the user sets one**, of any number of minutes. At the limit the recording stops cleanly and is saved, so that the user can start another.
- **Warning:** two pulses of vibration at one minute before the end, then a stronger, continuous vibration for the last ten seconds.
- **"My phone is being taken" ignores the time limit.**

#### Low battery

At **5%** battery, in a recording that the battery reserve does not hold ("My phone is being taken"; and, built so, a body-cam or Pocket recording that the user started when the battery was already below the reserve):

- the current file closes cleanly with the end reason `low-battery`, and a **new file continues** until the phone dies;
- **saving mode**: location every 5 minutes, and uploads in the same bursts, with positions at full accuracy (to be revisited after a phone test shows what a coarser position would save); the contacts are told "battery at 5%, location now every 5 minutes": by text where the phone can send one without a tap (the Android APK now, and the Play Store build once Google grants the SMS permission), and by notification to contacts who have Saakshi (Part 3). No text goes from an iPhone, which lets no app send one without a tap; the live page shows the warning for everyone;
- **body-cam's new file uses less power**: on iPhone, 480p at 15 frames a second, made in the file writer without touching the camera; on Android, the same picture size at 15 frames a second and a lower data rate, so the camera is never rebuilt in the middle of a recording;
- plugging the phone in ends saving mode; the file in progress carries on as it is, and the next file is at the normal quality.

The bundle format records the handover (bundle spec 0.9).

*State: built (the 5% handover, saving mode and the lower-power file, for every body-cam and Pocket recording). To build: the reserve, which stops ordinary recordings before 5%.*

### E9 (v1.1). Vault, disguised icon, quick lock

Learning from Tella. Quick delete of evidence is held back pending Aayush's decision.

*State: later.*

## 5. SOS, Pocket recording and "My phone is being taken"

> The SOS page, the secret code and "My phone is being taken" are round 2's work: [briefs/2026-11-06-round-2.md](briefs/2026-11-06-round-2.md).

### 5.1 The SOS page: three swipes

The SOS page has three controls, each a **swipe** like Apple's slide controls, so that a full swipe cannot happen by accident:

1. **Call 112.** Dials 112. Saakshi is not an emergency service and never says so.
2. **I need help.** Alerts the user's trusted contacts (below).
3. **My phone is being taken.** Starts the protections for a phone that is about to leave the user's hands (section 5.4).

**How far a swipe must go** (natural to use, still deliberate). Apple's slide-to-unlock, as its patent describes it, completes when the knob is dragged to an unlock region at the end of its channel, and springs back if released short of it. Saakshi follows that, with a region a hurried thumb can reach: the swipe counts when the handle is released past about **85%** of its track, or when it reaches the end; released short of that, it springs back. The phone gives a light tap (haptic) as the handle enters the region. A quick flick that doesn't carry the handle there does nothing.

With a screen reader on, each swipe can be done by activating it and confirming (built so; a person who can't swipe must not be shut out).

**Share my location** is the fourth situation action: live location only, with a calm message, not an alert. Built so: a plain button under the swipes, since it is not an alert and should be easy to start.

**The quick trigger** (Action Button, Back Tap, and Lock Screen and Control Center controls on iPhone; a home-screen widget and a notification on Android) **opens this swipe screen**. There is no code pad to trigger. On iPhone, opening from a locked phone may ask for the phone's passcode first.

*State: built.*

### 5.2 What each action does

- **I need help.** One alert to the people ticked for SOS alerts. It carries the time, the **battery level when it is 20% or less**, the **live-location link** and the **current-location map link** (Google Maps), and live location starts, for the length set in Settings (default **4 hours**). It goes at once after a full swipe, with no countdown.
- **The alert goes at once.** "I need help" and "My phone is being taken" send the alert without waiting for the live link: it carries the time and the map link, and the live link follows in a second message as soon as there is one. *State: to build (repair round B); today the alert waits up to 8 seconds for the link.*
- **Share my location.** Live location only, to the people ticked for live location. The message is calm, for example "I'm sharing my location with you", with the link, and the battery level when it is 20% or less. It is not worded or sent as an alert.
- **My phone is being taken.** Section 5.4.
- **The battery level is sent and shown only when it is 20% or less.** Above that, or when the phone can't read it, the phone leaves it out of alerts, messages and location updates, so nothing unneeded leaves the phone.
- The feature is worded as alerting trusted contacts, never as an emergency service. 112 stays one swipe away.

*State: built, except the line marked.*

### 5.3 One secret code

- **One secret code of 4 digits**, set in Settings, used to **turn off anything that was turned on**: body-cam, "My phone is being taken", live location and Pocket recording. Nothing else in the app uses a code.
- **Waits get longer after each wrong try.** Built so: two wrong tries cost nothing; then 30 seconds, 1, 2, 5, 15, 30 minutes, and 1 hour from there. The count survives closing the app and restarting the phone. The code is kept only as a salted hash in the phone's secure storage.
  - **The waits stop following the phone's clock when the silence alarm is built**: they are counted on the phone's time since restart, which a user cannot set. Until then they follow the clock, as built. *State: to build (with Part 3).*
- **A forgotten code is reset with the phone's own passcode, and only the passcode** (no face or fingerprint). Built so: only while nothing is running, because whoever holds the phone and its passcode could otherwise reset the code and switch off "My phone is being taken". While something is running, the code screen offers no reset.
- **A phone with no passcode gets a recovery code.** Setting the secret code on a phone with no screen lock, or on Android 7 to 10 (which can't ask for the screen lock without also taking a fingerprint or face), also sets up a recovery code, shown once, for the user to keep away from the phone. It resets the secret code under the same rules as the passcode: only while nothing is running, and wrong tries count towards the waits. Nothing is sent anywhere.
- **No Stop control outside the app's code screen.** Every Stop in the app opens the code screen; Android's body-cam notification has no Stop button.
- **A Stop when no code is set:** the code screen asks the user to set a code first, and setting it lets the Stop go through.
- Built so: obviously guessable codes (one digit repeated, straight runs) are refused with a plain reason.

*State: built, except the line marked.*

### 5.4 "My phone is being taken"

One swipe starts everything at once:

- **the alert** to the people ticked for SOS alerts, with both links (and the battery level when it is 20% or less);
- **live location until the battery dies.** Built so: the share has no fixed end; it stays alive while the phone checks in, and the server deletes it a week after the last check-in;
- **Pocket recording with uploads** (section 4, E8 and E7), in upload parts that lengthen as the recording goes on (section 4, E7);
- **recording to the end:** it ignores the battery reserve and the time limit, is not held by the keep-free amount, and at 5% battery hands over to a new file and saving mode (section 4, "When a recording stops by itself");
- **the silence alarm** (section 5.7);
- **locking the phone's screen**, so that force-quitting or deleting Saakshi needs the phone's passcode:
  - **Android:** if the user has switched it on in advance, Saakshi locks the screen at once. It uses Android's device-admin permission with the force-lock policy only (no wipe, nothing else), offered as a plain opt-in in Settings and the first-open walkthrough, and switched off from Saakshi's Settings as easily as it was switched on. While it is on, Android asks for it to be switched off before Saakshi can be deleted.
  - **iPhone, and Android without it:** no app can lock the screen, so Saakshi shows, large and first, "Now lock your phone" with which button to press.

- **The lock is immediate.** It does not wait for location to be shared or for texts to be confirmed sent. Built so: the phone's own location updates start first, the alert is handed to the phone, the screen locks, and the share is then made on the server with the positions held meanwhile. (An Android app cannot start location updates once it is off screen, which is why they start before the lock.) *State: to build (repair round B); today's lock waits up to 20 seconds.*
- **The microphone is essential.** A sound recording that never starts makes the mode meaningless. The mode cannot be armed without the microphone (the permission is asked in advance, and the SOS page shows whether the mode is ready); at the moment, the microphone is retried for about two seconds before the lock; the lock then happens regardless, and the microphone is retried behind the locked screen. The lock never waits for sound. *State: to build (repair round B).*
- **After the app is killed and reopened,** the mode restarts by itself whatever the phone allows, without a tap. Setup takes the user to their phone's battery setting for Saakshi, by maker, so that the phone is less likely to stop it. *State: to build (repair round B).*
- **After Saakshi's lock on Android, the next unlock needs the PIN, pattern or password** according to Android's source. The app says so only once a phone test confirms it.
- **The Play listing** says that Saakshi locks the screen, and states the uninstall step openly (switch the lock off in Saakshi's Settings, or use Android's "Deactivate & uninstall"). It never presents the lock as a way to stop Saakshi being deleted.
- **If no secret code is set,** the swipe asks for one, and once it is set the mode starts at once.
- **Stopping it stops everything it runs,** including a Pocket recording or a location share that was already running before it started.
- **If its recording stops** (at the last floor, say), its screen says so. *State: to build (repair round B); today its screen still shows the recording as on.*

It **cannot be stopped without the secret code**. In this mode Saakshi's own Lock Screen Live Activity is dropped, so the locked screen shows less.

**What this does and does not promise.** "Cannot be stopped" means it cannot be stopped inside Saakshi without the code. The phone's own controls remain: someone can force-quit the app, switch the phone off or put it in airplane mode, and iPhone stops recording and location when an app is force-quit. That is what the silence alarm is for. The app must never tell the user that recording can't be stopped by any means; its wording says it can only be stopped in Saakshi with the code.

*State: built (the swipe, the alert, live location, the recording, the code on every Stop, and a lock that waits); the lines marked are to build; uploads wait for E7 and the silence alarm for Part 3.*

### 5.5 Trusted contacts and how each is reached

**S1. Trusted contacts.** One list, stored only on the phone, in Settings, with three ticks per person: SOS alerts, live location, witness messages, all ticked by default. Every message fills in the people ticked for it; the user never types a recipient at the moment of sending.

**How each person is reached.** Each trusted contact has a method:
- **SMS** (the default; works without data);
- **the Saakshi app** (they have Saakshi; section 5.6);
- **Telegram** and **email** (from the **user's own** account, Gmail first, never a Saakshi mailbox): **after round 2**.

Round 2 builds SMS and the Saakshi app. After it: Telegram, email, a phone test of whether an iPhone Shortcut can send the SMS with no tap, and Google Play's emergency-SMS permission. Google's review of email sending and the Play SMS application go on the release checklist as approvals to start early.

**S2. SOS sends itself on Android.** In the Android APK, SMS goes out with no tap. The Play build keeps tap-to-send until Play approves the emergency-alert exception: the owner applies under "Apps that send SMS alerts in emergency situations" so that the Play version also sends by itself. On iPhone the user taps Send once, until the Shortcut test shows otherwise. **A phone with no SIM set for texts:** many phones in India hold two SIMs and ask each time which to use. Saakshi detects that no SIM is set for texts and guides the user to set one, in setup and on the SOS page; it asks for no new permission. *State: to build (repair round B).*

**S3. Live location by link.** Contacts get a web link that opens in any browser, so they need no app. A small server of ours holds the location only while sharing is on and deletes it when sharing ends. The viewer page shows the battery level when it is 20% or less, and (section 5.7) the silence warning. **The map on the page stays:** it is an OpenStreetMap frame, which receives the position being viewed, and the privacy policy says so.

**S4. Quick trigger.** Section 5.1.

*State: built (the list, SMS, live location by link and the quick trigger); the Saakshi-app method is to build (Part 3); the line marked is to build.*

### 5.6 Saakshi-to-Saakshi

- Contacts who have Saakshi get alerts **in the app**, not by SMS.
- **Pairing without accounts**, for example by a QR code that each phone shows and the other scans. Nobody signs up, and we hold no list of users.
- Alerts reach the contact's phone as a **notification through our server** (Apple's push service and Google's notification service). The alert's content is **encrypted so that only the contact's phone can read it**; the notification itself carries nothing readable. The owner's one-time setup is the Apple push key and the Google Cloud project (BUILD_PLAN section 5).
- **Received-alerts page.** Who has alerted you; their locations with times on a map (live, or the last five to ten); and the link to their recordings. **No paid maps**: the map in the app is free and open source (MapLibre, with OpenFreeMap's free public tiles, made from OpenStreetMap data), with "Open in Maps" beside it.
- Testing needs a second phone with the TestFlight build (a friend).
- The protocol is written down before it is built: `docs/spec/alerts.md`, by the Part 3 builder, reviewed before any code.

*State: to build (round 2, Part 3; the protocol document first, for the owner's review).*

### 5.7 The silence alarm

While "My phone is being taken" (and any location share) is on, the phone checks in with our server. If it stops checking in for about **2 minutes**, the server warns the contacts: last location, time, battery level and the link to the recordings.
- It fires on switch-off, airplane mode, a signal-blocking pouch or a broken phone.
- **Saakshi-app contacts** get a notification. **SMS contacts** see the warning on the live-location page (they get no text: our server sends no SMS); Telegram and email contacts get it once those exist.
- Built so: the check-in is its own heartbeat, not a location update, since a phone standing still sends no new position. The warning says the phone has stopped reporting, not that anything has happened to the user, and a "reporting again" message follows when it comes back, so that a tunnel or a flat spot in the signal does not read as an emergency.
- **Start sharing before anything happens.** The guide and the walkthrough tell users to switch on Share my location for risky stretches (walking home late, cabs, protests), so the silence alarm covers them without a swipe.

*State: to build (round 2, Part 3).*

### 5.8 Settings

Settings holds: the trusted contacts with each one's way of being reached; the live-location length (default **4 hours**); the secret code; the quick-trigger setup; storage (the keep-free amount, and what recordings take); and the existing items (language, details for certificates, export folder). The battery reserve, the two efficiency switches and the time limits join it (section 4, "When a recording stops by itself").

*State: built, except the settings of that part.*

### 5.9 First-open walkthrough

Five to seven pages that introduce each feature and set it up at the same time, so that no user meets a feature unset: language; what Saakshi does; the secret code; trusted contacts and how each is reached; the phone's own protections (section 6, G5); the quick trigger; the certificate profile. Permissions are asked at the step that needs them. **"Skip for now"** is on every step. Call 112 and the camera work from the first screen.

*State: to build (round 2, Part 4, built last).*

## 6. Guides and help

**G3. Helplines.** Verified public numbers (112, ambulance, legal services authorities), plus lawyers and medics who consent to be listed. The list updates without a new app release.
- **The numbers download automatically** each time the Help tab opens, and **the list is sealed before the public release**: signed, so that a change to the repository alone cannot change the numbers on every phone.
- **The list of volunteer lawyers and medics is parked until after the beta**, with its open questions (whether a registration number is published, who collects consent and where it is kept).

*State: built (the public numbers and the automatic download); to build (the seal, before the public release); later (the lawyers and medics list).*

**G4. Chest-mount guide.** A GoPro-style harness with a phone clamp, a no-tools lanyard method, and links to open 3D-printable mounts under their licences. The DIY methods are tested before they ship.

*State: built; the DIY methods show "Not yet tested by the Saakshi team" until each is tested.*

**G5. Digital safety and preparedness.** Turn off Face ID and fingerprint unlock before going out, and how to force passcode-only at the moment; what to leave at home; what police may ask of a phone; setting up contacts and confiscation mode in advance. Adapted from EFF Surveillance Self-Defense (CC BY).
- **"What police may ask of a phone" is left out of the guide** until it has been researched from statutes and judgments. That research is done with the next on-phone review cycle, together with the research on cloud copies (docs/research/law.md, item 8).
- **Phone setup the walkthrough covers.**
  - **Passcode only; Face ID and fingerprint off.**
  - **iPhone:** turn off Control Center on the Lock Screen (Settings → Face ID & Passcode → Allow access when locked), so airplane mode can't be switched on while the phone is locked.
  - **The phone's own Emergency SOS**, set up with the same trusted people: iPhone in India, the side button three times; Android 12 and later, the power button five or more times (Google: it does not work with Battery Saver on).
  - **iPhone: Find My**, "findable after power off" (iPhone 11 and later; reportedly up to 24 hours, from a secondary source: confirm on Apple's page before the walkthrough says so), and sharing location with a trusted person.
  - **The maker's own "require password to power off" where it exists** (reportedly Realme, Oppo and OnePlus; Samsung, Xiaomi, Vivo and Pixel to be checked). **No app can put a code on power-off** on iPhone or on Android phones whose maker doesn't offer one: only an accessibility service (banned by CLAUDE.md), rooting or a managed device could. The research is in docs/research/power-off-locks.md. The walkthrough names only the settings tested on a real phone.
  - **Guided Access:** unproven. It is on the phone-test list, together with how it interacts with India's triple-click Emergency SOS.
- **A power-off lock is an essential safety feature that phones lack.** At release, the release notes say so, say which phones offer it, say that we have asked Apple, Google and phone makers to add it, and tell readers how they can ask too. The requests (Apple's Feedback Assistant, Google, makers) are drafted and filed at release (release/checklist.md), not now.

*State: built (the guide, without the police point); to build (the phone-setup pages, with the walkthrough).*

**G6. Hindi.** The whole app and all its content.

*State: built; every Hindi string waits for the owner's one wording review.*

**O1. Offline communication.** Briar for Android users. No mesh app is recommended for iPhone, because no audited one exists in India. Every user gets the same alternatives: agree meeting points, a check-in time and an SMS plan before going out.

*State: built.*

**G1 (v1.1). Know your rights.** Short cards for being stopped, searched, detained or arrested, at the station, and when the phone is demanded. Each card cites its statute or judgment.

**G2 (v1.1). Physical safety.** Before, during and after; tear gas first aid is water first, with remedies labelled unproven.

**Unlawful detention** is taught as prior knowledge, read before going out:
- evading a *lawful* arrest is an offence (BNS s.262) and must not be done;
- what makes an arrest lawful, from BNSS and the judgments;
- how to free yourself when those ingredients are missing.

The card must also state the limit in BNS s.37 ([research/law.md](research/law.md)): no right of private defence against a public servant acting in good faith under colour of office, even where the act is not strictly justifiable by law, unless it reasonably causes apprehension of death or grievous hurt. Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked.

*State: later (G1, G2 and the unlawful-detention card are v1.1; the owner decides whether they join the beta). The sentence on Explanations 1 and 2 has a question open against it (section 10).*

## 7. Later

- **After round 2:** contacts reached by Telegram and by email from the user's own account; the iPhone Shortcut test; Google Play's emergency-SMS permission.
- **After the beta:** the list of volunteer lawyers and medics (G3).
- **v1.1:** E9; G1; G2; C2PA and sensor readings; WhatsApp and Signal; more cloud providers.
- **Ideas for later, not to build now:** a second device that carries on when the phone is off (a Bluetooth tag such as an AirTag or JioTag Go, a cellular Apple Watch, or a second phone running Saakshi paired to the first). Snatch detection that starts "My phone is being taken" by itself is **not wanted** for now, and is not to be researched.
- **v2:** a request-help network for lawyers and medics, with verified volunteers, a one-hour commitment, confirmation by the person helped, and strikes for no-shows.
- **Separate companion app (parked):** offline mesh messaging.

## 8. Tech

- Expo (React Native) and TypeScript, with native modules (Kotlin and Swift) where Expo falls short: hardware-key signing, background audio, Android SMS sending, lock-screen and widget triggers, background location.
- An open, documented evidence-bundle format, so other apps and forks stay compatible ([spec/evidence-bundle.md](spec/evidence-bundle.md); `main` writes version 0.11).
- Supabase (Mumbai, `ap-south-1`) for the live-location server and the helpline list. It holds only active shares and deletes each one when it ends. **From round 2** it also holds, for Saakshi-to-Saakshi, encrypted alerts it cannot read and the push addresses of paired phones, and, for the silence alarm, each share's last check-in. Supabase's free plan while testing; round 2 makes the server part of a safety feature, so the plan is reviewed before the beta (release checklist).
- **Our own web address.** The server and the live page sit behind names on a domain the project controls, one `.org` and one `.in`, and the app carries a short list of addresses to try in order, so that a block on one host does not need a new release. The names are **`saakshiapp.org` and `saakshiapp.in`**, bought before the beta build goes to testers. Until then the app talks to a `supabase.co` address and contacts open a `github.io` page. *State: to build.*
- No analytics, advertising or crash-reporting SDKs.
- **Licence:** MIT (decided 17 Oct 2026). Code taken from Tella keeps Horizontal's MIT notice in `THIRD_PARTY_NOTICES.md`.

## 9. Look and feel

No visual design has been applied yet. The direction:

- **Mock-ups start now, beside the repairs,** and each screen is mocked up and chosen by the owner before it is built.
- **One consistent look on Android and iPhone,** which also makes the app easier to review and manage.
- **Built on what people already know.** The most-used camera, sound-recording and gallery apps are reviewed first, and Saakshi's camera, recorder and viewer are built on similar lines, with changes where Saakshi needs them.
- **The records list is a gallery.** Today each record is a date, a time and a file count. It should look like a gallery app, with minimal text; the evidence detail of a record is shown only when the user asks for it. The whole app is too text-heavy and is to be made easier to take in.
- **The mock-ups start with the records list.**
- A real app icon and launch screen replace Expo's placeholders before the beta.

*State: to build (the review of other apps and the mock-ups come first).*

## 10. Open with the owner

Nothing in this section is decided. The builders build what the sections above say, and what is "built so" stays as built until the owner says otherwise.

**Parked by the owner, to be answered with the next test results:**
- The sentence on BNS s.37 in section 6. The builder who read the section word for word reports that the stating or producing of authority is only in Explanation 2, which covers someone acting by the direction of a public servant; Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one ([research/law.md](research/law.md), section 2F). The spec's sentence is unchanged until the owner answers.
- How to cite *D.K. Basu* and *Arnesh Kumar*: the Supreme Court's own copies have no paragraph numbers. Proposed: cite the free official copy by page, with the SCC citation alongside.
- Whether the "what to take" list tells people to carry a photo ID.
- The words of the four new lines in the evidence bundle (the README's paragraph for a recording signed by more than one key, and the hash report's "Signing keys" lines).

**Waiting for a phone test:**
- What the app does about a signing key the phone lists but will not use (E1).
- Whether the app may say that Saakshi's lock on Android needs the PIN (section 5.4).
- Positions at full accuracy in saving mode (section 4, "Low battery").

**Built so, not yet confirmed by the owner:**
- Export: "Share sound" for a sound-only record; each photo or video of an evidence-camera record shared from its own card; file and folder names in English in both languages. The owner's answer of 13 Nov: these are discussed with the redesign of the viewer (section 9).
- The secret code can be reset with the phone's passcode only while nothing is running (section 5.3).
- "Cannot be stopped" is worded as "can only be stopped in Saakshi with the code" (section 5.4).
- The silence alarm's heartbeat is separate from location updates; it says the phone has stopped reporting, not that anything has happened; and a "reporting again" message follows (section 5.7).
- SMS contacts get no text from the silence alarm, only the warning on the live page (section 5.7).
- Body-cam uploads use the same lengthening schedule as Pocket recording (E7).
- The recordings link is public to whoever holds it, and is set only for shares the user starts.
- Notifications go directly through Apple and Google from our own server, not through Expo's push service.
- Positions to Saakshi contacts are end-to-end encrypted; the live link for SMS contacts stays readable by our server, as today.
- With a screen reader on, a swipe is done by activating and confirming; "Share my location" is a plain button under the swipes (section 5.1).
- The secret code's waits, and the refusal of guessable codes (section 5.3).
- The live share of "My phone is being taken" has no fixed end and is deleted a week after the last check-in (section 5.4).
- The evidence camera is not held by the keep-free amount (section 4, "Storage").
- A body-cam or Pocket recording started when the battery is already below the reserve starts with a notice, is not stopped by the reserve, and hands over at 5% (section 4, "Low battery").
- The battery reserve is chosen from fixed steps and cannot be switched off altogether (the brief for "when a recording stops by itself").

**Proposed, not decided:**
- **Saving mode when no recording is running.** Today saving mode (location every 5 minutes, and the "battery at 5%" notice) starts only when a recording hands over at 5%. Once the battery reserve stops ordinary recordings before 5%, a location share with no recording beside it would never enter saving mode. Proposed: saving mode starts at 5% whenever a location share is on.

**One reading to confirm:** in the failing-camera design (section 4, body-cam mode), the owner's note says "5 long vibrations" in step 2 and "the long 5 second vibration" in step 3. The spec reads both as five long vibrations; the brief for repair round B confirms it with him.

**Owed to the owner for reading and sign-off:** the certificate's Part A text; the rights prompts; every string marked for review, English and Hindi, in one wording round; the alerts protocol before any Part 3 code. The list is kept in [release/checklist.md](release/checklist.md) and the owner's notes.

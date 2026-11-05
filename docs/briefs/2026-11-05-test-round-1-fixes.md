# Fix brief: iPhone test round 1, sections A–C (5 Nov 2026)

The owner tested `main` at `9b81f92` (TestFlight) on his iPhone: first look (A), the evidence camera (B) and body-cam mode (C). His notes are on the test page (https://claude.ai/artifact/BQU34AZ76SbRZpBKE5iyc6). This brief turns them into work. The owner's decisions of 5 Nov are marked **Decided**; record them in `docs/SPEC.md` as you build.

Read `CLAUDE.md` first. In particular: never modify an original recording; any copy is labelled as a copy in the app and gets its own signed record naming the original's SHA-256; every string goes through i18n in English and Hindi; the evidence-bundle format in `docs/spec/evidence-bundle.md` stays exact and versioned.

**What passed:** A1–A4 (tabs, language switch, themes, readability); B3 (rights prompts don't appear in the video); B4 (check files); B9 (delete); C4 (leaving and returning). Body-cam used about 2% battery in 10.5 minutes, with no noticeable heat. The Hindi text is still awaiting the owner's review; no builder action is needed on it.

## Order of work

One pull request per group below, in this order. Each needs tests for the logic, a green native build, an updated `docs/BUILD_HANDOFF.md`, and **plain test steps for the owner** in the PR description.

### 1. Body-cam: two serious bugs (C2, C6)

1. **The left-edge back swipe ends body-cam.** Swiping from the left edge of the screen goes back to the Record tab and stops recording completely, even though `gestureEnabled: false` is set. Starting body-cam again then makes a second record. While body-cam is running, nothing may navigate away: block the back gesture (iOS) and the back button (Android), whatever presentation is in use. One body-cam session must stay one record from Start to Stop, even when the user leaves the app and comes back.
2. **Body-cam videos have no sound.** The video pieces are recorded muted and sound goes to separate `.m4a` pieces. The owner expects what the evidence camera does: **video and sound in the same file.**
   - While Saakshi is on screen, video pieces must record with sound.
   - The separate sound-only recording should run only while video can't (app in the background, phone locked), and hand back to video-with-sound when the user returns.
   - Find out whether iOS lets the capture session and the background recorder share the microphone, or whether a hand-over is needed, and keep gaps as small as possible. Every gap and its reason stay in the records.

### 2. Body-cam: other fixes (C1, C2, C3)

1. **Notification Center stops video; Control Center doesn't.** Pulling down Notification Center (top-left) stopped video and left only sound. Pulling down Control Center (top-right) didn't stop anything. Video should carry on whenever the app is only covered or inactive, and stop only when iOS actually interrupts the camera. Log the `AVCaptureSession` interruption reasons, and record them as `endReason`.
2. **Unlock with volume-down twice only (Decided).** Pressing the Camera Control button twice also unlocks today. The Action button didn't, because the owner's is set to silent mode. Make Camera Control and the Action button do nothing. If `AVCaptureEventInteraction` can't tell them apart from volume-down, report that in the handoff with the alternatives and their costs, and don't ship a workaround without the owner's OK.
3. **Learning the unlock by doing it.** Replace the "I know how to unlock it" tick with a practice step: the screen says "Press volume-down twice now", and Start becomes available only after the user has done it successfully. Keep a short reminder on the start screen.
4. **Pressing the side (power) button locks the phone.** Video then stops (an iOS limit) and sound carries on. That's expected; just make sure the record says so in plain words.

### 3. Records list and playback (B1, C6)

1. **Show each record as what it is.** Today it says "1 file". Show:
   - the type (Photo, Video, Body-cam, Bug mode);
   - a thumbnail for photos and videos;
   - the start time and the length.
2. **Photos can't be viewed.** Tapping one should open it full screen.
3. **Sound pieces can't be played.** Add in-app playback for sound files (`.m4a`, `.aac`).
4. **A body-cam or bug-mode recording is one recording (Decided).**
   - The record shows a single player that runs the pieces end to end, with sound, plus its total length. The individual pieces stay listed under "Files" as the evidence.
   - Add a **joined MP4 copy for sharing**, made without re-encoding where possible. Label it in the app as a copy, give it its own signed record listing the SHA-256 of every source piece, and add it to the bundle format (new version).

### 4. Evidence camera (B2)

1. **Front and back camera:** a switch button, for photos and video.
2. **Zoom:** pinch, plus a 0.5× / 1× / 2× control where the phone has those lenses.
3. **Research first, report in the handoff, then build if the cost is reasonable:**
   - **Switching camera during a video without stopping**, keeping one file from start to stop. On iOS, check whether expo-camera's recorder survives an input change, or whether our own recorder is needed (as on Android). On Android, our Camera2 recorder.
   - **Dual capture (front and back at once, picture-in-picture)** on phones that support it: `AVCaptureMultiCamSession` on iOS; concurrent cameras on Android. State which phones support it and what it costs. This is a separate feature; don't build it in this pull request without the owner's OK.

### 5. Why a recording ended (B8)

The owner left the app during a recording and then force-closed it. Both videos were complete and none was marked "Cut off". That's correct: on iPhone, leaving the app closes the recording cleanly. But the record doesn't say **why** it ended. Show the reason in plain words: "You stopped it", "Stopped when you left Saakshi", "Stopped when the phone locked", "Battery low: stopped and saved", "Cut off (the app closed or the phone switched off)". For the owner's next test round, add the steps for a genuine cut-off: force-restart the iPhone (volume up, volume down, hold the side button) while recording.

### 6. Trusted contacts and automatic recipients (B5; Stream B's module)

**Decided:** one trusted-contacts list, with three ticks per person: **SOS alerts**, **live location**, **witness messages**. All are ticked by default.
- Every message fills in the matching ticked people: the SOS alert, the live-location link, the witness message, bug mode's witness texts, confiscation mode.
- The user should never have to type a recipient at the moment of sending.
- Expose the selection through `@/modules/sos`, not through its internals.

### 7. Witness message (B5)

1. **Recipients:** the people ticked for witness messages (group 6).
2. **Content.** Today it carries only the SHA-256, time and place, with no way to tell which file it belongs to. It must identify the recording, and be easy for a person to read and for software to read later. Include:
   - a format tag and version;
   - the record's name and each file's name;
   - the start and end times in IST, and the length;
   - the place (latitude and longitude, accuracy, and a map link);
   - each file's SHA-256 (or the chain head, plus a short count, when there are many files);
   - the app version.

   Specify the format in `docs/spec/evidence-bundle.md` (a new "Witness message" section, versioned), and handle messages that would be too long.
3. **Times.** The owner saw the file name say 03:42 IST and the message say 03:43 IST: one was the start time, the other the end. Use the same, labelled times everywhere: in file names, the message and the certificate.

### 8. Certificate: one profile (B7)

**Decided:** one profile per phone: the person who owns, maintains, manages or operates it. No per-certificate override; anyone else must change the profile in Settings first.
- **Settings → "Your details for certificates":** name; son/daughter/spouse of and that person's name; residing or employed at and the address; IMEI(s), with the `*#06#` help; colour; serial number; and the ownership boxes. All of it stays on the phone only.
- **Making a certificate:**
  - If the profile is incomplete, say so and offer a button to the profile page.
  - If it's complete, show only a short confirmation, for example "Part A will be made for <name>, who owns and operates this phone (IMEI …)", and a **Make certificate** button. No form.
- Existing certificates are unchanged. The certificate text is still under the owner's legal review: change the screens only, not the form's wording.

### 9. Export (B6)

1. **Two clear actions on every record:**
   - **"Share video" or "Share photo"**: a playable copy through the share sheet, so it can go to WhatsApp, Instagram, YouTube, Mail and so on. On iPhone that's the original `.mov`/`.jpg`; on Android it's the MP4 copy.
   - **"Export evidence bundle"**: the full ZIP.
2. **A default export folder.** The user picks a folder once (iOS: a document picker with a security-scoped bookmark; Android: a persistable Storage Access Framework folder). Later bundle exports go there with one tap, with "Change folder" available. The share sheet stays available too.
3. **Human-readable names** for bundles, the files inside and their folders. For example, `Saakshi 2026-11-05 10-40 IST Body-cam.zip`, and inside it `2026-11-05 10-40-12 IST video 1.mov`. Machine identifiers stay in `manifest.json`. This is a bundle-format change: bump the version and update `tools/verify-bundle.mjs`.
4. **README.txt for a lay reader, in English and Hindi**: what each file and folder is, why it's there, and how a lawyer or expert checks the bundle. Write it so someone with no technical background can follow it. The owner is getting a separate walkthrough of the bundle from the review session; keep the README consistent with it.

## Report back

Put a short summary in the handoff, in plain words, of what was fixed, what was researched and found, and anything that needs the owner's decision. Raise questions there as `- [ ] (Fix round 1) question`. Don't change scope beyond this brief without the owner.

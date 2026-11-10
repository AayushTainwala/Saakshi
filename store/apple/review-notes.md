# App Review notes

Where: App Store Connect → Saakshi → the version → **App Review Information** → **Notes**. TestFlight's Beta App Review uses the same text: TestFlight → Test Information → **Review Notes** (see `testflight.md`). Status: **NEEDS OWNER REVIEW**.

Paste the main block. Then add each optional block only if the build being reviewed has that feature. All the blocks together stay under Apple's 4000-byte limit for Notes (checked by `store/__tests__/store.test.ts`).

Other fields in App Review Information:
- **Sign-in required:** off. There is no account.
- **Contact:** Aayush Tainwala, `tainwala.aayush@gmail.com`, and a phone number in international format (+91…).

## Main block

```text
Saakshi helps people in India protect themselves and their rights. It is personal record-keeping for the user and their lawyer, and a way to alert the user's own trusted contacts. It is not an emergency service, and it does not report anything to the police or anyone else (Guideline 1.7).

No sign-in: every feature works without an account. The only server is for live location (below), and only while a share is on; nothing else reaches the developer; no analytics, ads or tracking.

PERMISSIONS
- Camera: photos and video in the evidence camera (Record tab). Files stay in the app's own storage.
- Microphone: sound with videos, and Pocket recording.
- Location When In Use: adds where a recording was made to its signed record, and the user's location to messages they send to their own contacts. In the background only for live location (below).
- App Attest (entitlement, no prompt): certifies the Secure Enclave key that signs each record, so the user can later show it came from a genuine copy of the app. Needs the internet once.

MESSAGES AND SOS
The witness message and alerts open the Messages composer, filled in; the user taps Send. The app never sends an SMS by itself on iPhone. Alerts go only to the people the user has chosen. The first control on the SOS tab is Call 112, and the app says plainly it is not an emergency service (Guideline 5.1.5). Controls are slide-to-confirm.

LEGAL CONTENT
Written by the publisher, Aayush Tainwala, an advocate, from Indian statutes and judgments, each with its section. The certificate screen prepares Part A of the certificate in the Schedule to the Bharatiya Sakshya Adhiniyam, 2023 (section 63(4)); the PDF says Part B must be signed by an expert.

HOW TO TRY IT
1. Record tab: allow camera, microphone and location; take a photo and a short video.
2. Open the session: each file shows as signed. Tap Check files.
3. Send witness message: Messages opens with the fingerprint, time and place.
4. Make certificate: fill in the form; a PDF is made.
5. Export bundle: the share sheet opens.
6. Settings: add a contact. SOS tab: slide I need help.
7. Settings: switch the language to Hindi.

Source code: https://github.com/AayushTainwala/Saakshi
```

## Body-cam mode (in builds from 21 Oct on: paste this too)

```text
BODY-CAM MODE AND BACKGROUND AUDIO
In body-cam mode the user wears the phone on the chest and records with the screen dark and touch locked. While the app is on screen, video and sound are recorded together in one file. If the user leaves the app or locks the phone, iOS stops the video; the app keeps recording sound only (background audio, started on screen) so the sound has no gap, and the orange indicator shows. Video with sound starts again when the user returns. The app warns of this before recording and logs every gap. Try it: Record tab, Body-cam mode, Start; press volume up twice to unlock (practised once before the first start).
```

## Optional: contacts permission (if the build asks for it)

If trusted contacts are picked with the system contact picker, no permission is asked and this block is not needed.

```text
- Contacts: to pick trusted contacts from the address book. Only the chosen names and numbers are kept, on the phone.
```

## Live location, Pocket recording, "My phone is being taken", quick trigger (in every build from 7 Nov on: paste this too)

In `main` from round 2, Part 1 (7 to 10 Nov), so every build from then on has these features.

```text
SAFETY FEATURES
- Live location (SOS tab: Share my location, and with I need help): positions go to our server (Supabase, Mumbai) so the user's contacts can follow a web link; the battery level too, at 20% or less. Deleted when sharing stops or its time ends (24 hours at most). When In Use with the blue indicator. Location Always is never requested; the location library writes that string.
- Pocket recording (Record tab): sound as one file, signed every 10 seconds, until stopped. Background audio with a Live Activity; the orange indicator shows.
- My phone is being taken (SOS tab): opens the alert to the user's contacts, starts Pocket recording, and starts live location with no set end (deleted when stopped, or a week after the phone last reports). It asks for a secret code to be set first.
- Secret code (Settings): 4 digits, kept on the phone only. Once set, every Stop asks for it.
- Quick trigger: a Control Center, Lock Screen and Action Button control opens the SOS screen; nothing is sent until the user slides.
```

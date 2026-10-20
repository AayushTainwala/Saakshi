# App Review notes

Where: App Store Connect → Saakshi → the version → **App Review Information** → **Notes**. TestFlight's Beta App Review uses the same text: TestFlight → Test Information → **Review Notes** (see `testflight.md`). Status: **NEEDS OWNER REVIEW**.

Paste the main block. Then add each optional block only if the build being reviewed has that feature. All the blocks together stay under Apple's 4000-byte limit for Notes (checked by `store/__tests__/store.test.ts`).

Other fields in App Review Information:
- **Sign-in required:** off. There is no account.
- **Contact:** Aayush Tainwala, `tainwala.aayush@gmail.com`, and a phone number in international format (+91…).

## Main block

```text
Saakshi helps people in India protect themselves and their rights. It is personal record-keeping for the user and their lawyer, and a way to alert the user's own trusted contacts. It is not an emergency service, and it does not report anything to the police or anyone else (Guideline 1.7).

No sign-in: every feature works without an account. No server: this version sends nothing to the developer, and has no analytics, ads or tracking.

PERMISSIONS
- Camera: to take photos and video in the app's evidence camera (Record tab). Files stay in the app's own storage.
- Microphone: to record sound with videos.
- Location When In Use: to add where a photo or video was taken to its signed record, and to put the user's location in messages the user chooses to send to their own contacts. Not used in the background.
- App Attest (entitlement, no prompt): certifies the Secure Enclave key that signs each recording's record, so the user can later show the record came from a genuine copy of the app. It needs the internet once.

MESSAGES AND SOS
The witness message and SOS open the Messages composer, filled in; the user taps Send. The app never sends an SMS by itself on iPhone. SOS alerts only the people the user has chosen. The SOS screen has a Call 112 button, and the app says plainly that it is not an emergency service (Guideline 5.1.5).

LEGAL CONTENT
Written by the publisher, Aayush Tainwala, an advocate, from Indian statutes and judgments, each with its section. The certificate screen prepares Part A of the certificate in the Schedule to the Bharatiya Sakshya Adhiniyam, 2023 (section 63(4)); the PDF states that Part B must be signed by an expert.

HOW TO TRY IT
1. Record tab: allow camera, microphone and location, then take a photo and a short video.
2. Open the session: each file shows as fingerprinted and signed. Tap Check files.
3. Tap Send witness message: Messages opens with the fingerprint, time and place.
4. Tap Make certificate, fill in the form: a PDF is made.
5. Tap Export bundle: the share sheet opens.
6. SOS tab: Call 112, add a contact, then SOS opens Messages.
7. Settings: switch the language to Hindi.

Source code: https://github.com/AayushTainwala/Saakshi
```

## Body-cam mode (in builds from 21 Oct on: paste this too)

```text
BODY-CAM MODE AND BACKGROUND AUDIO
In body-cam mode the user wears the phone on the chest and records with the screen dark and touch locked. iOS allows video only while the app is on screen, so if the user leaves the app, video stops; sound keeps recording in short pieces (background audio mode) and the orange indicator shows. The screen explains this before recording starts. A phone call can interrupt sound too. Every gap is logged in the record. Try it: Record tab, Body-cam mode, Start body-cam; press volume down twice to unlock.
```

## Optional: contacts permission (if the build asks for it)

If trusted contacts are picked with the system contact picker, no permission is asked and this block is not needed.

```text
- Contacts: to pick trusted contacts from the address book. Only the chosen names and numbers are kept, on the phone.
```

## Optional: R2 features (live location, bug mode, quick trigger)

Add when the build has Stream B's R2. It replaces "No server" in the main block for this build.

```text
R2 FEATURES
- Live location (SOS tab): while the user shares it, positions go to our server (Supabase, Mumbai) so the user's contacts can follow a web link. Deleted when sharing stops, or after 24 hours at most. Uses When In Use with the blue indicator (location background mode). Location Always is never requested; the string exists because the location library writes it.
- Bug mode (SOS tab): records sound in pieces, each fingerprinted and signed, until stopped. Background audio mode with a Live Activity; the orange indicator shows.
- Quick trigger: a Control Center, Lock Screen and Action Button control (App Intent) opens a code pad; the right code opens Messages with the SOS, which the user sends.
```

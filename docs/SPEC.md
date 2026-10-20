# Saakshi v1 Spec

> Every product decision for v1, from Aayush's picks and notes on the [V1 scope board](https://claude.ai/artifact/SApsbjwDz8sQA55CxX5fH9) (rounds 1 and 2). Items marked **Proposed** await his decision; everything else is decided. Module codes (E1, S4 and so on) are the board's. How the build is sequenced: [BUILD_PLAN.md](BUILD_PLAN.md). Comment with `[AT: ...]`.

## 1. What it is

A free, open-source phone app that helps people in India protect themselves and their rights. It records evidence fit for court under BSA s.63; it alerts the user's own contacts with their location; it protects them when their phone is taken from them; and it teaches what to do, in English and Hindi. It is published under Aayush's own name, as a lawyer, as an app that helps people protect their rights. It is not presented as a protest app.

**Working name:** Saakshi (witness), subject to store and trademark checks. Fallback: Shamash.

## 2. Ground rules

- **Protect yourself, protect your rights.** Every feature is framed as self-preservation and protection of rights under Indian law, to life and liberty above all (the project register, section 1, kept in the owner's notes; summarised in [CLAUDE.md](../CLAUDE.md)).
- **One complete app.** Everything useful that Tella does is built into this app, learning from Tella's code (MIT). Users never need a second app for the same job.
- **Interoperable.** The app works through what people already use: SMS in v1, then WhatsApp, Signal and Telegram; the user's own cloud drive; plain web links that open in any browser.
- **Nothing of the user's leaves the phone unless the user turns it on.** The two exceptions, both opt-in, are (a) uploads to the user's own cloud account and (b) live location while sharing is on (section 6).
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
- **Proposed:** while recording, the app warns at 10% and 5% battery, and at 3% stops and saves the recording itself, so a dying battery never cuts a file off.

Physical damage to the phone during a recording is not solved for in v1.

In v1.1, C2PA Content Credentials and motion, compass and network readings are added. The aim is to make a claim that a recording is AI-generated implausible and to put the burden on whoever makes it; nothing makes a recording unquestionable.

**E2. Witness message.** One tap sends the hash, time and place by SMS to the user's chosen contacts.

**E3. Public timestamp.** When the phone next has internet, each hash is stamped through OpenTimestamps, implemented against its public calendar servers. The official clients are LGPL-3.0, so we write our own rather than bundle theirs.

**E4. BSA s.63 certificate.** For each recording, Part A of the certificate in the Schedule is pre-filled: device type Mobile, make and model, hash value and algorithm (SHA256), with the hash report attached. The user adds name, address and IMEI (the screen shows how: *#06#) and signs. The PDF states that s.63(4)(c) also requires Part B signed by an expert. The form text is checked against the central Gazette before release. The certificate is printed in English; its help text on screen is in English and Hindi.

**E5. Evidence locker and export.** Every recording with its status (hash checked, witness sent, timestamped, uploaded, certificate made). Export a bundle (original file, signed record, timestamp proof, certificate, hash report) through the share sheet. **Ordinary delete:** the user deletes one recording session at a time, after a confirmation, which removes its media, records and certificate. Quick delete (E9) stays held back.

**E6. Rights prompts while recording.** Short on-screen prompts of what to say, such as asking for the grounds of arrest in writing. Drawn on screen only, never burned into the video.

**E7. Copies to the user's cloud.** The user connects their own cloud account, and each finished file or segment uploads when there is signal. Links can be sent to emergency contacts.
- Google Drive first, using Drive's narrowest permission (only files the app creates). Other providers follow.
- Whether the on-phone copy is encrypted is the user's choice.
- The app tells the user that cloud copies can be obtained from the provider through legal process, so the feature is not for private content.

**E8. Bug mode.** The phone becomes a voice recorder:
- audio is saved in fixed short pieces of 1–3 minutes;
- each piece is hashed, signed and chained as it is saved, its hash sent to contacts, and the piece uploaded to the user's cloud the moment it is saved, with its link shared with contacts. Pieces saved without signal upload as soon as it returns. This continues until the battery runs out;
- pieces are not joined together;
- recording continues with the screen locked;
- on iPhone, Apple shows an orange dot and a Live Activity while recording, which is acceptable.

**Body-cam mode (B1–B4), R1.** The phone is worn on the chest, round the neck or clipped to clothing, and records video continuously, so the user's hands stay free in a crowd. On both iPhone and Android:
- **Start:** one button. The screen goes dark at minimum brightness and touch is locked; recording carries on. The app prompts the user to turn on Battery Saver or Low Power Mode.
- **Unlock:** pressing volume-down twice unlocks the screen. Touching the locked screen shows only "Screen locked. Use your unlock buttons." without naming them; the buttons are taught when body-cam mode is first turned on, and in the chest-mount guide (G4).
- **Saving:** like bug mode, in fixed short pieces, each fingerprinted, signed and chained as it is saved, and not joined together. In R1 the pieces stay on the phone; from R2, each uploads the moment it is saved (E7).
- **Quality:** 720p by default; the user can raise it.
- **Calls, messages and notifications keep working.** On Android, recording continues with the screen off through a foreground service while the user takes calls and uses other apps. On iPhone, Apple allows video only while the app is on screen: before the user leaves the app, it warns that video will stop; if they leave anyway, or a call comes in, sound keeps recording, and video restarts when they return. Every gap is logged in the record.

**E9 (v1.1). Vault, disguised icon, quick lock**, learning from Tella. Quick delete of evidence is held back pending Aayush's decision.

## 5. SOS and confiscation mode

**S1. Emergency contacts and SOS.** Several contacts, stored only on the phone. SOS sends them an SMS with the user's location link and the time. On iPhone the user taps Send once. 112 is always one tap away. The feature is worded as alerting trusted contacts, never as an emergency service.

**S2. SOS sends itself on Android.** In the Android APK, SOS SMS goes out with no tap. The Play build keeps tap-to-send unless Play approves the emergency-alert exception.

**S3. Live location by link.** Contacts get a web link that opens in any browser, so they need no app. A small server of ours holds the user's location only while sharing is on and deletes it when sharing ends. WhatsApp, Signal and Telegram are added in v1.1, alongside SMS.

**S4. Quick trigger and code.** A trigger opens straight to a 3-digit code pad, and the alert goes out the moment the third correct digit is typed, with no Send button. A wrong code does nothing.
- iPhone triggers: Action Button, Back Tap, and Lock Screen or Control Center controls.
- Android triggers: a home-screen widget or a notification.
- On iPhone, opening from a locked phone may ask for Face ID first.
- Codes that match existing emergency numbers are refused.

**Confiscation mode.** One action of 2–3 taps, used before handing the phone over, that starts everything at once:
- SOS to contacts;
- live location;
- bug mode, with segments witnessed and uploaded.

Each part can also be started on its own, for when the user needs help but still controls the phone. No app can lock the phone or switch off Face ID or fingerprint unlock, so the preparedness guide (G5) tells users to turn biometrics off beforehand, and how to force passcode-only at the moment.

## 6. Guides and help

**G3. Helplines.** Verified public numbers (112, ambulance, legal services authorities), plus lawyers and medics who consent to be listed. The list updates without a new app release.

**G4. Chest-mount guide.** A GoPro-style harness with a phone clamp, a no-tools lanyard method, and links to open 3D-printable mounts under their licences. The DIY methods are tested before they ship.

**G5. Digital safety and preparedness.** Turn off Face ID and fingerprint unlock before going out, and how to force passcode-only at the moment; what to leave at home; what police may ask of a phone; setting up contacts and confiscation mode in advance. Adapted from EFF Surveillance Self-Defense (CC BY).

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

- **v1.1:** E9; G1; G2; C2PA and sensor readings; WhatsApp, Signal and Telegram; more cloud providers.
- **v2:** a request-help network for lawyers and medics, with verified volunteers, a one-hour commitment, confirmation by the person helped, and strikes for no-shows.
- **Separate companion app (parked):** offline mesh messaging.

## 8. Tech

- Expo (React Native) and TypeScript, with native modules (Kotlin and Swift) where Expo falls short: hardware-key signing, background audio, Android SMS sending, lock-screen and widget triggers, background location.
- An open, documented evidence-bundle format, so other apps and forks stay compatible.
- **Proposed:** Supabase for the live-location server and the helpline list. It holds only active shares and deletes each one when it ends. Region to be decided.
- No analytics, advertising or crash-reporting SDKs.
- **Licence:** MIT (decided 17 Oct 2026). Code taken from Tella keeps Horizontal's MIT notice in `THIRD_PARTY_NOTICES.md`.

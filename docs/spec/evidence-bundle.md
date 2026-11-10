# Saakshi evidence bundle format

**Version 0.9** (6 November 2026, round 2; the app writes 0.9 from round 2, group 1.5; 0.8 and the versions before it: 0.5, 0.6 and 0.7 were also 6 November 2026, 0.3 and 0.4 were 5 November 2026, 0.2 was 21 October 2026, 0.1 was 20 October 2026). Status: in use by the app from its first release; may change before 1.0, always with a new version number.

This document defines how Saakshi records the integrity of photos and videos, and the bundle it exports. It is written so that anyone (a lawyer, a court-appointed expert, another app) can check a bundle with standard tools and without Saakshi. Other apps and forks may produce and read this format. The key words MUST, SHOULD and MAY are used as in RFC 2119.

What this format does and does not show:

- It shows that each file is byte-for-byte the file the app saved when the capture closed, that its record was signed by a key held in the phone's security hardware, and that the files of one capture session (including the pieces of a body-cam or bug-mode recording) are in order with nothing removed or inserted between them.
- It does not prove the time or place: they come from the phone's clock and location services, which the phone's user can change. A public timestamp (a later version, below) proves a record existed no later than a given time.
- It does not make a recording unquestionable, and the app's signing key is not an "electronic signature" under the Information Technology Act, 2000 (see `docs/research/law.md`, section 1D). Under BSA s.63(4) a certificate in the Schedule form is still needed; the app pre-fills Part A (section 8).

## 1. Terms

- **Capture session:** everything recorded between opening the evidence camera and closing it, or during one run of body-cam mode or bug mode. A session holds one or more photos, videos and audio recordings, in the order they were taken.
- **One file per video:** the evidence camera saves each video as one file from start to stop, straight from the camera, with one fingerprint and one record. A photo is a single file.
- **Piece:** before 0.5 (body-cam) and 0.6 (bug mode), these modes saved a long recording as consecutive files of a fixed short length ("pieces"), each sealed as it was saved. Since then each records one continuous file, and a follow-on file of the same recording starts only as a fail-safe (section 3, step 7). The original files are never joined; a joined copy for sharing (section 11a) is a copy, with its own record. (In the record they are described by `segment`.)
- **Cut-off safe:** a file that stays playable up to the moment its recording was cut off (the app killed, the phone forced off), because its container needs nothing written at the end (section 3).
- **Record:** a small JSON document, one per file, describing it. Records are signed and chained.
- **Device key:** an ECDSA P-256 key pair created once per app install inside the phone's security hardware. Its private half never leaves the hardware.
- **Bundle:** a ZIP file holding a session's files, records, the device key's public part with its attestation, and the reports.

## 2. Algorithms

| Purpose | Algorithm |
|---|---|
| File and record fingerprints | SHA-256 (FIPS 180-4), written as 64 lowercase hex characters |
| Additional file fingerprints, because the BSA Schedule lists them | SHA-1 and MD5, lowercase hex. These are for the certificate only; integrity rests on SHA-256 |
| Record signatures | ECDSA on P-256 (secp256r1) with SHA-256 ("ES256"), signature in ASN.1 DER, as produced by `openssl dgst -sha256 -sign` |
| Key identifier | SHA-256 of the public key's DER `SubjectPublicKeyInfo` |
| Text encoding | UTF-8, no byte-order mark |
| Times | RFC 3339 in UTC with milliseconds, for example `2026-10-20T09:02:03.123Z` |

## 3. Capture and hashing

1. The app records with the platform camera into a file. Nothing is drawn onto the image or video: on-screen prompts (E6) are separate views over the preview.
2. **Containers.** Video is written in a container that survives a cut-off:
   - **iPhone, evidence camera:** QuickTime (`.mov`, `video/quicktime`) from `AVCaptureMovieFileOutput`, which writes a movie fragment every 10 seconds. A cut-off file plays up to its last fragment, so at most about 10 seconds are lost; a file cut off in its first 10 seconds has no fragment and does not play.
   - **iPhone, body-cam mode (from 0.5):** fragmented MPEG-4 (`.mp4`, `video/mp4`, H.264 video and AAC sound). The app's own recorder (`AVAssetWriter` with Apple's HLS profile) hands over an initialization segment and then one segment (`moof` and `mdat`) about every 10 seconds, and the app appends each to the file itself. A cut-off file plays up to its last complete segment. (In 0.3 and 0.4 this was QuickTime `.mov` written by the asset writer, with 10-second movie fragments.)
   - **iPhone, body-cam sound-only files (from 0.5):** ADTS AAC (`.aac`, `audio/aac`), encoded and written by the app while it is in the background: a stream of self-contained frames with nothing written at the end, so a cut-off file plays up to the cut. (In 0.3 and 0.4: `.m4a` written by `AVAudioFile`, not cut-off safe.)
   - **Android 8 and later:** MPEG transport stream (`.ts`, `video/mp2t`, H.264 and AAC) from the app's own recorder. It needs nothing written at the end, so a cut-off file plays up to the last data written.
   - **Android 7, or a phone that refuses MPEG-TS:** MP4 (`.mp4`), which is **not** cut-off safe: a cut-off MP4 has no index and does not play.
   - **Bug mode (from 0.6):** ADTS AAC (`.aac`, `audio/aac`) on both platforms, which needs nothing written at the end, so a cut-off file plays up to the cut. Android: MediaRecorder's `AAC_ADTS` output, as before. iPhone: encoded and written by the app, as for body-cam's sound-only files. (Before 0.6, bug mode on iPhone wrote `.m4a` pieces, AAC in MP4, which are not cut-off safe.)
3. **Markers.** When a recording starts, the app writes a small marker in the session folder (`pending/`) naming the file, its start time and what is recording, and updates it when the file closes. The marker is removed once the file has been hashed and moved into the locker.
4. When the camera closes the file (a photo is saved, recording stops, or a piece is complete), the app reads the file once, in fixed-size chunks, and computes SHA-256, SHA-1, MD5 and the size. It does this before moving the file into the evidence locker, and never writes to the file again. Moving within the app's storage does not change the bytes.
5. The app then writes the record (section 4) and signs it (section 5).
6. **Interrupted files.** When the app next opens, it looks for markers left behind. A file whose recorder never closed it (the app was killed or the phone went off) is hashed and sealed as it is, with `interrupted: true` and `capture.endReason: "interrupted"`; its `endedAt` is the file's last-write time. It is chained after the last record sealed in that session, a file's or a checkpoint's. That includes a checkpoint signed just before the cut-off which the app's own list of the session had not yet noted: when the app opens, it first lists every signed record in the session's folder that its list lacks (repair round A, group 1; before it, such a checkpoint's record was overwritten by the cut-off file's). A file that closed normally but was not yet sealed is sealed as usual. A marker whose file is missing or empty is removed.
7. **One continuous file (body-cam, from 0.5).** Body-cam records one file from Start to Stop, the way the evidence camera does (owner's decision of 5 November 2026). A new file starts only as a fail-safe: when iPhone video stops and starts again (step 8), when sound recording stops and comes back, or when a file can't be written. Bug mode does the same from 0.6 (owner's decision, 6 November 2026): one sound file from Start to Stop, and a follow-on file, the next `segment.index` of the same clip, only when sound recording stopped and came back (the file before ends with `"audio-interrupted"`, for example for a phone call) or a file could not be written (`"error"`). Before 0.6 bug mode recorded fixed pieces, and body-cam did before 0.5. For a piece or a follow-on file, the next one starts as soon as the previous one closes; the gap is usually well under a second and is given in `capture.gapBeforeMs`.
8. **Body-cam on iPhone (from 0.3).** One microphone stream feeds every file of the session, so the sound has no gap of its own:
   - While the app is on screen, the video file holds its sound.
   - iOS allows video only while the app is on screen, and a video file can't be written in the background. Video stops only when iOS stops the camera or the app goes into the background, never because the app is merely covered (for example by Control Center). The video file is then closed at once, and its `endReason` gives the reason (from 0.4): `"app-left"` when the app left the screen or the phone was locked, `"camera-in-use"` when another app took the camera, `"system-pressure"` when the phone was under strain (Apple's example is heat), and `"camera-lost"` for any other reason or when frames stopped without one. The sound carries on in a sound-only file (`.aac` from 0.5), a new clip. The sound-only file starts about half a second before the video's sound ended. If the video file could not be closed properly (its record says `"error"`), the sound-only file starts up to 11 seconds earlier instead, because such a file keeps only its complete 10-second segments.
   - When the user returns, video with sound starts again as a new clip, and the sound-only file ends about half a second later (`endReason: "video-resumed"`).
   - If the phone stops sound recording (for example, for a phone call), a sound-only piece ends with `"audio-interrupted"`. A video piece carries on, without sound from that moment; when sound recording comes back, it ends with `"sound-resumed"` and the next piece of the same clip has sound again.
   - `capture.gapBeforeMs` of a video file counts from the end of the previous video file (the gap in the picture). Of a sound-only file, it counts from the end of the previous file that carried sound (the gap in the sound); a negative value means the two overlap.
9. **Checkpoints (body-cam from 0.5, bug mode from 0.6).** While a body-cam or bug-mode file is being written, the app keeps a running SHA-256 over its bytes. About every 10 seconds (body-cam on iPhone, at each segment; body-cam on Android, every 10 seconds, at a 188-byte packet boundary; bug mode, about every 10 seconds of sound, at the end of an ADTS frame) it flushes the file to storage and signs a checkpoint record (section 4a): the file's length so far and the SHA-256 of those bytes, taken from the running hash, so the file is not re-read. Each checkpoint goes into the session's chain as it is made.
   - The file is only ever appended to, so the bytes a checkpoint covers never change: its first `file.size` bytes keep the SHA-256 the checkpoint signed. (Android's MediaRecorder writes MPEG-TS through AOSP's `MPEG2TSWriter`, which only appends 188-byte packets and never seeks back, and ADTS AAC through AOSP's `AACWriter`, which only appends each frame's 7-byte header and then its data; on iPhone the app writes every byte itself, and if a write fails part-way it cuts the file back to the last whole write, which it fingerprinted, and starts a new file.)
   - On iPhone each `.mp4` file's own timeline starts at 0; when it started by the phone's clock is in its record.
   - When the file closes, its own record (section 4) carries the same `recording` id as its checkpoints, and its first bytes must agree with every one of them.
   - If the recording is cut off, the checkpoints already signed prove what existed up to the last one, at most about 10 seconds before the cut. The file itself plays up to the cut and is sealed as interrupted when the app next opens (step 6).
   - The Android MP4 fallback (step 2) gets no checkpoints: MediaRecorder rewrites an MP4's header when it stops.
   - **Upload parts** (for E7): byte ranges of the file, each starting and ending on a checkpoint. Their lengths follow the schedule in section 4b (from 0.9; before it, a minute or two, a setting). Joined in order they are the file byte for byte, and the bytes up to the end of any part have the SHA-256 its checkpoint signed. Parts are not separate files and are not in the bundle.

## 4. Record

A record is a JSON object with exactly these members. Members marked "or null" are always present.

```json
{
  "type": "saakshi.evidence.record",
  "version": "0.9",
  "id": "3f0a1c9e-5d0b-4a8e-9a3c-2f1b7c6d5e4f",
  "session": "8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d",
  "sequence": 3,
  "segment": { "clip": 1, "index": 2 },
  "recording": null,
  "previous": {
    "id": "b7e1...",
    "recordSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "fileSha256": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
  },
  "interrupted": false,
  "file": {
    "name": "0003-clip1-seg2.ts",
    "mediaType": "video/mp2t",
    "size": 31457280,
    "sha256": "…",
    "sha1": "…",
    "md5": "…"
  },
  "capture": {
    "mode": "body-cam",
    "startedAt": "2026-10-20T09:02:03.123Z",
    "endedAt": "2026-10-20T09:03:03.140Z",
    "endedAtSource": "recorder",
    "endReason": "piece-complete",
    "gapBeforeMs": 180,
    "rotationDegrees": 90,
    "hashedAt": "2026-10-20T09:03:03.910Z",
    "timeZone": "Asia/Kolkata",
    "utcOffsetMinutes": 330
  },
  "location": {
    "latitude": 19.076,
    "longitude": 72.8777,
    "accuracyMeters": 12.5,
    "altitudeMeters": null,
    "fixedAt": "2026-10-20T09:02:58.002Z"
  },
  "locationStatus": "fixed",
  "device": {
    "manufacturer": "samsung",
    "brand": "samsung",
    "model": "SM-A546E",
    "modelName": "Galaxy A54 5G",
    "os": "Android",
    "osVersion": "15"
  },
  "app": { "id": "in.aayushtainwala.saakshi", "version": "1.0.0", "build": "1" },
  "key": { "id": "…", "algorithm": "ES256" }
}
```

| Member | Meaning |
|---|---|
| `type`, `version` | Always `"saakshi.evidence.record"` and `"0.9"` for this version. |
| `id` | UUID (version 4) of this record. |
| `session` | UUID of the capture session. |
| `sequence` | Position in the session's chain, from 0, counting every record in the order it was made: each file's record when the file closed, and from 0.5 each checkpoint (section 4a). |
| `segment` | For a body-cam or bug-mode file: `clip` (the recording's number in the session, from 0) and `index` (the file's number within it, from 0; a body-cam clip from 0.5 and a bug-mode clip from 0.6 is normally one file, index 0). Null for a photo and for an evidence-camera video, which is one file. |
| `recording` | From 0.5: the recorder's random id for the file, which its checkpoints (section 4a) also carry. Null for a file with no checkpoints. |
| `previous` | Null for `sequence` 0. Otherwise the previous record in the session: its `id`, the SHA-256 of its record file (section 5) and the SHA-256 of its media file. |
| `interrupted` | True when the recording was cut off and this record was made when the app next opened (section 3, step 6). |
| `file` | The media file: the app's name for it (up to 0.7 also its name inside the bundle's `media/` folder; from 0.8 the bundle gives it a name a person can read, section 7), IANA media type, size in bytes, and fingerprints. |
| `capture.mode` | `"camera"` (the evidence camera), `"body-cam"` or `"bug"`. The app calls `"bug"` **Pocket recording** from 0.9 (the owner renamed bug mode on 6 November 2026); the stored value does not change, so old and new records read alike. |
| `capture.startedFrom` | From 0.9, optional, for `"bug"` only: `"pocket"` (started as Pocket recording) or `"phone-taken"` (started by "My phone is being taken"). Absent in older records. |
| `capture.batteryPercent` | From 0.9, optional: the battery level, 0–100, when the file closed (in a file's record) or when the checkpoint was made (in a checkpoint). Absent when the phone did not say. Like the location, it is the phone's report and not proof. |
| `capture.startedAt`, `endedAt` | When the camera started and stopped writing this file, by the phone's clock. Equal for a photo. |
| `capture.endedAtSource` | `"recorder"`: the recorder reported the end. `"file-modified"`: the file's last-write time, for an interrupted file. |
| `capture.endReason` | `"stopped"` (by the user), `"piece-complete"`, `"app-left"` (iPhone video stopped because the app left the screen or the phone was locked), `"camera-in-use"` (from 0.4, iPhone body-cam: iOS stopped the camera because another app took it), `"system-pressure"` (from 0.4, iPhone body-cam: iOS stopped the camera because the phone was under strain, such as from heat), `"camera-lost"` (the system or another app took the camera, for any other reason), `"low-battery"` (up to 0.8: the app stopped and saved the recording at 3% battery. From 0.9: the file was closed cleanly at 5% battery in body-cam or Pocket recording, and a new file of the same clip follows, `segment.index` + 1, at lower power in body-cam (iPhone: 480p, 15 frames a second; Android, from round 2, group 1.6: the same picture size at half the video bit rate, and 15 frames a second where the camera offers it). Nothing ends with `"low-battery"` in the evidence camera from 0.9: it never stops by itself), `"audio-interrupted"` (the system stopped sound recording, for example for a phone call on iPhone), `"sound-resumed"` (from 0.3, iPhone body-cam: a video piece whose sound stopped part-way, or which had none, ended because sound recording came back; the next piece has sound), `"video-resumed"` (from 0.3, iPhone body-cam: a sound-only piece ended because video with sound started again), `"interrupted"` or `"error"`. For a piece, a negative `gapBeforeMs` means it started before the previous piece stopped (iPhone sound pieces overlap so there is no silence; section 3, step 8). |
| `capture.rotationDegrees` | Degrees clockwise to turn the picture to show it upright, as the recorder set it when the file started. Given only for MPEG-TS files, whose container has no field for it, so a player may show them on their side; null otherwise (QuickTime and MP4 carry their own rotation, and photos and audio have none). |
| `capture.gapBeforeMs` | For a piece: milliseconds between the end of the previous piece of the same recording and the start of this one. Otherwise null. |
| `capture.hashedAt` | When hashing finished. |
| `capture.timeZone`, `utcOffsetMinutes` | The phone's time zone (IANA name, or null if unknown) and offset at `startedAt`, for showing local time. |
| `location` | The most recent position fix the phone gave while this file was being captured, or null. Degrees (WGS 84), metres. `altitudeMeters` and `accuracyMeters` may be null. `fixedAt` is when the phone obtained the fix, which can be earlier than `startedAt`. |
| `locationStatus` | `"fixed"` (a position is given), `"denied"` (the user did not allow location) or `"unavailable"` (allowed, but no fix in time). |
| `device` | As reported by the operating system. `modelName` may be null. The IMEI is not readable by apps and is not recorded; the user adds it to the certificate. |
| `app` | The app's identifier, version and build number. |
| `key` | The key identifier (section 2) of the device key that signed this record, and its algorithm. |

The record has no member for the signature. The signature is a separate file (section 5), so the record file is exactly the bytes that were signed.

## 4a. Checkpoint record (from 0.5)

A checkpoint is signed while a body-cam file (from 0.5) or a bug-mode file (from 0.6) is still being written (section 3, step 9). It has exactly these members:

```json
{
  "type": "saakshi.evidence.checkpoint",
  "version": "0.9",
  "id": "5d1e…",
  "session": "8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d",
  "sequence": 7,
  "recording": "9b3f0c2e-6a41-4d7e-b0f2-3c5d7e9a1b24",
  "checkpoint": 2,
  "segment": { "clip": 0, "index": 0 },
  "previous": { "id": "…", "recordSha256": "…", "fileSha256": "…" },
  "file": { "mediaType": "video/mp4", "size": 11534336, "sha256": "…" },
  "capture": {
    "mode": "body-cam",
    "startedAt": "2026-11-05T05:10:00.120Z",
    "checkpointAt": "2026-11-05T05:10:30.140Z",
    "timeZone": "Asia/Kolkata",
    "utcOffsetMinutes": 330
  },
  "location": null,
  "locationStatus": "denied",
  "device": { "manufacturer": "Apple", "brand": "Apple", "model": "iPhone17,1", "modelName": "iPhone 16 Pro", "os": "iOS", "osVersion": "26.1" },
  "app": { "id": "in.aayushtainwala.saakshi", "version": "1.0.0", "build": "1" },
  "key": { "id": "…", "algorithm": "ES256" }
}
```

| Member | Meaning |
|---|---|
| `type`, `version` | `"saakshi.evidence.checkpoint"` and the format version. |
| `sequence`, `previous` | Its place in the session's chain, exactly as for a file's record (section 4). The record after it gives its `file.sha256` as `previous.fileSha256`. |
| `recording` | The recorder's id for the file being written; the file's own record carries the same id when it closes. |
| `checkpoint` | The checkpoint's number in that file, from 0. Each covers more bytes than the one before. A number can be missing, if the app could not sign that checkpoint; the next one covers its bytes too. |
| `segment` | As in the file's record. |
| `file` | The file's media type, and `size` and `sha256`: the length written so far, and the SHA-256 of exactly those first bytes. There is no `name`: the file's name in the bundle is in its own record. |
| `capture.startedAt`, `checkpointAt` | When the file started, and when the recorder counted these bytes, by the phone's clock. |
| `capture.batteryPercent` | From 0.9, optional, as in section 4. |
| `location`, `locationStatus`, `device`, `app`, `key` | As in section 4. |

## 4b. Upload parts (from 0.9)

Upload parts get a body-cam or Pocket-recording file off the phone while it is still being written (E7). They are not files of the bundle and have no records of their own; they are byte ranges, fixed by the file's checkpoints (section 4a).

- **A part** is the bytes of one file from one checkpoint's `file.size` (or 0 for the first part) to a later checkpoint's `file.size`. Parts of a file are consecutive and do not overlap. The last part runs to the end of the file when the file closes, and is checked against the file's own record.
- **Lengths (the owner's design, 6 November 2026).** Parts are cut at the first checkpoint at or after the target length: **about 10 seconds** while the recording is in its first minute, **about 30 seconds** for the next five minutes, and **about one minute** after that. Checkpoints come about every 10 seconds, so the first parts are one checkpoint each. The lengths are settings, not constants. The schedule runs from the start of the recording, not of each file, so a new file of the same clip (after the low-battery handover, say) does not restart it.
- **Joining.** The parts in order are the file byte for byte. The first `n` bytes of the joined parts have the SHA-256 that the checkpoint ending part `n` signed. A reader who has the parts and the signed checkpoint records can therefore prove a rebuilt file is the one the phone recorded, up to the last part. Whether such a copy counts as primary or secondary evidence is an open question in `docs/research/law.md` (item 8); the format makes no claim.
- **No live streaming.** A part is uploaded only once it ends on a checkpoint. The phone does not send audio or video as it is captured.
- **Upload state** (which parts have gone, to which provider, the name each part has there) is kept by the app and is not signed. The E7 builder adds it to the manifest as `uploads` and records the change in section 12.

## 5. Record file, signature and chain

- **Canonical form.** The record file is the record serialised with the JSON Canonicalization Scheme (RFC 8785): members sorted by their UTF-16 code units, no whitespace, numbers in ECMAScript's shortest form, then encoded as UTF-8. Any reader can re-create these bytes from the parsed record, but does not need to: the file in the bundle is those bytes.
- **Record hash.** `recordSha256` is the SHA-256 of the record file's bytes.
- **Signature.** The device key signs the record file's bytes with ES256. The DER signature is stored beside it as `<record file>.sig` (raw binary, not Base64).
- **Chain.** Each record after the first carries the previous record's `recordSha256` and `fileSha256` in `previous`. Removing, inserting or reordering a file or record breaks the chain at that point. The **chain head** is the `recordSha256` of the last record in the session; it commits to every record and file before it.

## 6. Device key and attestation

The app creates one device key per install, the first time it needs to sign, and never exports the private key.

**Android.** An Android Keystore key (`EC`, `secp256r1`, purpose `SIGN`, digest `SHA-256`), in StrongBox where the phone has it and otherwise in the Trusted Execution Environment, with no user-authentication requirement (so it can sign while recording). It is created with a Key Attestation challenge of 32 random bytes. The attestation is the certificate chain the Keystore returns for the key. Its leaf certificate's public key is the device key, and its attestation extension (OID `1.3.6.1.4.1.11129.2.1.17`) states:

- the security level (TEE or StrongBox);
- the app's package name and signing-certificate digest (`attestationApplicationId`);
- the phone's verified-boot state and bootloader lock (`rootOfTrust`).

The chain ends at one of Google's hardware attestation roots. Phones without hardware attestation give a chain with a software root, or none; the bundle says which.

**iPhone.** A Secure Enclave P-256 signing key (CryptoKit `SecureEnclave.P256.Signing.PrivateKey`), whose opaque handle is kept in the Keychain with "this device only" access. Secure Enclave keys carry no attestation of their own, so the app binds the device key to Apple App Attest:

1. The app generates an App Attest key (`DCAppAttestService.generateKey`).
2. It calls `attestKey` with `clientDataHash` = SHA-256 of the device key's DER `SubjectPublicKeyInfo`.

Apple's attestation object (CBOR, with a certificate chain to Apple's App Attest root) then states that the genuine Saakshi app, on a genuine Apple device, vouched for this device key's public key. `attestKey` needs the internet once. Until it succeeds, records are still signed, and the attestation is added to later bundles. Because the attestation binds the key and not a time, it covers records signed before it.

**Device key file.** `device-key.json` in each bundle:

```json
{
  "type": "saakshi.device-key",
  "version": "0.9",
  "keyId": "…",
  "algorithm": "ES256",
  "publicKeySpki": "<Base64 of DER SubjectPublicKeyInfo>",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----\n",
  "platform": "android",
  "storage": "strongbox",
  "createdAt": "2026-10-20T08:59:40.511Z",
  "attestation": {
    "format": "android-key-attestation",
    "certificateChain": ["<Base64 DER, leaf first>", "…"]
  },
  "attestationError": null
}
```

- `platform` is `"android"` or `"ios"`.
- `storage` is `"strongbox"`, `"tee"`, `"secure-enclave"` or `"software"`.
- On iPhone, `attestation` is `{ "format": "apple-app-attest", "keyId": "<Base64>", "attestationObject": "<Base64>", "clientDataHash": "<Base64>" }`.
- `attestation` is null, with a reason in `attestationError`, when none could be obtained.

## 7. Bundle

A ZIP file named `Saakshi <record name>.zip`, for example `Saakshi 2026-11-05 10-40 IST Body-cam.zip`: when the record's first file started (IST) and what recorded it (`Body-cam`, `Pocket recording` (`Bug mode` up to 0.8), `Photo`, `Photos`, `Video`, `Videos` or `Camera`), as the app and the witness message (section 9) name it. Entries are stored without compression (method 0). ZIP64 is used when an entry or the archive passes 4 GiB. From 0.8 a reader may also rely on the ZIP being plain: each name once, and a plain path; each local header the same as its central-directory entry; no data descriptors, no symbolic links, and no extra fields but ZIP64's; the entries one after another from the start, with the central directory right after the last; then, only if needed, the ZIP64 end record and locator; and the end record in the last 22 bytes, with no comment, agreeing with the ZIP64 record.

From 0.8 the folders and files have names a person can read (fix round 1, group 9), and every part of each name comes from a signed record, so a reader can work it out and check it:
- **an original:** `Original files/<capture.startedAt in IST, YYYY-MM-DD HH-MM-SS> IST <label><extension of file.name>`;
- **a file's record:** `Signed records/<sequence, four digits> <label>.json`, and its signature the same plus `.sig`;
- **a checkpoint record:** `Signed records/<sequence, four digits> <label of the file with the same recording> checkpoint <checkpoint>.json` (without the label if that file's record is not in the bundle);
- **the label:** the kind, from `file.mediaType` (`image/…` "photo", `audio/…` "sound", `video/…` "video"), and the file's number among the bundle's files of that kind in chain order, from 1: `video 1`, `sound 1`, `photo 2`. The witness message numbers the files the same way, with the kind in the app's language.

The four-digit `sequence` makes a folder list the records in chain order. The app's own names stay in each signed record (`file.name`) and in the manifest.

```
README.txt                                          (English and Hindi, for a lay reader)
Hash report.txt
Certificate Part A.pdf                              (when the user has made one)
Original files/2026-11-05 10-40-12 IST video 1.mp4
Original files/2026-11-05 10-52-30 IST sound 1.aac
Signed records/0000 video 1 checkpoint 0.json       (from 0.5, checkpoints are among the records)
Signed records/0000 video 1 checkpoint 0.json.sig
…
Signed records/0074 video 1.json
Signed records/0074 video 1.json.sig
…
manifest.json
device-key.json
```

Up to 0.7 the layout was `manifest.json`, `device-key.json`, `media/<file.name>`, `records/<sequence>.json` and `.json.sig`, `hash-report.txt`, `certificate-part-a.pdf` and `README.txt`, and the bundle was named `saakshi-<first 8 characters of session>-<YYYYMMDD-HHMM>.zip`.

`manifest.json` lists what the bundle holds, with the machine identifiers. It is not signed; everything in it can be checked against the signed records:

```json
{
  "type": "saakshi.evidence.bundle",
  "version": "0.9",
  "session": "8c2d4b6a-…",
  "name": "2026-11-05 10-40 IST Body-cam",
  "createdAt": "2026-11-05T06:15:00.000Z",
  "app": { "id": "in.aayushtainwala.saakshi", "version": "1.0.0", "build": "1" },
  "chainHead": "<recordSha256 of the last record>",
  "records": [
    { "record": "Signed records/0074 video 1.json", "signature": "Signed records/0074 video 1.json.sig", "media": "Original files/2026-11-05 10-40-12 IST video 1.mp4", "recordId": "…", "fileName": "0074-clip0-seg0.mp4", "recordSha256": "…", "fileSha256": "…", "recording": "9b3f…" }
  ],
  "checkpoints": [
    { "record": "Signed records/0000 video 1 checkpoint 0.json", "signature": "Signed records/0000 video 1 checkpoint 0.json.sig", "recordId": "…", "recording": "9b3f…", "checkpoint": 0, "size": 3801088, "sha256": "…", "recordSha256": "…" }
  ],
  "witness": [
    { "sentAt": "2026-11-05T05:20:12.000Z", "chainHead": "…", "recipients": 2, "result": "sent" }
  ],
  "certificate": "Certificate Part A.pdf",
  "timestamps": []
}
```

- `name` (from 0.8) is the record's name, as in the bundle's file name.
- `records` lists the files' records: where each record, its signature and its original are in the bundle, and (from 0.8) the record's `id` and the app's name for the file (`fileName`, the record's `file.name`). A reader finds a record's original through this list; up to 0.7 it is `media/<file.name>`. Because the manifest is not signed, a reader works each name out from the signed record (above) rather than trusting it, and checks that every file in `Original files/` is some record's: then the file at each readable name is the one checked against a signed record.
- `checkpoints` (from 0.5) lists the checkpoint records. Both kinds are in the records folder, numbered by `sequence`.
- `witness` lists every witness message the app opened for the user (section 9), including ones the user cancelled. `recipients` is how many recipients the app filled in; 0 means the user chose them in the SMS app. `result` is what the phone reported: `"sent"`, `"cancelled"` or `"unknown"` (Android always reports "unknown").
- `certificate` is null when no certificate has been made.
- `Hash report.txt` is a plain-text table of every file's name in the bundle and in its record, its size, SHA-256, SHA-1 and MD5, every record's name and SHA-256, how many checkpoints each body-cam or bug-mode file has and what the last one covers, and the chain head, with times in IST. It is the hash report the Schedule asks to be enclosed. A certificate made from 0.8 names the files as the bundle does.
- `README.txt` says, in English and then in Hindi, for a reader with no technical background, what each file and folder is and why it is there, and gives section 10 in short with commands that name this bundle's own files. It is UTF-8 with a byte-order mark and Windows line ends, so that Notepad shows it as it is.

## 8. BSA s.63 certificate, Part A

The app pre-fills Part A of the certificate in the Schedule to the Bharatiya Sakshya Adhiniyam, 2023 (s.63(4)(c)), as a PDF, with the hash report attached. The field list is from `docs/research/law.md` section 1B (Gazette of Puducherry reproduction). The form text must be checked against the Gazette of India before release.

- **Pre-filled:** device type "Mobile"; make and model from the records; algorithm "SHA256" with each file's SHA-256.
- **Typed in by the user:** name; relation and the relative's name; address; IMEI (the screen shows how to find it: dial `*#06#`); and optionally colour, serial number and other device information.
- **Ticked by the user:** whether they own, maintain, manage or operate the phone.
- **Left blank for signing by hand:** signature, date, time and place.

The PDF states that s.63(4)(c) also requires Part B, signed by an expert, which the app cannot provide.

## 9. Witness message (format v1)

One tap composes an SMS to the trusted contacts ticked for witness messages, so that people other than the user hold the record's fingerprints from the time of capture. The user taps Send. The app records each message it composes in the manifest's `witness` list. Its format is versioned on its own, independently of the bundle; this is **version 1** (6 November 2026; before it, the message held only the chain head, the time and the place).

```
Saakshi witness v1
Record: 2026-11-06 10-40 IST Body-cam
Started: 06/11/2026 10:40:12 IST
Ended: 06/11/2026 10:52:30 IST
Length: 0:12:18
Place: 19.07600, 72.87770 (within 13 m)
Map: https://maps.google.com/?q=19.07600,72.87770
Files: 3
video 1 SHA-256: 9f86d081…
sound 1 SHA-256: 2c26b46b…
video 2 SHA-256: fcde2b2e…
Whole record SHA-256: 3a6eb079…
App: Saakshi 1.0.0 (7)
ID: 8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d
```

- **Line 1** is always `Saakshi witness v1`, in any language: what the message is and its format version. A later version changes this line.
- **Then one `label: value` per line, in this order.** The labels follow the app's language; the values never do. Software reads the lines by their order, not by their labels.

| Line | Value |
|---|---|
| Record | The record's name: when it started (date and time, IST) and what it is (`Body-cam`, `Pocket recording` (`Bug mode` up to 0.8), `Photo`, `Photos`, `Video`, `Videos`, `Camera`). |
| Started, Ended | When the first file started and the last one ended (each record's `capture.startedAt` and `capture.endedAt`), as `DD/MM/YYYY HH:MM:SS IST`. These are the times the app shows as "Started" and the bundle's file name uses. |
| Length | From Started to Ended, as `H:MM:SS`. |
| Place | Where the recording started: the first file with a position, as latitude and longitude to five decimals and its accuracy; or that it was not recorded. |
| Map (optional) | A map link to that place, when there is one. |
| Files | How many files the record holds. |
| one line per file (optional) | Up to three files: the file's kind and number in the record (`video 1`, `sound 2`, `photo 1`, in the record's order), then `SHA-256:` and the file's SHA-256 (its record's `file.sha256`). With more than three files, these lines are left out. |
| Whole record SHA-256 | The chain head: the SHA-256 of the session's last signed record (section 5), a file's or a checkpoint's. It vouches for every file and checkpoint before it. Compare it with `chainHead` in the manifest. |
| App | The app and version that signed the records (`app.version`, `app.build`). |
| ID (optional) | The session's id (the records' `session`, the manifest's `session`). |

- **Length limit.** A message is kept to at most 6 SMS parts (160 characters, or 70 outside GSM's basic character set such as Hindi, per part; 153 and 67 when joined). If it would be longer, it leaves out, in turn: the lines for each file (the chain head still covers them), the map link, and the ID. Line 1, the record's name, the times, the place, the count, the chain head and the app are always kept. In English, the message uses only GSM characters, so that it stays in the cheaper encoding.
- **Pocket recording's witness texts** (bug mode's up to 0.8) (section 3, step 9) are shorter, and sent while it records: `Saakshi pocket recording: recording since 10:40 IST, signed up to 10:50 IST. SHA-256: <chain head>`.

## 10. How to verify a bundle

With standard tools (`unzip`, `sha256sum`, `openssl`):

1. Unzip the bundle.
2. **Public key:** save the `publicKeyPem` value from `device-key.json` as `key.pem`. Check that `openssl pkey -pubin -in key.pem -outform DER | sha256sum` equals `keyId`, and equals `key.id` in every record.
3. **Signatures:** for each record, run `openssl dgst -sha256 -verify key.pem -signature "Signed records/0000 video 1 checkpoint 0.json.sig" "Signed records/0000 video 1 checkpoint 0.json"` (up to 0.7: `records/0000.json`). It must print `Verified OK`.
4. **Files:** for each file's record, find its original: from 0.8 at the name section 7 gives from the record, which the manifest's `media` and the hash report also give; up to 0.7, `media/<file.name>`. Its `sha256sum` must equal `file.sha256`, and its size `file.size`. From 0.8, every file in `Original files/` must be some record's original, and each record's own name must be the one section 7 gives: otherwise a name a person reads, such as when a video started, could be wrong.
4a. **Checkpoints (from 0.5):** for each checkpoint record, find the file's record with the same `recording`, and that file's original as in step 4. `head -c <file.size of the checkpoint> "<original>" | sha256sum` must equal the checkpoint's `file.sha256`. The checkpoints of one file have rising numbers (a number may be missing, if that checkpoint could not be signed), each covers more bytes than the last, and all come before the file's record in the chain.
5. **Chain:** sort all records, files' and checkpoints', by `sequence` (from 0.8 their names start with it), from 0 with no gaps. Record 0 has `previous` null. Each later record's `previous.recordSha256` must equal `sha256sum` of the previous record file, and its `previous.fileSha256` the previous record's `file.sha256`. The `sha256sum` of the last record file is the chain head; compare it with `chainHead` in the manifest and with any witness message.
6. **Attestation:**
   - Android: verify the certificate chain up to a Google hardware attestation root, check the leaf's public key equals the device key, and read the attestation extension (package name `in.aayushtainwala.saakshi`, the app's signing-certificate digest published with each release, security level, verified-boot state). Also check Google's attestation revocation list.
   - iPhone: verify the App Attest object as Apple documents for servers ("Validating apps that connect to your server"), with App ID `<Team ID>.in.aayushtainwala.saakshi` and `clientDataHash` equal to SHA-256 of the device key's DER public key.

`tools/verify-bundle.mjs` in the Saakshi repository runs steps 2–5 with Node.js and no other dependencies, step 4a included (it reads each file once and takes the SHA-256 of every checkpointed prefix on the way). The tool reads versions 0.1 to 0.9, lists each file it checked, and does not yet check attestation chains (step 6). From 0.9 it also checks the shape of `capture.batteryPercent` (a whole number from 0 to 100) and `capture.startedFrom` ("pocket" or "phone-taken", only with `capture.mode` "bug"), and fails a record of an earlier version that carries either. For a 0.8 bundle it works out every name from the signed records and fails on any that differ, in the folders or in the manifest. For any bundle it fails on:
- a file that is not part of the bundle's one layout (for example a copy in a look-alike folder, or at the top);
- a file in the originals' or records' folder that no record accounts for;
- names a computer may treat as the same (they differ only in case, or in how a letter is written);
- a ZIP that is not plain (section 7): a name twice, or with `.` or `..` in it; a local header that differs from the central directory, for example by naming another file; an extra field such as the Unicode Path field (0x7075), which some unzip tools take as the name (ZIP64's and the common timestamp and owner fields are allowed); a gap between entries; an entry marked as a symbolic link; anything between the central directory and the end records, or a ZIP64 record that disagrees with the end record (either could lead an unzip tool to a second archive in the file).

It skips what a computer adds when unzipping (macOS's `.DS_Store`, `._` files and `__MACOSX/`, and Windows's `Thumbs.db` and `desktop.ini`). It allows `key.pem`, which README.txt's steps make, but only if it is the key in `device-key.json`.

The chain shows a record changed, added or taken out of the middle. Records taken off the end show only against a chain head held elsewhere, such as in a witness message: neither the tool nor the manifest's `chainHead` (which is not signed) can show it.

## 11. Playable copies (Android)

An Android video's original is an MPEG-TS file. Many players handle MP4 better, and MPEG-TS can't say which way up the picture goes. When the user plays or shares an Android video, the app can make an MP4 copy:

- **Method:** a remux. Android's `MediaExtractor` reads each audio and video sample from the original, and `MediaMuxer` writes it unchanged into an MP4 container. Nothing is re-encoded. The original's `capture.rotationDegrees` is written into the MP4's rotation.
- **Where:** in the session's `copies/` folder, as `<original name without extension>.copy.mp4`, with its record `<copy name>.json` and signature `<copy name>.json.sig`, made and signed as in section 5.
- **What it is not:** the copy is not part of the session's chain, is never in the bundle (section 7) and is never named in the certificate (section 8). The app labels it as a copy wherever it appears.

A copy record has exactly these members:

| Member | Meaning |
|---|---|
| `type`, `version` | `"saakshi.evidence.copy"` and the format version. |
| `id`, `session` | UUID of this copy record, and the session of the original. |
| `original` | `recordId`, `recordSha256` (SHA-256 of the original's record file), `fileName` and `fileSha256` of the original. |
| `method` | `name` (`"remux-mpegts-to-mp4"`), `reencoded` (`false`), a plain-language `description`, and the `rotationDegrees` written into the copy. |
| `file` | The copy: `name`, `mediaType` (`"video/mp4"`), `size`, `sha256`, `sha1`, `md5`. |
| `madeAt` | When the copy was made. |
| `device`, `app`, `key` | As in section 4. |

To check a copy against its original: verify the copy record's signature as in section 10, step 3; check that `original.fileSha256` and `original.recordSha256` match the original's record; check the copy's own SHA-256. Its pictures and sound can be compared with the original's frame for frame, for example with `ffprobe -show_packets` on both, since the samples are the same bytes.

## 11a. Joined copies (from 0.7)

A body-cam record can hold more than one video file: on iPhone, video stops while the user is away from Saakshi and starts again in a new file when they come back, with a sound-only file between (section 3, step 8). For sharing, the app can join a record's files into one MP4 copy:

- **What goes where:** each video file's picture, from its start, at its place in the recording (its `capture.startedAt` less the record's first file's). Between video files there is no picture. The sound comes from the video files and the sound-only files, each stretch once: a file's sound starts where the file before it ended, so the half-second overlaps of section 3, step 8 are not heard twice. Where nothing was recorded (for example, during a phone call) the copy is silent.
- **Method:** without re-encoding where the phone can: every sample is copied unchanged (iPhone: `AVMutableComposition` exported with `AVAssetExportPresetPassthrough`; Android: `MediaExtractor` into `MediaMuxer`). If the iPhone can't (the clips were filmed turned different ways, or the passthrough export fails), it re-encodes, and the record says so (`method.reencoded: true`). Android files turned different ways are not joined.
- **Where:** `copies/joined.copy.mp4` in the session folder, with its record `joined.copy.mp4.json` and signature `joined.copy.mp4.json.sig`, made and signed as in section 5. It is made again if the record gains a file.
- **What it is not:** as with section 11, the joined copy is not part of the chain, is never in the bundle and is never named in the certificate. The app labels it as a copy.

A joined-copy record has exactly these members:

| Member | Meaning |
|---|---|
| `type`, `version` | `"saakshi.evidence.joined-copy"` and the format version. |
| `id`, `session` | UUID of this record, and the session of the originals. |
| `sources` | Every file the copy was made from, in chain order: `recordId`, `recordSha256` (SHA-256 of its record file), `fileName` and `fileSha256`. |
| `parts` | Where each stretch went: `track` (`"video"` or `"audio"`), `source` (its `fileName`), `atMs` (where it starts in the copy), `fromMs` (where it starts in the source) and `lengthMs`. |
| `method` | `name` (`"join-mp4"`), `reencoded` (`true` or `false`) and a plain-language `description`. |
| `file` | The copy: `name`, `mediaType` (`"video/mp4"`), `size`, `sha256`, `sha1`, `md5`. |
| `madeAt` | When the copy was made. |
| `device`, `app`, `key` | As in section 4. |

To check a joined copy: verify its record's signature as in section 10, step 3; check each `sources` entry against the original's record (`recordSha256`, `fileSha256`); check the copy's own SHA-256. When `reencoded` is `false`, each part's samples can be compared with its source's, for example with `ffprobe -show_packets`.

## 12. Versions

- **0.1** (20 October 2026): records, signatures and chain; Android Key Attestation and Apple App Attest; bundle; certificate Part A; witness message.
- **0.2** (21 October 2026): one file per evidence-camera video, in a cut-off-safe container; pieces for body-cam and bug mode; markers and interrupted files; new record members `interrupted`, `capture.mode`, `capture.endedAtSource`, `capture.endReason`, `capture.gapBeforeMs` and `capture.rotationDegrees`; playable copies of Android videos with their own signed records (section 11).
- **0.3** (5 November 2026): body-cam on iPhone records video and sound in the same file while the app is on screen, and sound-only pieces only while video can't record (section 3, step 8); new `capture.endReason` values `"sound-resumed"` and `"video-resumed"`. No record member was added or removed; only the version and the allowed `endReason` values changed.
- **0.4** (5 November 2026): iPhone body-cam video ends only when iOS stops the camera, and its `capture.endReason` gives iOS's reason: new values `"camera-in-use"` and `"system-pressure"` (section 3, step 8). No record member was added or removed.
- **0.5** (6 November 2026): body-cam records one continuous file per unbroken stretch instead of pieces; signed checkpoint records (section 4a) while each file is written, in the chain; new record member `recording`; manifest `checkpoints`; iPhone body-cam files are fragmented MP4 (`.mp4`) and sound-only files ADTS AAC (`.aac`), both written by the app and cut-off safe (section 3, steps 2, 7 and 9).
- **0.6** (6 November 2026): bug mode records one continuous file per unbroken stretch instead of 2-minute pieces, with checkpoint records (section 4a) as for body-cam, and its files are ADTS AAC (`.aac`) on iPhone too (section 3, steps 2, 7 and 9). No record member was added or removed.
- **0.7** (6 November 2026): joined copies of a record's files for sharing, with their own signed records (section 11a). No member of the records in a bundle was added or removed.
- **0.8** (6 November 2026): the bundle, its folders and its files have names a person can read (section 7): `Saakshi <record name>.zip`, `Original files/`, `Signed records/`, `Hash report.txt`, `Certificate Part A.pdf`; the manifest gains `name` and, for each record, `recordId` and `fileName`, and is how a reader finds a record's original; README.txt is in English and Hindi. No record member was added or removed.
- **0.9** (6 November 2026, specified for round 2): the low-battery handover at 5% instead of the 3% stop (`capture.endReason: "low-battery"`, section 4); optional `capture.batteryPercent` in file and checkpoint records; optional `capture.startedFrom` (`"pocket"` or `"phone-taken"`); upload parts and their lengthening schedule (section 4b); bug mode is called Pocket recording in names and in the witness text, with `capture.mode` still `"bug"`. No required member was added or removed. Written by the app from round 2, group 1.5 (`FORMAT_VERSION` "0.9"; `tools/verify-bundle.mjs` reads it). The battery level is read when each record is signed, right after its file closes or its checkpoint is made, and is left out of a file sealed after a cut-off. Round 2, group 1.6 (9 November 2026) changed only how Android body-cam saves power after the handover (no 480p, no camera rebuild: the same size at half the bit rate); no member changed, so it stays 0.9.
- **Witness message v1** (6 November 2026): section 9. The message's format is versioned on its own; the bundle format is unchanged by it.
- **Later (planned):** OpenTimestamps proofs for each chain head and record, in `timestamps/<recordSha256>.ots`, listed in the manifest's `timestamps`; upload state for copies in the user's cloud drive (`uploads`, section 4b, built with E7).
- **1.1 of the app** (planned): C2PA Content Credentials and sensor readings.

A reader MUST reject a record whose `version` it does not know, and SHOULD tell the user which version it found.

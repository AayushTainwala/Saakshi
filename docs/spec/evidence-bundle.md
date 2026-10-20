# Saakshi evidence bundle format

**Version 0.1** (draft, 20 October 2026). Status: in use by the app from its first release; may change before 1.0, always with a new version number.

This document defines how Saakshi records the integrity of photos and videos, and the bundle it exports. It is written so that anyone (a lawyer, a court-appointed expert, another app) can check a bundle with standard tools and without Saakshi. Other apps and forks may produce and read this format. The key words MUST, SHOULD and MAY are used as in RFC 2119.

What this format does and does not show:

- It shows that each file is byte-for-byte the file the app saved when the capture closed, that its record was signed by a key held in the phone's security hardware, and that segments and files of one capture session are in order with nothing removed or inserted between them.
- It does not prove the time or place: they come from the phone's clock and location services, which the phone's user can change. A public timestamp (version 0.2, below) proves a record existed no later than a given time.
- It does not make a recording unquestionable, and the app's signing key is not an "electronic signature" under the Information Technology Act, 2000 (see `docs/research/law.md`, section 1D). Under BSA s.63(4) a certificate in the Schedule form is still needed; the app pre-fills Part A (section 8).

## 1. Terms

- **Capture session:** everything recorded between opening the evidence camera and closing it. A session holds one or more photos and videos, in the order they were taken.
- **Segment:** a video is saved as consecutive files ("segments") of at most 60 seconds each, so that a long recording cut short (battery, seizure, crash) keeps every finished segment. A photo is a single file.
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
2. When the camera closes the file (a photo is saved, or a segment reaches 60 seconds, or recording stops), the app reads the file once, in fixed-size chunks, and computes SHA-256, SHA-1, MD5 and the size. It does this before moving the file into the evidence locker, and never writes to the file again. Moving within the app's storage does not change the bytes.
3. The app then writes the record (section 4) and signs it (section 5).
4. While a video continues, the next segment starts recording as soon as the previous one closes. The gap between segments is usually under a second and is visible from the records' `startedAt` and `endedAt` times.

## 4. Record

A record is a JSON object with exactly these members. Members marked "or null" are always present.

```json
{
  "type": "saakshi.evidence.record",
  "version": "0.1",
  "id": "3f0a1c9e-5d0b-4a8e-9a3c-2f1b7c6d5e4f",
  "session": "8c2d4b6a-1e3f-4a5b-9c7d-0e1f2a3b4c5d",
  "sequence": 3,
  "segment": { "clip": 1, "index": 2 },
  "previous": {
    "id": "b7e1...",
    "recordSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "fileSha256": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
  },
  "file": {
    "name": "0003-clip1-seg2.mp4",
    "mediaType": "video/mp4",
    "size": 31457280,
    "sha256": "…",
    "sha1": "…",
    "md5": "…"
  },
  "capture": {
    "startedAt": "2026-10-20T09:02:03.123Z",
    "endedAt": "2026-10-20T09:03:03.140Z",
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
| `type`, `version` | Always `"saakshi.evidence.record"` and `"0.1"` for this version. |
| `id` | UUID (version 4) of this record. |
| `session` | UUID of the capture session. |
| `sequence` | Position in the session, from 0, counting every file (photos and segments) in the order they closed. |
| `segment` | For video: `clip` (the video's number in the session, from 0) and `index` (the segment's number within the video, from 0). For a photo: null. |
| `previous` | Null for `sequence` 0. Otherwise the previous record in the session: its `id`, the SHA-256 of its record file (section 5) and the SHA-256 of its media file. |
| `file` | The media file: its name inside the bundle's `media/` folder, IANA media type, size in bytes, and fingerprints. |
| `capture.startedAt`, `endedAt` | When the camera started and stopped writing this file, by the phone's clock. Equal for a photo. |
| `capture.hashedAt` | When hashing finished. |
| `capture.timeZone`, `utcOffsetMinutes` | The phone's time zone (IANA name, or null if unknown) and offset at `startedAt`, for showing local time. |
| `location` | The most recent position fix the phone gave while this file was being captured, or null. Degrees (WGS 84), metres. `altitudeMeters` and `accuracyMeters` may be null. `fixedAt` is when the phone obtained the fix, which can be earlier than `startedAt`. |
| `locationStatus` | `"fixed"` (a position is given), `"denied"` (the user did not allow location) or `"unavailable"` (allowed, but no fix in time). |
| `device` | As reported by the operating system. `modelName` may be null. The IMEI is not readable by apps and is not recorded; the user adds it to the certificate. |
| `app` | The app's identifier, version and build number. |
| `key` | The key identifier (section 2) of the device key that signed this record, and its algorithm. |

The record has no member for the signature. The signature is a separate file (section 5), so the record file is exactly the bytes that were signed.

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
  "version": "0.1",
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

A ZIP file named `saakshi-<first 8 characters of session>-<YYYYMMDD-HHMM local>.zip`. Entries are stored without compression (method 0). ZIP64 is used when an entry or the archive passes 4 GiB.

```
manifest.json
device-key.json
media/0000-photo.jpg
media/0001-clip0-seg0.mp4
records/0000.json
records/0000.json.sig
records/0001.json
records/0001.json.sig
hash-report.txt
certificate-part-a.pdf      (when the user has made one)
README.txt
```

`manifest.json` lists what the bundle holds. It is not signed; everything in it can be checked against the signed records:

```json
{
  "type": "saakshi.evidence.bundle",
  "version": "0.1",
  "session": "8c2d4b6a-…",
  "createdAt": "2026-10-20T10:15:00.000Z",
  "app": { "id": "in.aayushtainwala.saakshi", "version": "1.0.0", "build": "1" },
  "chainHead": "<recordSha256 of the last record>",
  "records": [
    { "record": "records/0000.json", "signature": "records/0000.json.sig", "media": "media/0000-photo.jpg", "recordSha256": "…", "fileSha256": "…" }
  ],
  "witness": [
    { "sentAt": "2026-10-20T09:05:12.000Z", "chainHead": "…", "recipients": 2, "result": "sent" }
  ],
  "certificate": "certificate-part-a.pdf",
  "timestamps": []
}
```

- `witness` lists the witness messages the user sent from the app (section 9). `result` is what the phone reported: `"sent"`, `"cancelled"` or `"unknown"` (Android never reports more than "unknown").
- `certificate` is null when no certificate has been made.
- `hash-report.txt` is a plain-text table of every file's name, size, SHA-256, SHA-1 and MD5, every record's SHA-256, and the chain head, with times in IST. It is the hash report the Schedule asks to be enclosed.
- `README.txt` repeats section 10 in short.

## 8. BSA s.63 certificate, Part A

The app pre-fills Part A of the certificate in the Schedule to the Bharatiya Sakshya Adhiniyam, 2023 (s.63(4)(c)), as a PDF, with the hash report attached. The field list is from `docs/research/law.md` section 1B (Gazette of Puducherry reproduction). The form text must be checked against the Gazette of India before release.

- **Pre-filled:** device type "Mobile"; make and model from the records; algorithm "SHA256" with each file's SHA-256.
- **Typed in by the user:** name; relation and the relative's name; address; IMEI (the screen shows how to find it: dial `*#06#`); and optionally colour, serial number and other device information.
- **Ticked by the user:** whether they own, maintain, manage or operate the phone.
- **Left blank for signing by hand:** signature, date, time and place.

The PDF states that s.63(4)(c) also requires Part B, signed by an expert, which the app cannot provide.

## 9. Witness message

One tap composes an SMS to contacts the user chooses, so that people other than the user hold the fingerprint from the time of capture. It contains the chain head, the time (IST) and the place, for example:

```
Saakshi evidence record
SHA-256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
Time: 20/10/2026 14:33 IST
Place: 19.07600, 72.87770 (±13 m)
```

The labels follow the app's language; the hash and numbers do not change. On iPhone the user taps Send in Messages. The app records each message it composes in the manifest's `witness` list.

## 10. How to verify a bundle

With standard tools (`unzip`, `sha256sum`, `openssl`):

1. Unzip the bundle.
2. **Public key:** save the `publicKeyPem` value from `device-key.json` as `key.pem`. Check that `openssl pkey -pubin -in key.pem -outform DER | sha256sum` equals `keyId`, and equals `key.id` in every record.
3. **Signatures:** for each record, run `openssl dgst -sha256 -verify key.pem -signature records/0000.json.sig records/0000.json`. It must print `Verified OK`.
4. **Files:** for each record, `sha256sum media/<file.name>` must equal `file.sha256`, and the size must equal `file.size`.
5. **Chain:** sort records by `sequence`, from 0 with no gaps. Record 0 has `previous` null. Each later record's `previous.recordSha256` must equal `sha256sum` of the previous record file, and its `previous.fileSha256` the previous record's `file.sha256`. The `sha256sum` of the last record file is the chain head; compare it with `chainHead` in the manifest and with any witness message.
6. **Attestation:**
   - Android: verify the certificate chain up to a Google hardware attestation root, check the leaf's public key equals the device key, and read the attestation extension (package name `in.aayushtainwala.saakshi`, the app's signing-certificate digest published with each release, security level, verified-boot state). Also check Google's attestation revocation list.
   - iPhone: verify the App Attest object as Apple documents for servers ("Validating apps that connect to your server"), with App ID `<Team ID>.in.aayushtainwala.saakshi` and `clientDataHash` equal to SHA-256 of the device key's DER public key.

`tools/verify-bundle.mjs` in the Saakshi repository runs steps 2–5 with Node.js and no other dependencies. Version 0.1 of the tool does not check attestation chains (step 6).

## 11. Versions

- **0.1** (this document): records, signatures and chain; Android Key Attestation and Apple App Attest; bundle; certificate Part A; witness message.
- **0.2** (planned, R2): OpenTimestamps proofs for each chain head and record, in `timestamps/<recordSha256>.ots`, listed in the manifest's `timestamps`; upload state for copies in the user's cloud drive.
- **1.1 of the app** (planned): C2PA Content Credentials and sensor readings.

A reader MUST reject a record whose `version` it does not know, and SHOULD tell the user which version it found.

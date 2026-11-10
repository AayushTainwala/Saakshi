# Repair round A brief: evidence that survives (10 Nov 2026)

A review of `main` on 10 Nov 2026 found three places where the events Saakshi is built for (the phone forced off, the app killed, the storage full, the phone's key remade) can lose a recording or make it unverifiable. The owner has approved all three repairs. Read `CLAUDE.md` first, then `docs/BUILD_HANDOFF.md`, `docs/SPEC.md` section 4 (the bullet "Storage" and E1) and `docs/spec/evidence-bundle.md`.

New feature code is paused until these repairs are in. This round changes no feature's scope except where the SPEC's "Storage" bullet says so.

## How to work

- **One builder, three pull requests,** in the order below, each from the latest `main`. Branch names `repair-a/<group>` (for example `repair-a/1-session-file`).
- Every group needs: tests for the logic; typecheck, lint and tests green; both native builds green when native code changes; a report in `docs/BUILD_HANDOFF.md` under `## Report: repair round A` (what was built, what was found, what was not verified); and **plain test steps for the owner** in the pull request description, written for someone who is not a software engineer.
- **Native code needs a review by a session that did not write it** before merging. Say in the pull request that it is waiting for one; do not review your own native code and call it independent.
- Every user-facing string goes through i18n in English and Hindi. Mark new wording `NEEDS OWNER REVIEW` in your report.
- Never hand-edit `ios/` or `android/`. Check a dependency's licence before adding one. No analytics, advertising or crash-reporting SDK.
- **Evidence integrity comes first.** Never modify an original recording. Any change to what a record or a bundle holds is a new bundle-format version, written into `docs/spec/evidence-bundle.md` and `tools/verify-bundle.mjs` in the same pull request, and older bundles must still verify.
- Questions for the owner go in `docs/BUILD_HANDOFF.md` as `- [ ] (Repair A) question`, with your recommendation. Do not change scope without him. If something here turns out to be impossible on a platform, stop and report it.
- Nothing in this round has run on a phone, and neither has the code it changes. List what only a phone can show under "Not verified".

## What exists today

- `src/modules/evidence/locker/store.ts`: the locker's files. `writeText` creates the file if needed and calls `file.writeSync(text)`. `writeSession` writes the whole of `session.json` through it; `readSession` returns `null` if the file is missing or can't be parsed; `listSessions` leaves out any session whose `readSession` is `null`.
- `src/modules/evidence/capture/pipeline.ts`: `commit` and `processCheckpoint` each end with `store.writeSession(this.state)`. While body-cam or Pocket recording runs, that is the whole file rewritten about every 10 seconds.
- `src/modules/evidence/integrity/deviceKey.ts`: `ensureDeviceKey` and `attestIfNeeded` write one `evidence/device-key.json` through `store.writeDeviceKeyJson`, replacing what was there. `src/modules/evidence/export/plan.ts` puts that one file into every bundle.
- The recorders' rates are in `modules/saakshi-evidence` (`CameraRecorder.kt`, `BodyCamRecorder.swift`): 3 Mbit/s for 720p video, 1 Mbit/s for the low-battery file.
- Nothing in the codebase reads the phone's free storage.

## Group 1: the bookkeeping file can't be lost

**The fault.** `session.json` lists a recording's files, its checkpoints and where its chain of signed records has reached. It is rewritten in full, in place. As read in the file library's source on 10 Nov, neither phone's write is all-or-nothing: iPhone writes with `atomically: false`, and Android opens an output stream, which empties the file on opening. A cut-off, a kill or a full storage at that moment leaves the file empty or half-written. The app then leaves the recording out of the list. Its media and signed records are still on the phone, but the app can't show, check, export or finish sealing them. **Confirm this reading against the installed `expo-file-system` before building, and say what you found.**

**Build:**

1. **Write beside, then swap.** Every write of `session.json` goes to a new file beside it and replaces the old one in a single step, so that a readable copy exists at every moment. If the file library can't replace a file in one step on both phones, add a small function to `modules/saakshi-evidence` (iPhone: `FileManager.replaceItemAt` or an atomic write; Android: `Files.move` with `ATOMIC_MOVE`, or `renameTo`). A leftover temporary file from an interrupted write is ignored and cleaned up when the app next opens.
2. **The same for the other small files the locker rewrites:** the device-key file (group 3) and the `pending/` markers.
3. **Rebuild when unreadable.** If `session.json` is missing or can't be parsed, the locker rebuilds it from what is in the session's folder: the signed records and checkpoints in `records/`, the files in `media/`, the `pending/` markers, the witness and certificate files. The signed records are the truth; the bookkeeping is an index of them.
   - Say in your report exactly which fields can't be rebuilt, and what the app shows in their place.
   - A rebuilt session is marked as rebuilt in the bookkeeping (not in any signed record), and the record's screen says so in plain words.
   - A session that can't be rebuilt either is **still listed**, as "This recording's index is damaged", with its files reachable for export. Nothing is ever left out of the list silently.
4. **Stop rewriting the whole file every 10 seconds.** A checkpoint adds one line to an append-only file beside `session.json`; the whole file is rewritten only when a file opens or closes, or something other than a checkpoint changes. Reading a session joins the two. A half-written last line is ignored.
5. **Tests:** a write interrupted before the swap leaves the old file readable; an empty, a truncated and a garbage `session.json` are each rebuilt; a rebuilt session verifies and exports, and its bundle passes `tools/verify-bundle.mjs`; a session with nothing to rebuild from is listed as damaged; a half-written checkpoint line is ignored; a recording in progress when the index is lost carries on and can be sealed.

**Not in this group:** any change to what a signed record holds.

## Group 2: free storage, stage one

The decision is SPEC section 4, "Storage", stage one. Stage two (removing originals that are in the cloud) is **not** in this round.

**Build:**

1. **Reading free space.** One place in `src/modules/evidence` (or `src/platform`) that returns the phone's free space, read through the file library's current call (`Paths.availableDiskSpace`; the old `getFreeDiskStorageAsync` now throws). Find out what each phone reports there (iPhone has several figures for free space) and say which one is used and why.
2. **The safety floor.** A fixed amount Saakshi never records into, so that a closing file's record, its signature and the bookkeeping can always be written. The review suggested about 300 MB; work the figure out from what closing and sealing the largest file needs, and state your reasoning. It is not a setting. At the floor, every recorder stops cleanly.
3. **The "keep free" amount.** A setting under Settings → Storage: how much of the phone to leave for everything else. It starts at 5 GB. The SPEC marks one refinement **Proposed** (5 GB or a tenth of the phone's storage, whichever is smaller): build the setting so the starting value comes from one function, and build the plain 5 GB unless the handoff says the owner has decided otherwise.
4. **What the user is told.** The first time they open body-cam or Pocket recording, and always under Settings → Storage: that these two are made for long recordings; about how much room an hour of video and an hour of sound take (work both out from the recorders' real rates, and say them as "about"); how much is kept free; and what happens when that is reached.
5. **Always shown.** On the Start screen of body-cam, Pocket recording and the evidence camera's video: "Room for about 3 h 20 min of video" (or sound), worked out from free space, the keep-free amount and the rate. Warnings at about 30 and 10 minutes left, said in a way that works in body-cam with the screen dark and locked: check which of sound, vibration and the notification each phone allows there, and report it. Note that `app.config.ts` removes Android's `VIBRATE` permission from every build today; say so in your report rather than changing it, since repair round B decides how a dark screen tells the wearer something.
6. **At the keep-free amount:**
   - **Body-cam drops to sound only** (a setting, on by default). Video stops and the recording carries on as sound in a new file of the same recording, with its end reason and gap recorded as for other handovers.
   - Then the recording **stops cleanly**: the file is closed, hashed, and its record signed, with the end reason `storage-full`.
   - **"My phone is being taken" records past the keep-free amount,** down to the safety floor.
   - **The evidence camera** warns and stops cleanly at the floor only; it has warnings but no automatic stop above it, as with the battery.
7. **Bundle format.** `storage-full` is a new `capture.endReason`, and the sound-only handover needs its own reason too: a new format version, with `tools/verify-bundle.mjs` and the records list's "why it ended" line updated, in English and Hindi.
8. **Starting with too little room.** If Start would begin below the keep-free amount (or below the floor), the screen says so and does not start, except "My phone is being taken", which starts above the floor.
9. **Tests:** the time-left sum; each threshold; the order (sound only, then stop); "My phone is being taken" passing the keep-free amount and stopping at the floor; the end reasons in records and in the checking tool; a failed free-space reading never stops a recording by itself (treat it as unknown, and say so on screen).

**Group 1 goes first** because a full storage is what makes its fault likely.

## Group 3: one file per signing key

**The fault.** The app keeps one `device-key.json` and overwrites it. Every bundle carries the current key. If the phone's key is ever lost and made again (how often phones do this is not known), the old public key is gone, and every recording signed with it fails the check for good.

**Build:**

1. **One file per key, never overwritten:** for example `evidence/keys/<keyId>.json`. Updating a key's attestation rewrites that key's own file (through group 1's safe write) and no other. The existing `device-key.json` is moved into the new place the first time the app opens after the update; nothing is deleted.
2. **Each recording is exported with the key that signed it.** The bundle's `device-key.json` is the file for the `keyId` in that recording's records. If one recording's records name more than one key (the key was remade part-way), the bundle carries each, in a way the format spec defines: a new format version, with `tools/verify-bundle.mjs` checking each record against the key it names. Older bundles still verify.
3. **A key that is gone from the phone's security chip** is noticed when the app next needs to sign: a new key is made, the old key's file stays, and the next record says in plain data that the key changed (the format spec says how). Recording is never refused because a key changed.
4. **Tests:** a second key leaves the first key's file untouched; an old recording exported after a key change verifies; a recording that spans a key change verifies; the first open after the update moves the old file and loses nothing.

## What the owner will test

Write the pull requests' test steps so that he can, on his own phone:
- start body-cam, force the phone off by holding the power button, switch it on, and find the recording listed, playable to the cut and marked interrupted;
- see "Room for about …" on each Start screen, and the storage page in Settings;
- (group 2, where practical) fill a test phone's storage and watch body-cam drop to sound only and then stop cleanly.

## Start prompt (model Opus, effort high)

> You are the builder for Saakshi repair round A. Read CLAUDE.md, docs/BUILD_HANDOFF.md, docs/SPEC.md (section 4, "Storage" and E1), docs/spec/evidence-bundle.md and docs/briefs/2026-11-10-repair-round-a.md. Work through groups 1 to 3 in order, one branch `repair-a/<group>` and one pull request each, from the latest `main`. Each needs tests, green typecheck, lint and tests, green native builds where native code changes, a report in the handoff under "Report: repair round A", and plain test steps for the owner in the description. Native code waits for a review by another session. Raise questions in the handoff as `- [ ] (Repair A) …` and do not change scope.

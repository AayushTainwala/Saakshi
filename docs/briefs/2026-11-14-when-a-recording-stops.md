# Brief: when a recording stops by itself (14 Nov 2026)

Body-cam and Pocket recording are made for long recordings nobody is watching. On 13 and 14 Nov 2026 the owner decided, in one piece, everything that may stop such a recording without the user: the phone's room, a battery reserve, a time limit. He changed the storage behaviour built in repair round A, and asked for all of it to be built together, as the builder's next piece.

Read `CLAUDE.md` first, then `docs/BUILD_HANDOFF.md`, then `docs/SPEC.md`: section 4, "When a recording stops by itself" (all of it), E1 "Recordings that survive a fault", E4, and section 10. Then `docs/spec/evidence-bundle.md` and the report of the round this one reworks, `docs/handoff/repair-round-a.md` (group 2).

The SPEC is the decision. This brief says how to build it, what exists today, and which details were settled by the review session where the owner's decision was silent. Where the two differ, the SPEC wins; say so in your report.

## How to work

- **One builder, three pull requests,** in the order below, each from the latest `main`. Branch names `stops/<group>` (for example `stops/1-storage`).
- Every group needs: tests for the logic; typecheck, lint and tests green; both native builds green when native code changes; a report in `docs/BUILD_HANDOFF.md` under `## Report: when a recording stops by itself` (what was built, what was found, what was not verified); and **plain test steps for the owner** in the pull request description, written for someone who is not a software engineer.
- **Native code needs a review by a session that did not write it** before merging. Say in the pull request that it is waiting for one.
- Every user-facing string goes through i18n in English and Hindi. Mark new wording `NEEDS OWNER REVIEW` in your report. Wording that this round makes untrue (the sound-only step, "does not start below the amount you keep free") is removed or corrected in both languages.
- Never hand-edit `ios/` or `android/`. Check a dependency's licence before adding one. No analytics, advertising or crash-reporting SDK.
- **Evidence integrity comes first.** Never modify an original recording. Any change to what a record or a bundle may hold is a new bundle-format version, written into `docs/spec/evidence-bundle.md` and `tools/verify-bundle.mjs` in the same pull request, and older bundles must still verify.
- **When you build something the SPEC marks "to build",** change its state line in `docs/SPEC.md` to "built" in the same pull request, and add one line to `docs/SPEC_CHANGELOG.md`. Change nothing else in the SPEC, and no sentence that states the law.
- Questions for the owner go in `docs/BUILD_HANDOFF.md` as `- [ ] (Stops) question`, with your recommendation, **in plain words**: say what happens to a user, not what the code does. Do not change scope without him. If something here turns out to be impossible on a platform, stop and report it.
- Nothing in this round has run on a phone, and neither has most of the code it changes. List what only a phone can show under "Not verified".

## What exists today

Built in repair round A, group 2 (#46), and round 2, group 1.5:

- `src/platform/storage/`: `limits.ts` (`SAFETY_FLOOR_BYTES` = 300 MB with its reasoning; `KEEP_FREE_CHOICES_GB`; `startingKeepFreeBytes`, which returns a plain 5 GB and ignores the phone's size); `monitor.ts` (`storageMonitor`, `canStart`, `secondsLeft`); `rates.ts` (the recorders' rates, worked out and not measured; the iPhone evidence camera's rate is an assumed 12 Mbit/s); `settings.ts` (`keepFreeBytes`, `bodyCamSoundOnly`, `explained`; a stored value that is not one of the offered amounts is thrown back to the default); `watch.ts`; `RoomLine.tsx` (the "Room for about …" line and the first-time card).
- `src/modules/evidence/bodycam/storage.ts`: `bodyCamStoragePlan`, which at the keep-free amount drops body-cam to sound only (or stops, with the setting off) and stops at the floor. `BodyCamScreen.tsx` refuses to start at or below the keep-free amount. The native side of the drop is in `BodyCamRecorder.swift` and `CameraRecorder.kt` (with `AdtsFrames.java`), reached through `engine.ts`.
- `src/modules/bugmode/controller.ts` and `instance.ts`: Pocket recording stops at the keep-free amount, or at the floor when started by "My phone is being taken" (`toFloor`), and refuses to start at or below the amount it would stop at.
- `src/modules/evidence/capture/CaptureScreen.tsx`: the evidence camera stops a video at the floor, says once when the phone is below the keep-free amount, and refuses a photo at or below the floor.
- `src/modules/evidence/ui/StorageSettings.tsx`: Settings → Storage.
- `src/platform/battery/`: `monitor.ts` (warnings at 10% and 5%; `HANDOVER_LEVEL` = 5%), `saving.ts` (saving mode, which the recordings switch on at the handover). Body-cam's handover is `native.bodyCamHandOver('low-battery', saving)` in `bodycam/engine.ts`; Pocket recording's is in `bugmode/controller.ts`.
- `app.config.ts` removes Android's `VIBRATE` permission from every build (`ALWAYS_BLOCKED`), and `__tests__/app-config.test.ts` checks that it is gone. `src/platform/haptics` gives only the light tap the swipe uses.
- `src/modules/evidence/integrity/seal.ts` signs a record and calls `store.writeRecord(sessionId, name, body, signature)` (`locker/store.ts`), which writes the record and its signature with the file library's plain write. The one-step write (`writeTextAtomic` in `modules/saakshi-evidence`, `AtomicFile.java` and `AtomicFile.swift`) takes text only.
- `src/modules/evidence/export/contents.ts` still gives `low-battery` in the hash report as "stopped and saved by the app at 3% battery".
- End reasons a record may carry are listed in `src/modules/evidence/types.ts` and `docs/spec/evidence-bundle.md`, section 4; the bundle format on `main` is 0.11.

## Group 1: storage

The decision is SPEC section 4, "Storage".

**Build:**

1. **Take out the sound-only step, on both phones.** Body-cam never drops to sound only to save room. Remove the setting (`bodyCamSoundOnly`), its switch on the Storage page, the sound branch of `bodyCamStoragePlan`, and the native paths that exist only for it. Leave untouched what iPhone does when the app leaves the screen (sound carries on while video cannot record): that is a different thing and stays. The end reason `storage-sound-only` stays in the format and in the checking tool, so that bundles already made still verify; the app never writes it again.
2. **Two floors.**
   - The **safety floor** stays at 300 MB and now applies to video: no video starts below it, and a running video stops at it, in every mode.
   - A **last floor** of about 50 MB: photos and sound can be made below the safety floor, down to it. Work the figure out as round A did for the 300 MB (what closing and sealing a sound file or a photo needs at worst, and a margin for what Saakshi cannot measure), and write the reasoning beside the constant. Nothing is recorded into the last floor.
   - Below the safety floor, a photo or a sound recording shows a plain notice that room is critically low.
3. **A recording may start below the keep-free amount.** Remove the refusals at the keep-free amount. In their place the Start screen says how much room is left and about how many minutes of this kind of recording that is. A video still does not start below the safety floor, nor sound or a photo below the last floor; say why, as today.
4. **Where each recording stops,** always cleanly, with the end reason `storage-full`:

   | Recording | Stops at |
   |---|---|
   | Body-cam, started above the keep-free amount | The keep-free amount |
   | Body-cam, started at or below the keep-free amount | The safety floor (300 MB) |
   | The evidence camera's video | The safety floor, as built. The keep-free amount does not stop it; it says once when the phone is below it |
   | Pocket recording | The last floor. A running sound recording does not stop at the keep-free amount |
   | "My phone is being taken" | The last floor |
   | A photo | Refused only at the last floor |

   The warnings at about 30 and 10 minutes left count down to wherever that recording will stop.
5. **The keep-free amount starts at 5 GB or a tenth of the phone's storage, whichever is smaller** (`startingKeepFreeBytes`). When the phone's size is not known, 5 GB. A phone that already has a stored choice keeps it. The Storage page offers the fixed amounts; when the starting value is not one of them, show it as its own choice at the top, in plain words (for example "A tenth of this phone: 3.2 GB"), and stop `normalizeStorageSettings` from throwing it back to the default.
6. **What the user is told** (the first-time card and Settings → Storage) is brought in line: no sound-only step; a recording may start below the keep-free amount; what happens at the keep-free amount and at each floor.
7. **The rates stay in one place** (`rates.ts`), so that measured figures can replace the worked-out ones. The owner measures them on both phones with the review session's test page; change no rate in this round, and do not set the iPhone evidence camera's rate.
8. **The hash report's words for `low-battery`** (`export/contents.ts`) become exactly: "closed by the app at 5% battery; recording carried on in the next file". The owner approved these words on 13 Nov. Check for the old words anywhere else.
9. **Bundle format.** Section 3, step 8a of `docs/spec/evidence-bundle.md` describes the sound-only step and where each recorder stops. Bring it in line as a new format version, with `tools/verify-bundle.mjs` reading it and every older version still verifying.

**Tests:** each row of the table above; a body-cam recording that starts below the keep-free amount and runs to the safety floor; a photo and a Pocket recording made between the two floors, each with its notice; nothing started below the last floor; the starting keep-free value on a small phone, a large phone and a phone of unknown size; a stored choice kept; a bundle of each older version still verifying; no path left that writes `storage-sound-only`.

**Not in this group:** recording to a memory card (the owner: not for now); Android's exact free-space reading and "My phone is being taken" noticing that its recording has stopped (both repair round B).

## Group 2: the battery reserve, efficiency and the time limit

The decision is SPEC section 4, "Battery", "Efficiency", "Time limit" and "Low battery".

**Build:**

1. **Vibration, first.** The time limit's warning is a vibration, so:
   - Take `android.permission.VIBRATE` out of `ALWAYS_BLOCKED` in `app.config.ts`, correct its comment and `__tests__/app-config.test.ts`, and correct the line in `store/play/data-safety.md` that says it is removed.
   - Add one small place (beside `src/platform/haptics`) that gives the two patterns this round needs: **two pulses**, and **one stronger, continuous vibration for ten seconds**. Repair round B will add the failing camera's patterns to it.
   - It must work on body-cam's dark, touch-locked screen; with the phone's own screen off; and while the app is recording sound. Find out what each phone allows there and report it: on iPhone, whether haptics need to be allowed while recording sound, and how a ten-second vibration is made; on Android, vibration from the foreground service. No sound is played: the microphone would record it.
2. **The battery reserve.** A setting: the battery level at which body-cam and Pocket recording stop, so that the phone is still usable afterwards. It starts at **10%**.
   - The recording stops cleanly, with a new end reason (proposed name `battery-reserve`).
   - **Never while the phone is charging.** A phone unplugged below the reserve stops at the next reading.
   - The Start screen says where the recording will stop ("Stops at 10% battery"), and the screen warns once in words when the battery is 5 points above the reserve.
   - **The steps, and "off"** (owner, 14 Nov): the reserve is chosen from one list: **off**, then 5, 10, 15, 20, 25, 30, 40 and 50%. With it off, nothing stops body-cam or Pocket recording for the battery: they record until the phone dies and hand over at 5% as recordings do today. The Start screen then says so ("Records until the battery runs out") in place of "Stops at 10% battery", and there is no warning 5 points above a reserve.
   - **Started at or below the reserve** (owner, 14 Nov): the recording starts, with a notice saying so; the reserve does not stop that recording, and at 5% it hands over as recordings do today.
3. **"My phone is being taken" ignores the reserve** and the time limit. Its recording behaves at 5% exactly as today (the `low-battery` handover, a new file until the phone dies, saving mode). If it starts over a Pocket recording that is already running, that recording stops being held by the reserve and the limit, as it already stops being held by the keep-free amount (`toFloor`).
4. **Efficiency: two switches, for body-cam only,** both on by default.
   - **For the battery:** when the battery is 5 points above the reserve, body-cam hands over to a new file that uses less power. With the reserve off, or in a recording the reserve does not hold, this switch has nothing to act on: the 5% handover gives the lower-power file, as today. Reuse the low-battery handover exactly (`bodyCamHandOver` with `saving`): iPhone 480p at 15 frames a second; Android the same picture size at 15 frames a second and a lower data rate, with no camera rebuild.
   - **For storage:** when the free room is within **1 GB** (one constant) of where this recording will stop, body-cam hands over to the same lower-power file.
   - The file that closes takes a new end reason for each cause (proposed names `saving-battery` and `saving-storage`). `low-battery` keeps its meaning: the handover at 5%.
   - One handover in a recording: once body-cam is in the lower-power file it stays there to the end, whichever cause comes next. A recording that starts inside either stretch hands over at its first reading.
   - With a switch off, body-cam records at the same quality until it stops.
   - "Room for about …" and the warnings use the lower rate after the handover; add the lower-power file's rate for each phone to `rates.ts`.
   - Saving mode (location every 5 minutes, and the notice to contacts) is **not** switched on by these handovers. It starts at 5%, as the next item says.
   - **Saving mode at 5% whenever a location share is on** (owner, 14 Nov). Today the recordings switch saving mode on at their 5% handover (`setSavingMode` in `src/platform/battery/saving.ts`, connected to live location in the app's root layout), so a location share with nothing recording beside it never slows down; and once the reserve stops ordinary recordings before 5%, that becomes the usual case. Change it so that saving mode follows the battery itself: on at 5% or less while a location share is on and the phone is not charging, whether or not anything is recording; off when the phone is plugged in or the share ends. The contacts are told once for each time it starts, as today. A share started when the battery is already at 5% or less starts in saving mode. It must hold while the app is in the background, as the share itself does; say in the report what each phone allows there.
5. **The time limit.** Two settings, one for body-cam and one for Pocket recording: off until the user sets one, then any whole number of minutes.
   - Counted from the recording's Start (not from each file), on a clock that does not jump when the phone's time is changed.
   - At the limit the recording stops cleanly, with a new end reason (proposed name `time-limit`), so that the user can start another.
   - **Warning:** two pulses one minute before the end, then the stronger, continuous vibration for the last ten seconds. For a limit too short for both, give what fits.
   - The Start screen says when the recording will stop ("Stops after 30 minutes").
6. **When a recording stops by itself** on body-cam's dark screen (room, the reserve or a time limit), the screen lights up and says plainly why it stopped and that the recording is saved. The app stopping a recording does not ask for the secret code; the code is for a person's Stop.
7. **Settings.** One place for the new settings (the reserve, the two efficiency switches, the two time limits), beside Settings → Storage, each with one plain line saying what it does.
8. **Bundle format.** The new end reasons are a new format version. `tools/verify-bundle.mjs` reads it, refuses the new reasons in a record of an older version, refuses the two efficiency reasons outside body-cam, refuses the reserve's and the limit's reasons in a recording started by "My phone is being taken", and refuses any of them in a record marked interrupted. The record screen's "Ended:" line and the hash report gain words for each, in English and Hindi (`NEEDS OWNER REVIEW`).

**Tests:** the reserve stopping body-cam and Pocket recording, and not while charging; the reserve off (nothing stops for the battery, and the 5% handover as today); saving mode starting at 5% with a location share on and nothing recording, ending when plugged in, and the contacts told once; unplugging below the reserve; starting below the reserve; "My phone is being taken" passing the reserve and the limit, including when it starts over a running Pocket recording; each efficiency switch on and off; both causes in one recording giving one handover; the time limit and both warnings at the right moments, including a short limit; the limit unaffected by a change to the phone's clock; each new end reason in signed records, in a bundle that passes the checking tool, and refused where the list above says.

## Group 3: signed records written in one step

The decision is SPEC E1, "Recordings that survive a fault" (the first of the six rare faults).

**The fault.** A signed record and its signature are written once, with the file library's plain write, and are not flushed to storage. A cut-off at that moment can leave the newest record half-written. The app ignores a record with no signature beside it, so nothing breaks, but that checkpoint is lost.

**Build:**

1. Give the native one-step write a second form that takes bytes (the signature is not text), in `AtomicFile.java` and `AtomicFile.swift`, with the same write-beside, flush and rename.
2. `store.writeRecord` writes the record and then its signature through the one-step write. Keep the rule that a record counts only when its signature is beside it. Every signed record goes this way: files, checkpoints, and the records of copies made for sharing (`export/playableCopy.ts`, `export/joinedCopy.ts`).
3. Extend `modules/saakshi-evidence/verify/atomic-write.sh` to the bytes form.
4. **Report the cost.** A checkpoint is signed about every 10 seconds, so this adds two flushes every 10 seconds while recording; round A's report notes that a full flush on iPhone can take tens of milliseconds. Say what you can work out, list the rest under "Not verified", and do not weaken the flush to save time without reporting it.

**Tests:** a write interrupted before the rename leaves no half-written record or signature; a record with no signature is still ignored; a recording carries on if one write fails; bundles verify as before. No change to what a record holds, so no format version.

## What the owner will test

Write each pull request's test steps so that he can, on his own phone:

- start body-cam and Pocket recording on a phone that is below the keep-free amount, and see the notice with the room and the minutes left;
- (where practical, on a test phone with its storage filled) watch body-cam stop at the keep-free amount, and Pocket recording carry on past it;
- set the battery reserve, and see a recording stop there and not stop while charging; switch the reserve off, and see the Start screen say that it records until the battery runs out;
- set a time limit of three minutes, and feel the two pulses at one minute and the long vibration for the last ten seconds, with the phone on his chest and the screen dark;
- switch each efficiency switch on and off, and see the difference in the recording's files.

## Start prompt (model Opus, effort high)

> You are the builder for Saakshi's round "when a recording stops by itself". Read CLAUDE.md, docs/BUILD_HANDOFF.md, docs/SPEC.md (section 4, "When a recording stops by itself"; E1, "Recordings that survive a fault"; E4; section 10), docs/spec/evidence-bundle.md, docs/handoff/repair-round-a.md (group 2) and docs/briefs/2026-11-14-when-a-recording-stops.md. Work through groups 1 to 3 in order, one branch `stops/<group>` and one pull request each, from the latest `main`. Each needs tests, green typecheck, lint and tests, green native builds where native code changes, a report in the handoff under "Report: when a recording stops by itself", the state lines in docs/SPEC.md changed to "built" with a line in docs/SPEC_CHANGELOG.md, and plain test steps for the owner in the description. Native code waits for a review by another session. Raise questions in the handoff as `- [ ] (Stops) …`, in plain words with your recommendation, and do not change scope.

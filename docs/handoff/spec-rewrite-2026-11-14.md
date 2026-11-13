# The spec rewrite of 14 Nov 2026: where every decision went

> [SPEC.md](../SPEC.md) was rewritten on 14 Nov 2026 as settled text. This ledger lists every decision in the old text (the version at commit `26154f5`), in the old text's order, and says where each one is now. Nothing was dropped: a decision is either **kept**, **replaced** by a later decision of the owner's (the old one is then in [SPEC_CHANGELOG.md](../SPEC_CHANGELOG.md)), or was **history** (a note of what something used to be, now in the change log).
>
> "Word for word" marks the sentences that state or touch the law. They were copied unchanged, and a script compared them with the old text before this was merged (the list is at the end).

## Before: the decisions in the old text

### Opening note, and sections 1 to 3

| # | Old text | Now |
|---|---|---|
| 1 | Decisions come from the scope board; module codes are the board's; comment with `[AT: ...]`; sequencing is in BUILD_PLAN | Kept, opening note |
| 2 | Items marked "Proposed" await the owner | Kept, "How to read this"; all such items are now in section 10 |
| 3 | Round 2 is in sections 4, 5 and 6, and in the round 2 brief | Kept as a pointer at the top of section 5; the dates are in the change log |
| 4 | What the app is (one paragraph) | Kept, word for word, section 1 |
| 5 | Working name Saakshi; fallback Shamash | Kept, section 1 |
| 6 | Ground rules: protect yourself; one complete app; interoperable; nothing leaves the phone unless turned on, with three opt-in exceptions; backups are the user's choice; law from statutes and judgments only; self-protection only; modular; survives a block | Kept, word for word, section 2 (the date on "backups" is in the change log) |
| 7 | Native apps only; Android APK then Play; iPhone TestFlight then App Store; English and Hindi | Kept, word for word, section 3 |

### Section 4: E1

| # | Old text | Now |
|---|---|---|
| 8 | SHA-256 of each file when it closes | Kept, E1 |
| 9 | A record with hash, time, position and accuracy, make and model, app version | Kept, E1 |
| 10 | Signed with a key in the security chip, with key attestation | Kept, word for word, E1 |
| 11 | A video is one file with one fingerprint and one record; records are chained | Kept, E1 |
| 12 | A cut-off video stays playable and is signed at the next open, marked interrupted | Kept, E1 |
| 13 | The build cost of the cut-off-safe format is checked and reported before it is built | History (it was done in October): change log, 20 to 22 Oct |
| 14 | Android: the `.ts` original is the evidence; an MP4 copy, labelled, with its own signed record, for playing and sharing; sharing always sends the copy | Kept, E1 |
| 15 | Battery: warnings at 10% and 5%; the evidence camera never stops by itself | Kept, E1 and "Battery" |
| 16 | Battery: the 3% stop-and-save of 21 and 22 Oct is replaced | History: change log, 6 Nov |
| 17 | Storage: body-cam and Pocket recording are made for long recordings, so the app manages the phone's room | Kept, "When a recording stops by itself" |
| 18 | A safety floor of about 300 MB, fixed, the builder to confirm the figure; never recorded into; at the floor everything stops | **Replaced** (13 and 14 Nov): 300 MB confirmed; it now stops video only, and a last floor of about 50 MB is where everything stops. "Storage" |
| 19 | A keep-free amount the user sets, starting at 5 GB or a tenth of the phone, whichever is smaller | Kept, "Storage" |
| 20 | As first built the keep-free amount starts at a plain 5 GB | History: change log, 10 Nov; the tenth is in the new brief |
| 21 | What the user is told, the first time and under Settings → Storage | Kept, "Storage" (the last item now names the floors as well) |
| 22 | Always shown: time left on each Start screen; warnings; how much Saakshi's recordings take | Kept, "Storage" |
| 23 | At the keep-free amount body-cam drops to sound only, on unless switched off | **Replaced** (13 and 14 Nov): body-cam never drops to sound only to save room. "Storage" |
| 24 | Then the recording stops cleanly with the end reason `storage-full` | Kept, "Storage" (where each recording stops is now set out line by line) |
| 25 | "My phone is being taken" records past the keep-free amount, down to the safety floor | Kept in substance: it is not held by the keep-free amount; being sound, it now runs to the last floor. "Storage" and 5.4 |
| 26 | Stage two: making room from the cloud, under four rules | Kept, word for word, E7 |
| 27 | Stage two is switched on only after the owner's research; until then the app makes no claim either way | Kept, word for word, E7 |
| 28 | Front and back camera (not during a video); pinch to zoom; 0.5×, 1× and 2× buttons | Kept, E1 |
| 29 | Switching camera during a video, and front and back at once, await the owner's decision | **Settled** (6 Nov, recorded in the answered questions but not in the old spec): not built for now. E1 |
| 30 | Physical damage is not solved for in v1 | Kept, E1 |
| 31 | A stamped copy when sharing, never a stamped original; no setting; the reasons; rights prompts stay off the picture | Kept, E1 |
| 32 | The stamped copy is new feature code and waits behind the repairs | Kept, as its state |
| 33 | Before the public release: motion readings. v1.1: C2PA, compass and network readings. The aim, and "nothing makes a recording unquestionable" | Kept, word for word, E1 "More proofs" |

### Section 4: E2 to E7

| # | Old text | Now |
|---|---|---|
| 34 | E2: one tap sends hash, time and place by SMS | Kept, E2 |
| 35 | E2: what the message says; who gets it; the same labelled times everywhere; the format's home | Kept, E2 |
| 36 | E3: OpenTimestamps, our own client because the official ones are LGPL-3.0 | Kept, word for word, E3 |
| 37 | E3 brought forward to before the public release, with a "not earlier than" anchor | Kept, E3 |
| 38 | Several proofs, each saying what it shows; nothing "unimpeachable" | Kept, word for word, E3 |
| 39 | The key check before the beta | Kept, E3 |
| 40 | E4: Part A pre-filled; what the user adds; the PDF states that s.63(4)(c) also requires Part B; the form text checked against the Gazette; printed in English | Kept, word for word, E4 |
| 41 | E4: one profile per phone; no per-certificate override; no form when making a certificate; existing certificates unchanged | Kept, word for word, E4 |
| 42 | E5: every recording with its status; the bundle's contents; ordinary delete; quick delete held back | Kept, E5 |
| 43 | E5: records list and playback | Kept, E5 (and section 9: the list becomes a gallery) |
| 44 | E5: a body-cam or Pocket recording is one recording; the joined copy | Kept, E5 |
| 45 | E5: "built so, for the owner to confirm": nothing plays while recording | **Settled** (6 Nov: kept as built). E5 |
| 46 | E5: export with two actions; the default folder; readable names; the README | Kept, E5 |
| 47 | E5: "built so, for the owner to confirm": "Share sound", and each photo or video shared from its own card | Kept as built so, E5 and section 10 (the owner, 13 Nov: discussed with the viewer's redesign) |
| 48 | E6: rights prompts on screen only, never burned into the video | Kept, word for word, E6 |
| 49 | E7: the user's own cloud account; uploads when there is signal; links to contacts | Kept, E7 |
| 50 | E7: any service the owner designates; round 2 builds Google Drive and iCloud Drive; each one's setup | Kept, E7 |
| 51 | E7: upload parts of 10 seconds, 30 seconds, then one minute; the reason; no live audio | Kept, E7 |
| 52 | E7: "built so": body-cam uses the same schedule | Kept as built so, E7 and section 10 |
| 53 | E7: saving mode's uploads go in bursts | Kept, E7 |
| 54 | E7: whether the on-phone copy is encrypted is the user's choice | Kept, E7 |
| 55 | E7: cloud copies can be obtained from the provider through legal process | Kept, word for word, E7 |

### Section 4: E8, body-cam, low battery, E9

| # | Old text | Now |
|---|---|---|
| 56 | E8: Pocket recording, sound only, on the Record page; "My phone is being taken" uses the same recorder | Kept, E8 |
| 57 | E8: renamed from bug mode | History: change log, 6 Nov |
| 58 | E8: one continuous file with checkpoints; the format; a new file only as a fail-safe | Kept, E8 |
| 59 | E8: it was saved in fixed pieces of 1 to 3 minutes; the `.m4a` pieces | History: change log, 6 Nov |
| 60 | E8: the latest checkpoint's hash to contacts; uploads in parts; parts made without signal upload later | Kept, E8 |
| 61 | E8: "this continues until the battery runs out" | **Replaced** (13 and 14 Nov): Pocket recording stops at the battery reserve; "My phone is being taken" still records to the end. "Battery" |
| 62 | E8: at most one witness message every 10 minutes | Kept, E8 |
| 63 | E8: no 3% auto-save | History: change log, 6 Nov |
| 64 | E8: recording continues with the screen locked | Kept, E8 |
| 65 | E8: the orange dot and the Live Activity; no Live Activity in "My phone is being taken" | Kept, E8 |
| 66 | Body-cam: what it is; Start; the dark locked screen; the Battery Saver prompt | Kept, body-cam |
| 67 | Body-cam: a clean start before the screen goes dark; a position is not a condition | Kept, body-cam |
| 68 | Body-cam: a recorder that fails part-way restarts by itself, without limit, at most 5 seconds between tries, with a vibration | **Replaced** (14 Nov) by the failing-camera design in the owner's words. Body-cam |
| 69 | Body-cam: "Proposed" guard (three short restarts, then wait 30 seconds) | **Replaced** (14 Nov) by the same design; not adopted |
| 70 | Body-cam: unlock with volume-up twice; the locked-screen message | Kept, body-cam |
| 71 | Body-cam: "it was volume-down" | History: change log, 5 Nov (the reason volume-up was chosen stays in the spec) |
| 72 | Body-cam: the practice step | Kept, body-cam |
| 73 | Body-cam: video stops only when iOS stops the camera | Kept, body-cam |
| 74 | Body-cam: one continuous file with checkpoints | Kept, body-cam |
| 75 | Body-cam: "thirty one-minute files is unmanageable" | History: change log, 5 Nov |
| 76 | Body-cam: upload parts; what they are | Kept, E7 |
| 77 | Body-cam: whether a rebuilt copy is primary or secondary evidence is open; nothing in the app may claim either | Kept, word for word, E7 |
| 78 | Body-cam: 720p by default | Kept, body-cam |
| 79 | Body-cam: calls and notifications keep working; iPhone's limit on background video | Kept, body-cam |
| 80 | Body-cam: video and sound in the same file | Kept, body-cam |
| 81 | Body-cam: one record from Start to Stop | Kept, body-cam |
| 82 | Body-cam: the Android notice "with its Stop button" | Kept, without the Stop button, which section 5.3 of the old text had already removed |
| 83 | Low battery: at 5% the file closes as `low-battery` and a new one continues until the phone dies, in Pocket recording, "My phone is being taken" and body-cam | **Replaced in part** (13 and 14 Nov): the reserve now stops body-cam and Pocket recording before 5%; the 5% handover stays for "My phone is being taken". "Low battery" |
| 84 | Low battery: saving mode; full accuracy; who is told and how | Kept, "Low battery" |
| 85 | Low battery: body-cam's new file uses less power, differently on each phone | Kept, "Low battery"; reused by "Efficiency" |
| 86 | Low battery: the bundle format records the handover (0.9) | Kept, "Low battery" |
| 87 | E9 (v1.1): vault, disguised icon, quick lock; quick delete held back | Kept, E9 |

### Section 5

| # | Old text | Now |
|---|---|---|
| 88 | The note that section 5 was rewritten on 6 Nov and what it replaced | History: change log, 6 Nov |
| 89 | 5.1: three swipes; Call 112; "not an emergency service" | Kept, word for word, 5.1 |
| 90 | 5.1: how far a swipe must go (85%) | Kept, 5.1 |
| 91 | 5.1: with a screen reader (built so) | Kept as built so, 5.1 and section 10 |
| 92 | 5.1: Share my location, a plain button (built so) | Kept, 5.1 and section 10 |
| 93 | 5.1: the quick trigger opens the swipe screen; no code pad | Kept, 5.1 |
| 94 | 5.2: I need help: what the alert carries; live location for 4 hours | Kept, 5.2 |
| 95 | 5.2: the alert goes at once; until the repairs it waits up to 8 seconds | Kept, 5.2 |
| 96 | 5.2: Share my location is calm, not an alert | Kept, 5.2 |
| 97 | 5.2: the battery level only at 20% or less | Kept, 5.2 |
| 98 | 5.2: worded as alerting trusted contacts, never as an emergency service | Kept, word for word, 5.2 |
| 99 | 5.3: one secret code of 4 digits | Kept, 5.3 |
| 100 | 5.3: the waits (built so); they stop following the clock when the silence alarm is built | Kept, 5.3 |
| 101 | 5.3: reset with the passcode only; only while nothing is running (built so) | Kept, 5.3 and section 10 |
| 102 | 5.3: a recovery code for a phone with no passcode, and for Android 7 to 10 | Kept, 5.3 |
| 103 | 5.3: no Stop control outside the code screen | Kept, 5.3 |
| 104 | 5.3: guessable codes refused (built so) | Kept, 5.3 and section 10 |
| 105 | 5.4: what one swipe starts (the alert, live location, the recording with uploads, the handover, the silence alarm, the lock) | Kept, 5.4 |
| 106 | 5.4: the Android lock (device admin, force-lock only, opt-in); "Now lock your phone" elsewhere | Kept, 5.4 |
| 107 | 5.4: the lock is immediate; the order of work (built so); group 1.7's lock waits | Kept, 5.4 |
| 108 | 5.4: the microphone is essential | Kept, 5.4 |
| 109 | 5.4: restart after the app is killed; the battery setting by maker | Kept, 5.4 |
| 110 | 5.4: the PIN after Saakshi's lock; said only after a phone test | Kept, word for word, 5.4 |
| 111 | 5.4: cannot be stopped without the code; no Live Activity | Kept, 5.4 |
| 112 | 5.4: what this does and does not promise | Kept, word for word, 5.4 |
| 113 | 5.5: S1, one list with three ticks, in Settings | Kept, 5.5 |
| 114 | 5.5: how each person is reached; what round 2 builds; what comes after | Kept, 5.5 |
| 115 | 5.5: S2, SMS by itself in the APK; the Play exception; a phone with no SIM set for texts | Kept, 5.5 |
| 116 | 5.5: S3, live location by link; the map on the page stays | Kept, 5.5 |
| 117 | 5.6: Saakshi-to-Saakshi (pairing, notifications, the received-alerts page, no paid maps, the protocol first) | Kept, 5.6 |
| 118 | 5.7: the silence alarm (2 minutes; who is told; the heartbeat, built so; start sharing early) | Kept, 5.7 and section 10 |
| 119 | 5.8: what Settings holds | Kept, 5.8, with storage and the new settings added |
| 120 | 5.9: the first-open walkthrough | Kept, 5.9 |

### Sections 6 to 8

| # | Old text | Now |
|---|---|---|
| 121 | G3: verified numbers, plus lawyers and medics who consent; updates without a release | Kept, G3; **added** (14 Nov): automatic download, sealed before the public release; the lawyers and medics list parked until after the beta |
| 122 | G4: the chest-mount guide; DIY methods tested before they ship | Kept, G4 |
| 123 | G5: what the guide covers, including "what police may ask of a phone" | Kept, word for word, G5; **added** (13 Nov): that point is left out until researched, with the next on-phone cycle |
| 124 | G5: the phone setup the walkthrough covers (six points) | Kept, G5 |
| 125 | G5: a power-off lock is an essential safety feature; requests filed at release | Kept, G5 |
| 126 | G6: Hindi | Kept, G6 |
| 127 | O1: offline communication | Kept, O1 |
| 128 | G1 and G2 (v1.1) | Kept, word for word, section 6 |
| 129 | Unlawful detention: the three points, and the limit in BNS s.37 | Kept, word for word, section 6. The builder's question on Explanations 1 and 2 is in section 10; the sentence is unchanged |
| 130 | Section 7: after round 2; v1.1; ideas for later; snatch detection not wanted; v2; the companion app | Kept, section 7 |
| 131 | Section 8: Expo and native modules; the open bundle format; Supabase and what it holds; the plan reviewed before the beta | Kept, section 8 |
| 132 | Section 8: our own web address | Kept, section 8; **added**: the names, and bought before the beta build goes to testers |
| 133 | Section 8: no analytics; MIT | Kept, word for word, section 8 |

## After: what is in the new text that the old text did not hold

| New text | From |
|---|---|
| "How to read this": the four states, "built so", "Proposed" | The rewrite (owner, 14 Nov: what is built and what is only decided marked plainly) |
| A state on every feature | The builders' reports in [handoff/](.) and `main` at `26154f5` |
| E1, "Recordings that survive a fault": the index written safely and rebuilt; witness notes in the log; one file per key | Repair round A (#45, #47), built on 10 Nov and never written into the spec |
| The same part: signed records in one step; late signing; the ZIP button and size; a key that cannot be used; recordings whose key was written over | Owner, 13 and 14 Nov (the six rare faults) |
| E4: the hash report's low-battery words | Owner, 13 Nov |
| Body-cam: a camera that keeps failing, in four steps, with no video tries while the question is on screen | Owner, 14 Nov |
| "When a recording stops by itself": the two floors, starting below keep-free, where each recording stops, no sound-only step, no external memory, measured rates | Owner, 13 and 14 Nov |
| The same part: the battery reserve, the two efficiency switches, the time limit and its warning, "My phone is being taken" exempt | Owner, 13 and 14 Nov |
| 5.2: "I need help" goes at once with no countdown; 5.3: a Stop when no code is set; 5.4: the swipe when no code is set, stopping stops everything, the Play listing's wording; "Low battery": plugging in | Owner, 9 and 10 Nov; recorded until now only in the answered questions |
| 5.4: its screen says when its recording has stopped | Found in repair round A; queued for round B |
| Section 9, "Look and feel" | Owner, 13 and 14 Nov |
| Section 10, "Open with the owner" | Gathered from the old text's "Proposed" and "built so" marks, the builders' open questions and the owner's parked answers |
| Section 10: three details the review session filled in (the evidence camera and the keep-free amount; starting below the reserve; the reserve's steps) and one proposal (saving mode with no recording running) | The review session, 14 Nov, for the owner to confirm |

## The sentences checked word for word

Each of these is in the new text exactly as it was in the old (checked by script on 14 Nov 2026): the paragraph of section 1; every ground rule of section 2; the attestation line of E1; "nothing makes a recording unquestionable"; the OpenTimestamps and LGPL sentence; "Nothing is described as 'unimpeachable' or beyond question"; the whole of E4's first paragraph and its profile paragraph; E6; E7's sentence on legal process, its four rules for making room and the two sentences on the owner's research; the sentence on primary or secondary evidence; "Saakshi is not an emergency service and never says so"; "never as an emergency service"; the sentence on the PIN after Saakshi's lock; "What this does and does not promise"; G5's opening sentence; "No app can put a code on power-off"; G1; and the whole unlawful-detention block with its BNS s.262 and s.37 sentences.

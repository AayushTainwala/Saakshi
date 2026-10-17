---
title: "Protestor Assist Research — Open Source and Licences"
type: research
project: "[[Protestor Assist — Hub]]"
hub: "[[Protestor Assist Research — Hub]]"
created: 2026-10-16
updated: 2026-10-16
tags: [protestor-assist, research]
---

> Existing open-source projects worldwide that the app can reuse, with licences read from each repository, maturity evidence and what we can take.

# Open-source reuse research: protester-safety app (RN/Expo, iOS + Android, open source on GitHub)

Research date: 16 Oct 2026.

**How licences were checked.** Licences marked **[LF]** come from the repo's actual LICENSE file, fetched from raw.githubusercontent.com this session. The GitHub API was blocked for this session, so last-activity dates come from the GitHub Releases pages. Where a releases page showed no year, that is noted. GitLab, Codeberg and deps.dev were unreachable through the proxy, so the GitLab-hosted ProofMode repos were checked only through rendered pages and docs.rs. Licences marked **[page]** come from a rendered web page, not the file itself.

## Licence ground rules for our app

- **GPLv3 code** (ProofMode-Android, Briar, bitchat-android, Meshtastic, Haven, FadCam, Panic Button, Umbrella). Copying or linking this code makes our whole app GPLv3.
  - **App Store:** VLC was pulled from the iOS App Store in 2011 after a GPL complaint ([Engadget](https://www.engadget.com/2011-01-09-the-gpl-the-app-store-and-you.html)). The App Store's usage rules conflict with GPL's "no further restrictions" clause.
  - **Who can complain:** this only matters if a *copyright holder of code we incorporated* objects. Our own GPL code doesn't stop us, because we are the copyright holder.
  - **Recommendation:** use MIT/Apache-2.0 for our app. Treat GPL projects as **reference designs or concepts only**, and do not copy their code.
- **LGPL** (OpenTimestamps clients, PanicKit). Usable from an open-source app, because users can rebuild it. It is awkward in a closed app, which isn't our case.
- **Content licences:**
  - CC BY is free to adapt.
  - CC BY-SA forces our adapted content to carry the same licence.
  - CC BY-NC is fine for a free, non-commercial app, but it blocks any later paid tier or commercial white-label.
  - CC BY-ND / BY-NC-ND allows no adaptation or translation, so link only.

---

## 1. Tamper-evident evidence capture / provenance

| Name | Repo | Licence | Platforms | Activity | Maturity / independent evidence | What we could reuse | Licence implication |
|---|---|---|---|---|---|---|---|
| **ProofMode (Android app)** – Guardian Project | github.com/guardianproject/proofmode-android (also guardianproject/proofmode mirror) | **GPL-3.0 [LF]** | Android (iOS app is on App Store; source on GitLab) | Active. Latest release 3.3.0 Alpha 3 (4 Aug) and 3.3 BETA 3 pre-release (5 Aug); year not shown, but README cites an April 2026 C2PA conformance doc | Long-running (since 2017). README says "fully C2PA conformant (spec 2.3)" with a Guardian Project conformance application. No independent audit or court use found this session. | **Concept and data model.** Repo has separate modules: android-libproofmode, android-opentimestamps, android-nostr, android-libproofcam | GPLv3, so do **not** copy the code. Mirror the design instead. |
| **ProofMode Rust core** (`proofmode` crate) | gitlab.com/guardianproject/proofmode/proofmode-rust; docs.rs/proofmode | **Apache-2.0 [page]** (docs.rs metadata + GitLab page; LICENSE file not fetched, GitLab blocked) | Rust; optional `uniffi` (mobile bindings) and `wasm-bindgen` | v0.9.0, 21 Sep 2026 (active) | Same team as ProofMode. Depends on `opentimestamps` and `pgp`; `c2pa` is optional. | **Library.** Strongest code-reuse candidate: build via uniffi into an Expo native module | Apache-2.0 is compatible. **Verify the LICENSE file on GitLab before relying on it.** |
| **Simple C2PA** (Guardian Project) | gitlab.com/guardianproject/proofmode/simple-c2pa(-ios) | Not verified (GitLab blocked) | Android, iOS | Linked from proofmode.org/c2pa | Used inside ProofMode | Library, if its licence is permissive | **Check the licence.** |
| **CameraV / InformaCam** | github.com/guardianproject/CameraV, /InformaCam | **GPL-3.0 [LF]** | Android | Superseded. ProofMode README calls it a complex app with a proprietary data format | Historical (WITNESS partnership era) | Concept only | Do not reuse |
| **Tella** – Horizontal | github.com/Horizontal-org/Tella-Android, /Tella-iOS | **MIT [LF]** (© 2025 Horizontal) | Android, iOS (native Kotlin/Swift, not RN) | Very active. Tella 3.4.0 on 6 Oct 2026; 3.3.2 on 26 Aug 2026 | **Audited several times:** Subgraph via OTF Red Team Lab (published Jun 2023, low/medium findings); 2024-08-30 pentest report; 2026-07 Convocation Research+Design audit of Tella 3.0.0+ (reports on tella-app.org and opentech.fund). Widely used by human-rights NGOs. | **Code and design reuse, now permissive.** Encrypted vault, camouflage/hidden-app mode, quick-delete, upload to NGO servers, metadata capture. Port ideas into RN or lift native modules. | MIT is fully compatible. Big win. |
| **eyeWitness to Atrocities** (IBA) | — | **Not open source** (no public repo found) | Android (iOS later) | Active NGO | **Strongest legal track record:** footage was used in the Sept 2018 Bukavu (DRC) military-tribunal conviction for crimes against humanity, described as the first time eyeWitness footage was used as incriminating evidence; material was also submitted to the ICC (Palestine) and the OSCE (Ukraine) ([RightsCoLab](https://rightscolab.org/case_study/eyewitness-to-atrocities/)) | **Concept:** capture-time hash and metadata, upload to a trusted custodian server, a documented chain of custody, and expert testimony | n/a. Possible partner, not a code source |
| **c2pa-rs** (CAI / Adobe) | github.com/contentauth/c2pa-rs | **MIT OR Apache-2.0 [LF]** | Rust (all) | Active, industry standard | Reference C2PA implementation used by Adobe, camera OEMs and others | Core library for "Content Credentials" manifests | Compatible |
| **c2pa-android** / **c2pa-ios** | github.com/contentauth/c2pa-android, /c2pa-ios | **MIT + Apache-2.0 [LF]** (© 2025 Guardian Project) | Android AAR / iOS Swift | Young (≈44 commits, 13 stars on Android) | Supports Android Keystore/**StrongBox** hardware signing (TEE fallback) and callback/remote signers | **Wrap both in one Expo Module.** Best path to standard, verifiable manifests. | Compatible |
| **c2pa-js** | github.com/contentauth/c2pa-js | **MIT [LF]** | Browser/Node (WASM) | Active | — | Our **verifier web page** (drop a file and see the manifest) | Compatible |
| **@rolobits/attestation-photo-mobile** | github.com/rolobits/attestation-photo-mobile | **MIT [LF]** | RN 0.73+, iOS 14+/Android 28+ | v1.3.0 (2025) | Small, unproven. Self-signed certs (no CA chain yet); root detection is heuristic. Photos only. | Reference or starting point for an RN C2PA + Secure Enclave/StrongBox module | Compatible |
| **OpenTimestamps** clients | github.com/opentimestamps/opentimestamps-client, java-opentimestamps, javascript-opentimestamps | **LGPL-3.0 [LF]** | Python/Java/JS | Mature, low churn | Widely used Bitcoin-anchored timestamps. **Not offline:** the digest must reach a calendar server, and the proof completes after a Bitcoin block (hours). Offline we can only queue, which proves "existed by submission time". | Submit SHA-256 digests when back online; store the .ots file | LGPL is OK in an open-source app, or reimplement the simple HTTP calendar protocol |
| **RFC 3161 TSAs** (FreeTSA.org; DigiCert/Sectigo/GlobalSign public TSAs) | — | Service terms vary (not verified this session) | Any (HTTP) | — | RFC 3161 is a recognised standard; tokens carry a TSA signature | Second, independent timestamp alongside OTS (needs internet) | Check each TSA's terms of use |
| **RN hashing:** react-native-blob-util `fs.hash(path,'sha256')`, react-native-fs `hash()`, react-native-quick-crypto `createHash().update()` (streaming) | RonRadtke/react-native-blob-util; itinance/react-native-fs; margelo/react-native-quick-crypto | **MIT [LF]** (all three) | iOS/Android | blob-util and quick-crypto active; react-native-fs less so | quick-crypto docs show chunked processing of a 500 MB file at about 5 MB RAM | **Hash multi-GB videos natively without loading them into JS.** Avoid `expo-crypto`: its `digest` is in-memory only, with no file or streaming API. | Compatible |
| **@expo/app-integrity** | expo/expo monorepo | **MIT [LF]** (expo/expo) | iOS (App Attest, Secure Enclave key) + Android (Play Integrity; Keystore hardware-attested key + cert chain) | **Alpha**: "frequent breaking changes" | Official Expo package | Device/app attestation, plus a hardware-attested signing key whose cert chain proves key-in-hardware | Compatible. Note: Play Integrity depends on Google services, and attestation goes through Apple/Google servers. |

**What ProofMode records (our model).** Per its README:

- A SHA-256 hash of each photo or video.
- An app-generated OpenPGP keypair (no account needed). The key signs the media file and also signs a separate **sensor-snapshot CSV** captured at capture time.
- The original file is left untouched; all proof data sits in separate files that are easy to share.

The repo also contains OpenTimestamps and C2PA modules. From ProofMode's public docs, not re-verified line by line this session, the proof bundle typically also holds:

- a JSON/CSV with device info, location (GPS/network) and network/cell info;
- a `.asc` PGP signature;
- a `.ots` OpenTimestamps proof;
- a Google SafetyNet/Play Integrity attestation;
- since v3, a C2PA manifest.

**Recommendation (category 1).** Rebuild ProofMode's design rather than its GPL code, using permissive parts:

- `proofmode-rust` (Apache-2.0; confirm the LICENSE file), or c2pa-android/c2pa-ios (MIT/Apache), wrapped as an Expo native module;
- react-native-blob-util or quick-crypto for streaming SHA-256;
- `@expo/app-integrity` for hardware keys and attestation;
- OpenTimestamps plus one RFC 3161 TSA, queued for when the phone is back online.

Borrow Tella's (MIT) vault, camouflage and quick-delete ideas and code. For court-readiness, copy eyeWitness's chain-of-custody *process* (custodian server, hash log, expert-witness readiness). That process, not the crypto, is what got footage admitted in the DRC.

---

## 2. Offline / internet-shutdown communication

| Name | Repo | Licence | Platforms | Activity | iOS↔Android? | Broadcast + DM? | Security evidence | Reuse |
|---|---|---|---|---|---|---|---|---|
| **bitchat (iOS/macOS)** – Jack Dorsey / permissionlesstech | github.com/permissionlesstech/bitchat | **Unlicense / public domain [LF]** | iOS, macOS (Swift) | Very active (≈1,078 commits, 36.5k★) | README of the Android port claims binary-protocol compatibility | Yes: public mesh/geohash channels plus Noise-encrypted DMs; Nostr fallback when online | **No external audit.** Trail of Bits (18 Jul 2025): an identity-auth MITM was shown by Alex Radocea; a buffer overflow was fixed; Noise was adopted afterwards; "should absolutely not rely on Bitchat for sensitive communications". README itself warns of a persistent per-device identifier visible to nearby radios and a non-standard Nostr envelope. Real-world use: about 50k Nepal downloads on 8 Sep 2025; about 70k in Madagascar in a week (Sept 2025); spikes in Uganda and Iran (Jan 2026); removed from China App Store (Apr 2026) ([Wikipedia](https://en.wikipedia.org/wiki/BitChat)) | **Protocol and Swift code freely reusable.** Best licence in this category. |
| **bitchat-android** | github.com/permissionlesstech/bitchat-android | **GPL-3.0 [LF]**. **Red flag:** README says "released into the public domain", but LICENSE.md is the full GPLv3 text. Wikipedia says MIT, which is also wrong per the file. | Android (Kotlin) | Active. 1.7.4 on 17 Jun (year not shown, presumably 2026); 866 commits, 7.7k★ | Claims full protocol compatibility with iOS | Same as iOS | Same as iOS; Noise XX (X25519/ChaCha20-Poly1305), max 7 hops, Wi-Fi Aware | **Do not copy the code** unless the maintainers confirm the licence in writing. Reimplement from the iOS (public-domain) source and protocol whitepaper instead. |
| **Berty / Wesh protocol** | github.com/berty/berty, github.com/berty/weshnet | **MIT + Apache-2.0 dual [LF]** | iOS + Android. **The Berty app itself is React Native + Go (gomobile).** | Very active: v2.471.14 on 3 Jul 2026 | Yes in design: BLE proximity driver on both, plus Apple Multipeer (iOS↔iOS) and Android Nearby (Android↔Android). Cross-platform BLE interop is from Berty's architecture docs; not tested this session. | Groups and 1:1, IPFS/libp2p-based, works offline and online | **Unaudited.** Berty's own "Berty not war ready" post (1 Mar 2022) says it should not be used in crises yet, reports high battery use, and plans a community-funded audit. No audit found since. | **Most directly reusable for an RN app:** the Wesh library and Berty's RN/Go bridge and BLE drivers. Commission an audit before recommending it to protesters. |
| **Briar** | code.briarproject.org (GitHub mirror briar/briar) | **GPL-3.0-or-later [LF]** | Android + desktop. **No iOS.** FAQ: "Probably not", because iOS background limits clash with no-push design; Briar Mailbox may help later. | Active (via GitLab; not dated this session) | **No** | Private groups, forums, blogs, DMs over Bluetooth / Wi-Fi / Tor | **Best audited:** Cure53 (2017) and Radically Open Security via OTF (Sep–Oct 2023, retest Feb–Mar 2024): 1 moderate and 5 low findings; 4 fixed, 2 open ([OTF](https://www.opentech.fund/security-safety-audits/briar-security-audit/)) | Concept only (GPL). **Recommend Briar to Android users** inside our app (deep link) rather than reimplementing it. |
| **Bridgefy SDK** | github.com/bridgefy/sdk-android (+ bridgefy-react-native wrapper) | **Proprietary "Bridgefy SDK License Agreement" [LF]**. The RN wrapper is MIT [LF] but wraps the proprietary SDK. | iOS + Android | Commercial, maintained | Yes | Yes | **Repeatedly broken:** Albrecht et al. 2020/21, "Mesh Messaging in Large-scale Protests: Breaking Bridgefy" (tracking, impersonation, reading DMs, network shutdown) ([ePrint 2021/214](https://eprint.iacr.org/2021/214)); "Breaking Bridgefy, again" (USENIX Security 2022), where the Signal-protocol retrofit was misused and still unresolved by June 2022; a 7asecurity audit (published Jul 2023) found multiple criticals, many fixed. Used in Hong Kong 2019 and Indian CAA protests ([Wikipedia](https://en.wikipedia.org/wiki/Bridgefy)). | **Avoid.** Proprietary, so it cannot ship in a fully open-source app, and it has a poor security history. |
| **Meshtastic** | github.com/meshtastic/Meshtastic-Android, /Meshtastic-Apple, /firmware | **GPL-3.0 [LF]** (all three) | Needs a **LoRa radio** (phone pairs to the radio by BLE) | Very active: Android v2.8.1 on 20 Aug 2026 | Yes, via radios | Channels + DMs | **CVE-2025-52464** (CVSS 9.5 CNA / 8.3 NIST): vendor-cloned duplicate keys and low-entropy keygen let attackers decrypt DMs, fixed in 2.6.11/2.6.12 ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-52464)). Default public channel keys are well known. | Optional interop later. Talk to a radio over BLE using the protobuf API, which avoids GPL code linkage if we write our own client (legal review advised). |
| **Serval Mesh** | github.com/servalproject/batphone | **GPL-3.0 [LF]** | Android | Effectively dormant (no recent releases known) | No | — | Academic project | Concept only |
| **FireChat** (Open Garden) | — | Proprietary | — | **Dead** (shut down) | — | — | Used in Hong Kong 2014 | Cautionary tale only |
| **Google Nearby Connections** | github.com/google/nearby | **Apache-2.0 [LF]** | Android (Play services); iOS library exists | Active | **iOS↔Android over BLE not working**: issue #1619, maintainers say BLE is "not yet enabled… for public builds"; Monzo reports iOS-Android BLE "don't currently seem possible" | Primitive only | — | Android↔Android fast path only |
| **Apple Multipeer Connectivity** | (Apple framework) | Apple SDK | iOS/macOS only | — | **No** | Primitive | — | iOS↔iOS fast path only |
| **RN BLE libraries:** react-native-ble-plx, react-native-ble-manager | dotintent/react-native-ble-plx; innoveit/react-native-ble-manager | **Apache-2.0 [LF]** (both) | iOS/Android | Active | Plain BLE GATT is the **only cross-platform offline primitive** | Low-level | — | Central-role scanning and connecting. ble-plx does not do peripheral/advertising, so a mesh needs a custom Expo module for the peripheral role (my understanding of the library; verify). |

**Recommendation (category 2).** No iOS↔Android offline mesh is both audited and permissively licensed. Ranked:

1. **Implement the bitchat protocol** (BLE mesh, Noise XX, public channels plus DMs) in an Expo native module. Port from the **public-domain iOS code**, not the GPL Android port. This gives interop with the ~hundreds of thousands of existing bitchat users, which matters in a shutdown.
2. **Or adopt Berty's Wesh** (MIT/Apache, already React Native). It has better engineering depth, but it is unaudited and battery-hungry.

Either way:

- Budget for an **independent audit** (OTF's Red Team Lab funds these for open-source tools).
- In the UI, mark DMs as "not proven safe against a determined adversary".
- Steer Android users who need strong security to Briar.
- Never use Bridgefy.

---

## 3. Phone-as-bodycam (background / screen-off recording)

| Name | Repo | Licence | Platforms | Activity | Evidence | Reuse |
|---|---|---|---|---|---|---|
| **FadCam** | github.com/anonfaded/FadCam (also F-Droid com.fadcam) | **GPL-3.0 [LF]** | Android (README shows an App Store badge, iOS status unclear) | Active: v3.0.1 latest stable (16 Dec); v4.0.0-beta10.6 pre-release (17 Aug); 2.8k★ | Background recording with screen off. Auto-repairs recordings broken by OEM battery killers. | Concept only (GPL): foreground-service plus repair pattern |
| **Fossify Camera / Simple Camera** | github.com/FossifyOrg/Camera; SimpleMobileTools/Simple-Camera | **GPL-3.0 [LF]** | Android | Fossify active; Simple Mobile Tools sold/abandoned | Normal camera, no background mode | Not needed |
| **Haven** (motion/sound-triggered recording) | github.com/guardianproject/haven | **GPL-3.0 [LF]** | Android | **Stale**: latest 0.2.1-beta-1 (20 July, year not shown; Travis CI badge suggests ~2019) | Endorsed by Snowden at launch (2017) | Concept: sensor-triggered capture |
| **react-native-vision-camera** | github.com/mrousavy/react-native-vision-camera | **MIT [LF]** | iOS/Android | Very active | De facto RN camera library | **Foreground recording engine.** Pair with our own Android foreground-service module (`foregroundServiceType="camera"`) for screen-off recording. |

**Platform constraint (design constraint, not a choice).**

- **Android** allows camera recording from a foreground service with a persistent notification. OEM battery managers (Xiaomi, Oppo, Vivo, Samsung) still kill it, so plan an onboarding step to whitelist battery optimisation, plus auto-segment and auto-repair.
- **iOS does not allow camera capture in the background or with the screen locked.** AVCaptureSession is interrupted with reason `videoDeviceNotAvailableInBackground`; Apple developer forum threads confirm this. Only **audio** can keep recording in the background.
- **iOS workaround:** keep the app in the foreground with a black "stealth" screen at minimum brightness, plus auto-lock disabled while recording. Screen-off video on iOS is not achievable.

**Battery and storage.** No rigorous independent measurement of continuous phone recording was found.

- **Storage:** Google's Pixel dashcam uses about 30 MB/min, roughly 1.8 GB/h ([Digit](https://www.digit.in/news/mobile-phones/google-pixel-phones-as-dashcam-how-it-works-features-68047.html/amp/)).
- **Battery:** the article cites user reports of overheating and high power draw.
- **Engineering estimate, not measured:** 720p30 H.264/HEVC with the screen off typically uses about 8–15% of battery per hour on recent phones, so roughly 5–8 h on a full charge. A screen-on "stealth" mode on iOS adds maybe 5–10%/h at minimum brightness. Heat in Indian summer temperatures will throttle or stop recording sooner.
- **Action:** run our own bench test on 3–4 common Indian handsets (budget Xiaomi/Samsung/Realme plus an iPhone) before publishing any claims. Recommend a power bank.
- **Bitrate guide:** 720p at about 3–4 Mbps is about 1.4–1.8 GB/h. Upload in short segments with a hash per segment, so a seized phone has already sent most of its footage.

**Recommendation (category 3).** Build it ourselves with Vision Camera (MIT) plus a small Android foreground-service Expo module. Copy FadCam's ideas, not its code: segmenting, repair, OEM-killer handling. Ship an iOS stealth-foreground mode with honest UI copy saying "iPhone must stay unlocked with app open".

---

## 4. SOS / panic button / live location

| Name | Repo | Licence | Platforms | Status | Evidence / lessons | Reuse |
|---|---|---|---|---|---|---|
| **Panic Button** (Amnesty / iilab / The Engine Room) | github.com/PanicInitiative/PanicButton | **GPL-3.0 [LF]** | Android | **Retired 1 Sep 2017.** No funding after 2013; an unfixed **false-alert bug** from phantom power-button presses; not enough staff ([Engine Room](https://www.theengineroom.org/panic-button-retiring-the-app/)) | The lesson: peer-response plans (their PACT framework) mattered more than the app. Hardware triggers misfire. | Concept and lessons only |
| **PanicKit** (Guardian Project) | github.com/guardianproject/PanicKit | **LGPL-2.1 [LF]** | Android | Old, low activity | Inter-app "panic trigger → responders" protocol (e.g., wipe Tella, lock Orbot) | **Android only.** Could make our app a PanicKit responder or trigger for ecosystem compatibility. LGPL works with an open-source app. |
| **Ripple** (Guardian Project panic trigger) | github.com/guardianproject/ripple | **GPL-3.0 [LF]** | Android | Old | Reference PanicKit trigger app | Concept |
| **Haven** | see category 3 | GPL-3.0 | Android | Stale | — | Concept |
| **Hauk** (live location sharing) | github.com/bilde2910/Hauk | **Apache-2.0 [LF]** | Android + self-hosted PHP server | Not dated this session | Small, self-hostable, end-to-end password option | **Concept and backend reference** for time-limited live-location links |
| **OwnTracks** | github.com/owntracks/android, /ios, /frontend | Android **EPL-1.0 [LF]**; iOS **MIT [LF]**; frontend **MIT [LF]** | Android, iOS | Mature, long-running | Widely used, self-hosted (MQTT/HTTP) | Location-tracking patterns (battery-aware modes). MIT parts are reusable. EPL-1.0 is weak copyleft and incompatible with GPL, but fine alongside MIT. |
| **Umbrella** (Security First) | github.com/securityfirst/Umbrella_android | **GPL-3.0 [LF]** | Android (+iOS) | Unknown | Security-lessons app listed by Front Line Defenders | Concept; check its content licence separately |
| **YouSafe** | github.com/neil-dev/YouSafe | MIT [LF] | Android | Hobby project | None | Not worth reusing |

**Recommendation (category 4).** Nothing mature and cross-platform is worth forking. Build the SOS feature ourselves:

- **Triggers:** an on-screen hold-to-confirm button plus an optional volume-key pattern on Android. Avoid power-button triggers, which caused Panic Button's false alerts.
- **On trigger:** send SMS and data alerts to pre-agreed contacts, start recording, and optionally share a live location link (Hauk/OwnTracks-style self-hosted endpoint).
- **Downstream:** optionally fire a PanicKit broadcast on Android so Tella, Orbot and similar apps lock or wipe.
- **Onboarding:** build a "make a plan with your contacts" step, which Panic Button's own post-mortem says was the real value.

---

## 5. Phone holster / chest mount / neck lanyard

| Model | URL | Licence | Notes |
|---|---|---|---|
| Phone chest mount (parametric), Bent Derailleur | https://www.printables.com/model/1752840-phone-chest-mount-parametric | **CC BY-ND** per STLFinder mirror ([link](https://stlfinder.com/model/julia/6048956)). The Printables page didn't render a licence name, so **verify**. | Velcro-straps onto backpack shoulder straps; parametric phone size; updated 13 Jun 2026. **ND = we may link or redistribute unmodified, but not ship a modified version.** |
| GoPro Smartphone Clamp, PurchenZuPoden | https://www.thingiverse.com/thing:2426538 | **CC BY-NC** (per 3dgo.app mirror) | GoPro-tab phone clamp for 4.5–5.5" phones (6" untested). Pairs with any cheap GoPro chest harness. NC is fine for free distribution. |
| GoPro platform for phone, nathan.bittinger | https://www.thingiverse.com/thing:4313878 (mirror: thangs.com/m/789441) | "Restricted", specific licence not shown | Phone glued with VHB to a thin case on a GoPro tab; chest-harness tested (paramotor); tether holes |
| GoPro Phone Mount Adapter, GerdS | https://www.printables.com/model/192465-gopro-phone-mount-adapter | Not shown on page | Adapter only; needs other parts from Thingiverse |
| Hands-free Smartphone Holder (chest harness with arm), Kryator | https://makerworld.com/en/models/1545573 | **MakerWorld Standard Digital File License** (no redistribution or remix) | Well rated (5.0 from 22 ratings); TPU straps. **Link only.** |
| TPU Headphone/Head POV holder, Infinity Design | https://www.makerworld.com/en/models/1553093 | Standard Digital File License | Head-mounted. Not recommended at protests (conspicuous, easily grabbed). |

**DIY / no-printer options.** No reputable NGO source with a step-by-step DIY harness was found. WITNESS's protest guides ([10 tips](https://www.witness.org/portfolio_page/filming-protests-and-police-abuse/), [Part 4 Production Techniques](https://library.witness.org/product/part-4-filming-tips/)) cover steady framing and safety but not mounts. Suggested methods, based on engineering judgement and **to be field-tested**:

1. **Generic GoPro chest harness plus GoPro phone clamp.** Both are widely sold in India (Flipkart/Amazon listings seen). This is the most robust option and needs no printer.
2. **Backpack shoulder-strap clip.** Use velcro or a commercial strap clip, the same principle as the Printables model above.
3. **Neck lanyard through a phone-case lanyard tab or adhesive loop, plus a waist/chest elastic** to stop swinging. It is cheap but shaky, and a neck cord is a **strangulation and grab risk in crowds**. Recommend breakaway lanyards only.
4. **Shirt-pocket carry with the lens over the pocket edge.** Least conspicuous but gives poor framing.

**Recommendation (category 5).** In-app "how to wear your phone" guide:

- **Default:** a GoPro-harness plus clamp kit.
- **Option for makers:** link to the CC BY-NC Thingiverse clamp and the Printables parametric mount.
- **Licensing:** do not bundle or modify ND or MakerWorld-licensed files; link to them.
- **Optional own design:** a simple strap clip of our own, released under CC BY-SA or CC0, which removes the licence problem.

---

## 6. Know-your-rights and safety content (open licences)

| Source | Licence (verified where) | Adapt / translate? | Notes |
|---|---|---|---|
| **EFF Surveillance Self-Defense** (ssd.eff.org, incl. "Attending a Protest") | **CC BY 4.0**: eff.org/copyright text says "CC BY 4.0 unless otherwise noted"; SSD footer says "CC BY" (badge links to 3.0 US, a minor inconsistency) | **Yes**, with attribution | Best base for digital-security content. Exists in 14+ languages (incl. Urdu, Burmese), but **no Hindi/Marathi** is listed in the menu. US-centric legal bits must be replaced. |
| **WITNESS Library** (Filming Protests, Video as Evidence) | **Ambiguous.** The FAQ states CC BY-NC 4.0 in one place, CC BY-SA in another and CC BY 4.0 in a third ([FAQ](https://library.witness.org/faq/)) | Adaptation is invited ("remix, modify and translate") | **Email feedback@witness.org to confirm.** If BY-NC-SA applies, our adapted text must carry the same licence. Best source for filming-for-evidence guidance (India-specific WITNESS work exists). |
| **Amnesty International** | **CC BY-NC-ND 4.0** (amnesty.org permissions page); translations need written permission and review | **No** adaptation or translation without permission | Link only |
| **ACLU** (Know Your Rights: Protesters) | No open licence found → treat as all rights reserved | No | US law; link only |
| **Netpol** (UK) | No licence found | No | UK law; skip |
| **Front Line Defenders** (Workbook on Security, secure-chat guide; co-develops Security in-a-Box) | No licence on resources page | Unknown | Security in-a-Box is believed to be CC BY-SA (**not verified**) |
| **Access Now** (Digital Security Helpline) | Site footer **CC BY 4.0** | Yes (site text) | **Helpline:** 24/7, 10 languages (no Indian languages), 2-hour response, serves activists/journalists/HRDs. List it in the app as a referral. |
| **Internet Freedom Foundation (India)** | Footer "**CC-BY** unless stated otherwise" (version unstated) | Yes | Current Indian content: Delhi internet shutdown (Oct 2026), SC order to restore internet, Delhi Police drone rules and signal jammers, phone seizures of journalists. No single protest guide found. |
| **SFLC.in** | **CC BY-NC-SA 4.0** (footer) | Yes, non-commercial and share-alike | "Essential resources for protestors" (25 Jul 2026): pocket cards; **RightsLine** pro-bono helpline (takedowns, shutdowns, device seizure); device search & seizure guide in 6+ regional languages; shutdown tracker; mentions BitChat. **Most India-relevant source.** SA means our adapted text would need BY-NC-SA too. |
| **CHRI** (D.K. Basu arrest/detention "Know Your Rights" poster, Hindi & Marathi) | No licence stated | Ask permission, or write our own from the judgment | *D.K. Basu v. State of W.B.* (1997) guidelines. Indian Copyright Act s.52(1)(q) permits reproducing court judgments, so we can draft our own summary directly from the judgment. |
| **HRLN** | Not checked (time) | — | — |

**India legal-content warning.** Most Indian protest guides online (e.g., 2019–20 CAA-era pieces) cite **CrPC/IPC sections**. Since **1 July 2024 these are replaced by BNSS/BNS/BSA**, so any adapted content must be re-cited. This includes the arrest safeguards and the electronic-evidence certificate requirements under the BSA, which replaced s.65B of the Evidence Act.

### Tear gas / pepper spray first aid: evidence

- **Stopyra et al., *West J Emerg Med* 2018; 19(2):294–300**, RCT, n=58: 40 police recruits (OC), 18 soldiers (CS). **Baby shampoo plus water gave no better relief than water alone** at any time point. The article is **CC BY 4.0**, so we can quote and adapt it ([PMC5851502](https://pmc.ncbi.nlm.nih.gov/articles/PMC5851502)).
- **Barry et al. 2008** (cited in Stopyra), small RCT on OC: **Maalox, 2% lidocaine gel, milk and baby shampoo were no better than water.**
- **Minnesota Regional Poison Center, *Crowd Control Agents* triage guideline (2026)**, all rights reserved, so cite it but don't copy:
  - fresh air;
  - remove contact lenses;
  - remove and bag clothing;
  - irrigate with water (cold water gives faster relief; saline for eyes);
  - don't scrub;
  - no bleach;
  - milk, Maalox and lidocaine are not shown better than water;
  - asthma and respiratory symptoms are red flags, and fatal asthma attacks have been linked to riot-control agents.
- **Myth status.** Milk and LAW (liquid antacid + water) are **not harmful in trials but not better than water**. "Use milk" is unsupported rather than debunked as dangerous. Teach **water first**. Oils, vinegar and Vaseline were not covered by these sources; common protest-medic advice is to avoid oils and lotions, but this is **not verified here**.

**Recommendation (category 6).**

- **Digital-security modules:** adapt EFF SSD (CC BY 4.0).
- **Filming-for-evidence:** adapt WITNESS once its licence is confirmed in writing.
- **First aid:** write it ourselves from Stopyra 2018 (CC BY) and cite the poison-centre guideline.
- **Indian legal rights:** write them ourselves from the judgments and BNSS (s.52(1)(q)), with SFLC.in (BY-NC-SA) and IFF (CC BY) as adaptable supplements, and refer to the RightsLine and Access Now helplines.
- **Licensing:** keep app text under **CC BY-SA 4.0** separately from the code licence (MIT/Apache).

---

## Licence red flags (summary)

1. **bitchat-android:** README says "public domain", but LICENSE.md is GPLv3 and Wikipedia says MIT. Treat it as GPLv3 and use the public-domain iOS code instead.
2. **ProofMode Android app** and the GitHub `guardianproject/proofmode` mirror are **GPLv3**. Only the GitLab `proofmode-rust` crate is (per docs.rs) Apache-2.0, so confirm its LICENSE file.
3. **Bridgefy SDK is proprietary.** It cannot ship in a fully open-source app, and the MIT RN wrapper doesn't change that.
4. **GPLv3 everywhere else** (Briar, Meshtastic, FadCam, Haven, Panic Button, Umbrella, Fossify Camera): concept only if we want MIT/Apache and App Store compatibility.
5. **Amnesty content is CC BY-NC-ND** (no translation without permission). **WITNESS licence is ambiguous.** **SFLC.in is BY-NC-SA.** **MakerWorld models** use the no-redistribution "Standard Digital File License".
6. **Tella's current LICENSE files are MIT** (© 2025 Horizontal), on both Android and iOS. This is the biggest licence opportunity. Older forks may carry a different licence, so take code from current main.

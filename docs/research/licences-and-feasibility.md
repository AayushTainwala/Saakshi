---
title: "Protestor Assist Research — Licences and Feasibility"
type: research
project: "[[Protestor Assist — Hub]]"
hub: "[[Protestor Assist Research — Hub]]"
created: 2026-10-17
updated: 2026-10-17
tags: [protestor-assist, research]
---

> The software licences compared for a lawyer (MIT, Apache, GPL and others), which projects carry which, what licences can and can't do for interoperability; and feasibility of live-location start, no-tap messaging, bug-mode triggers, Google Drive upload and offline messaging on iPhone.

# Protestor Assist: Licence study and feasibility checks

Research date: 17 October 2026. Each statement carries one of four markers:
- **[V]**: verified this session against the primary source linked.
- **[V-repo]**: verified from the repository's own LICENSE file, fetched from raw.githubusercontent.com or GitLab.
- **[K]**: from my own knowledge. I could not fetch the primary page from this sandbox (gnu.org, developer.android.com and several Apple support pages were blocked or blank), so check these before relying on them.
- **[U]**: uncertain. Treat it as an open question and test it on real devices.

---

## PART 1: LICENCE STUDY (written for a lawyer new to software licences)

### 1.1 How to read software licences

- A software licence is a **copyright licence**. It is a unilateral permission, usually with conditions attached. Breach of a condition generally ends the permission, and from that point the person is infringing copyright. Most of these licences are not negotiated contracts.
- **Permissive** licences (MIT, Apache-2.0) let you do almost anything with the code, including closing it, provided you keep the notices.
- **Copyleft** licences (GPL, AGPL, LGPL, MPL) let you do almost anything, but if you *distribute* the code or a work based on it, you must release the relevant source under the **same licence**. The licences differ in how far that obligation reaches:
  - **File** (MPL): only the files containing MPL code.
  - **Library** (LGPL): the library and changes to it, but not the program that merely links to it.
  - **Whole work** (GPL): the entire combined program.
  - **Whole work plus network use** (AGPL): the AGPL adds users who interact with the program over a network.
- **No licence grants trademark rights.** Apache-2.0 s.6 says so expressly; the others are silent, and silence grants nothing.

### 1.2 Comparison table

| | **MIT** | **Apache-2.0** | **GPLv3** | **AGPLv3** | **MPL-2.0** | **LGPL-2.1** |
|---|---|---|---|---|---|---|
| Type | Permissive | Permissive | Strong copyleft | Strongest copyleft | Weak copyleft (file-level) | Weak copyleft (library-level) |
| Use, modify, sell, sublicense | Yes | Yes | Yes | Yes | Yes | Yes |
| Keep copyright and licence notice | Yes: "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software" [V](https://opensource.org/license/mit) | Yes, and also carry forward the **NOTICE** file's attributions (s.4(d)) [V](https://www.apache.org/licenses/LICENSE-2.0) | Yes | Yes | Yes | Yes |
| State changes | No | Yes (modified files must carry notices) [V](https://choosealicense.com/licenses/) | Yes | Yes | No (per choosealicense) | Yes [V](https://choosealicense.com/licenses/lgpl-2.1/) |
| Express patent licence from contributors | **No** (silent; an implied licence is arguable) | **Yes** (s.3). It terminates if you sue alleging the Work infringes a patent [V](https://www.apache.org/licenses/LICENSE-2.0) | Yes (s.11) | Yes | Yes | No express grant [K] |
| Must release source when distributing | No | No | Yes, for the whole combined work | Yes, **and** to users interacting over a network (s.13) | Only the MPL-covered **files** ("The copyleft applies to any files containing MPLed code") [V](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) | The library and changes to it. Programs that merely link to it are exempt [V](https://choosealicense.com/licenses/lgpl-2.1/) |
| Trademark | Silent (no grant) | Express: "does not grant permission to use the trade names, trademarks…" (s.6) [V](https://www.apache.org/licenses/LICENSE-2.0) | Silent; s.7(e) permits declining trademark rights [K] | Same as GPLv3 | Express limitation (s.2.3) [V](https://choosealicense.com/licenses/) | Silent |
| Usual home | Small libraries, apps (Tella) | Corporate open source, Android, Rust (c2pa-rs) | Apps that want to stay free (Briar, ProofMode) | Server software (Signal, Mastodon) | Firefox | Libraries (OpenTimestamps uses **LGPL-3.0+**, not 2.1, see below) |

### 1.3 Compatibility: can code under licence X go into a project under licence Y?

"Compatible" means you can combine the two and distribute the result under Y's terms while still meeting X's conditions.

| From → into | MIT project | Apache-2.0 project | GPLv3 project | GPLv2-only project | AGPLv3 project | MPL-2.0 project |
|---|---|---|---|---|---|---|
| **MIT code** | Yes | **Yes** (keep the MIT notice) [K] | Yes | Yes | Yes | Yes |
| **Apache-2.0 code** | Only if the combined work is effectively Apache (keep NOTICE); the MIT parts stay MIT | Yes | **Yes**: "Apache 2 software can therefore be included in GPLv3 projects" [V](https://www.apache.org/licenses/GPL-compatibility.html) | **No**: "the FSF has never considered the Apache License to be compatible with GPL version 2" [V](https://www.apache.org/licenses/GPL-compatibility.html) | Yes | Yes |
| **GPLv3 code** | **No**. The whole combined work would become GPLv3 | **No**: "GPLv3 software cannot be included in Apache projects" [V](https://www.apache.org/licenses/GPL-compatibility.html) | Yes | No | Yes (GPLv3 s.13 allows combination with AGPLv3) [K] | No (unless the whole is GPL) |
| **MPL-2.0 code** | Yes as a "Larger Work"; the MPL files stay MPL [V](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) | Same | Yes, via the "Secondary Licence" clause, unless the code is marked "Incompatible With Secondary Licenses" [V](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) | Yes, same mechanism [K] | Yes [K] | Yes |
| **LGPL code (linked as a library)** | Yes, if users can replace or relink the library and you comply with its terms [K] | Same | Yes | LGPL-2.1: yes; LGPL-3.0: no [K] | Yes | Yes [K] |

The FSF's own compatibility list (gnu.org/licenses/license-list.html) could not be fetched from this sandbox. The Apache Foundation's page above states the FSF position on Apache/GPL.

### 1.4 Apple App Store and the GPL

- **History.** In 2010 the FSF argued that App Store terms conflict with the GPL. Its reasoning was that the GPL forbids "any further restrictions on the recipients' exercise of the rights", while Apple's Usage Rules (for example, the limit of five authorised devices) "govern your rights… in addition to any other terms" [V](https://www.fsf.org/blogs/licensing/more-about-the-app-store-gpl-enforcement) (26 May 2010).
- **VLC (January 2011).** A VLC copyright holder complained, and Apple removed VLC [V](https://mailman.videolan.org/pipermail/vlc-devel/2011-January/078047.html). VLC returned in 2013 after its libraries were relicensed to LGPL/MPL [K].
- **Current position [U].** I found no newer formal FSF statement. The FSF's position has not been withdrawn as far as I know, and Apple's terms have changed since 2010. Apple's Standard EULA can be replaced by a developer's custom EULA [K].
- **What actually matters in practice.** The risk is **enforcement by a copyright holder who did not consent**.
  - Projects that own all their copyright publish GPL or AGPL apps on the App Store without problems. Examples: Signal-iOS is AGPLv3 [V-repo](https://github.com/signalapp/Signal-iOS/blob/HEAD/LICENSE), and Meshtastic-Apple is GPLv3 [V-repo](https://github.com/meshtastic/Meshtastic-Apple/blob/HEAD/LICENSE) and is listed in the India App Store [V](https://apps.apple.com/in/app/meshtastic/id1586432531).
  - We do **not** own ProofMode's or Briar's copyright. Putting their GPL code into our iOS app would expose the app to a VLC-style complaint.
  - **Rule for our iOS build: permissive dependencies only.** That means MIT, Apache, BSD and Unlicense. LGPL or MPL can be used only as separable libraries, after checking with counsel.
- **Google Play** has no comparable conflict. GPL apps are common on Play and F-Droid [K].

### 1.5 Does a fork have to keep the original licence?

- **The original code: yes.** For MIT, the copyright and permission notice must stay "in all copies or substantial portions" [V](https://opensource.org/license/mit). MIT *permits* sublicensing, so you may distribute the combined app under other terms, but you cannot remove Horizontal's notice or claim its code as yours.
- **Your additions: under any compatible licence you choose.** A Tella fork can therefore be "MIT (Horizontal's code) + Apache-2.0 or MIT (our code)". If we pull in GPL code, the *combined Android app* has to be distributed under GPLv3. That is one reason to keep GPL code out.
- **Apache-2.0 code** additionally requires carrying the NOTICE file and marking modified files [V](https://www.apache.org/licenses/LICENSE-2.0).

### 1.6 Trademark

- No licence in the table grants trademark rights. Apache s.6 says so expressly [V](https://www.apache.org/licenses/LICENSE-2.0). CC BY 4.0 s.2(b)(2) says "Patent and trademark rights are not licensed under this Public License" [V](https://creativecommons.org/licenses/by/4.0/legalcode.en).
- **Consequence for the fork.** We must not ship under the name "Tella" or use its logo unless Horizontal agrees. The Tella READMEs say nothing about trademark [V-repo]. Ask Horizontal anyway; they may also prefer to receive upstream contributions.

### 1.7 Licences of the projects in our plan

| Project | Licence | Evidence | App Store safe in our app? |
|---|---|---|---|
| Tella Android | **MIT** (© 2025 Horizontal) | [V-repo](https://github.com/Horizontal-org/Tella-Android/blob/HEAD/LICENSE) | n/a (Android) |
| Tella iOS | **MIT** (© 2025 Horizontal) | [V-repo](https://github.com/Horizontal-org/Tella-iOS/blob/HEAD/LICENSE) | Yes |
| ProofMode Android (`guardianproject/proofmode`, also mirrored on GitLab) | **GPLv3** | [V-repo](https://github.com/guardianproject/proofmode/blob/HEAD/LICENSE) | Android only; copying it makes the combined Android app GPLv3 |
| ProofMode Rust core (`gitlab.com/guardianproject/proofmode/proofmode-rust`) | **Apache-2.0** | [V](https://gitlab.com/guardianproject/proofmode/proofmode-rust) (GitLab project page shows "Apache License 2.0") | Yes |
| c2pa-rs (Adobe/CAI) | **MIT OR Apache-2.0** (dual; LICENSE-MIT and LICENSE-APACHE) | [V-repo](https://github.com/contentauth/c2pa-rs) | Yes |
| c2pa-android | **MIT OR Apache-2.0** (© 2025 Guardian Project) | [V-repo](https://github.com/contentauth/c2pa-android) | Yes |
| c2pa-ios | **MIT OR Apache-2.0** (© 2025 Guardian Project) | [V-repo](https://github.com/contentauth/c2pa-ios) | Yes |
| Briar | **GPL-3.0-or-later** | [V](https://f-droid.org/en/packages/org.briarproject.briar.android/) (F-Droid listing; code.briarproject.org was unreachable) | Android only; no iOS app exists [V](https://briarproject.org/) (Play and F-Droid only) |
| bitchat iOS | **Unlicense / public domain** | [V-repo](https://github.com/permissionlesstech/bitchat/blob/HEAD/LICENSE) | Yes |
| bitchat Android | **GPLv3** (LICENSE.md) | [V-repo](https://github.com/permissionlesstech/bitchat-android/blob/HEAD/LICENSE.md) | Android; copying makes the app GPLv3 |
| Berty | **Apache-2.0 OR MIT** (repo moved to `berty/berty`) | [V-repo](https://github.com/berty/berty/blob/HEAD/COPYRIGHT) | Yes |
| python-opentimestamps, opentimestamps-client, java-opentimestamps | **LGPL-3.0-or-later** (not 2.1) | [V-repo](https://github.com/opentimestamps/python-opentimestamps/blob/HEAD/LICENSE), [V-repo](https://github.com/opentimestamps/java-opentimestamps/blob/HEAD/LICENSE) | Usable as a separate library. Simpler: implement the small OTS client calls ourselves, or use the OTS calendar HTTP API, which is a protocol and not code [U: verify no permissive client exists for Swift] |
| react-native-vision-camera | **MIT** | [V-repo](https://github.com/mrousavy/react-native-vision-camera/blob/HEAD/LICENSE) | Yes (irrelevant if we stay native) |
| Meshtastic Android / Apple | **GPLv3** | [V-repo](https://github.com/meshtastic/Meshtastic-Android/blob/HEAD/LICENSE) | We would interoperate with it, not copy it |

**Practical rule.** The iOS app can be built entirely from permissive parts: Tella, c2pa-ios, ProofMode's Rust core, the bitchat iOS ideas and Berty. GPL arrives only if we copy code from ProofMode-Android, Briar or bitchat-Android. Re-implementing the *ideas and formats* is fine; copying *code* is what triggers copyleft.

### 1.8 Your core concern: "anyone may reuse the code freely, but forks must stay interoperable"

**What licences can and cannot do**
- A copyright licence governs **copying, modifying and distributing code**. It cannot compel a fork to keep a data format, connect to a common database, or speak a protocol.
  - Even the GPL lets a fork change everything, provided it publishes the source.
  - A clause saying "you must remain compatible with our network" would make the licence non-free and non-OSI. It would also deter the NGOs and developers you want.
  - It would be weakly enforceable in any case: anyone can write compatible or incompatible software from scratch.
- **The licence was not what protected Signal's network.** Signal's apps are AGPLv3 [V-repo](https://github.com/signalapp/Signal-Android/blob/HEAD/LICENSE), yet LibreSignal was abandoned because "Moxie Marlinspike said he was not OK with LibreSignal using the Open Whisper Systems servers and the name 'Signal'" [V-repo: LibreSignal README](https://github.com/LibreSignal/LibreSignal/blob/HEAD/README.md), citing [issue #37](https://github.com/LibreSignal/LibreSignal/issues/37#issuecomment-217211165). Signal's terms bar using its "trademarks, domains, logos" without permission and accessing services "in unauthorized manners" [V](https://signal.org/legal/). Its network is protected by **server access control, terms of service and trademark**.

**Tools that actually protect network effects**

1. **Open, published specifications.** Define the *formats and protocols*, not just the code:
   - an **Evidence Bundle** format: media, hashes, C2PA manifest, OpenTimestamps proof, metadata JSON schema, versioned;
   - a **Volunteer/Responder Network API**;
   - a **Guide content schema**.

   The model is Matrix, whose spec is a standalone document under Apache-2.0, changed by a public proposal process (MSCs) and governed by a Spec Core Team [V](https://spec.matrix.org/latest/). ActivityPub, the W3C standard behind Mastodon, is the same idea: many independent codebases interoperate because they share a spec and not a codebase [K].
2. **Trademark with a compatibility policy.** Register the app name and logo in India (Trade Marks Act 1999, likely classes 9 and 42; a solicitor's call). Then publish a policy:
   - forks may use their own name;
   - they may say "compatible with [Name]" only if they pass the conformance suite;
   - they may never use the name or logo itself.

   Precedents:
   - **Mozilla** lets products say they "work with" or are "compatible" with Mozilla software, word marks only, and bars using its marks "in the name of your… product" [V](https://www.mozilla.org/en-US/foundation/trademarks/policy/).
   - **Mastodon** requires forks to "choose your own branding", allows truthful statements such as "derived from the source code of the Mastodon software", and permits "compatible with" [V](https://joinmastodon.org/trademark).
3. **A conformance test suite plus a "Compatible with [Name]" badge.** Publish test vectors, for example sample evidence bundles that must verify, and API contract tests. Only implementations that pass may use the badge, and the trademark policy makes the badge enforceable.
4. **Control the shared infrastructure.** If there is a common volunteer database or directory, its **terms of service and API keys** decide who may connect, as with Signal. Keep access conditioned on passing conformance and following the data-protection rules, including the DPDP Act 2023 obligations if personal data is involved [K].
5. **Make forking unnecessary.** A permissive licence, an easy upstream contribution path, translations and configurable branding for partner NGOs give people what they need without leaving the network.

### 1.9 Recommendations

**(a) Code we add to the Tella fork: dual-license "MIT OR Apache-2.0".** This is the convention used by c2pa-rs, c2pa-android, c2pa-ios and Berty.
- Recipients choose. Apache gives an express patent grant, the NOTICE attribution and an express trademark exclusion. MIT keeps compatibility with GPLv2-only projects and makes upstreaming to Tella (MIT) frictionless.
- Keep Horizontal's MIT notice on its code.
- Add SPDX headers to each file: `SPDX-License-Identifier: MIT OR Apache-2.0`.
- Optionally add a DCO sign-off for contributors.
- If you want simplicity above everything, plain MIT matching Tella is also defensible. You lose only the express patent grant.

**(b) Guide content: CC BY 4.0.**
- It maximises reuse by NGOs, media and lawyers, and it requires attribution.
- Modifications must be indicated, so a fork must say it changed our legal guidance (s.3(a)(1)(B)) [V](https://creativecommons.org/licenses/by/4.0/legalcode.en).
- Implying endorsement is barred (s.2(a)(6)) [V](https://creativecommons.org/licenses/by/4.0/legalcode.en).
- CC BY-SA would force derivatives to stay open, but it blocks mixing with non-SA content and is not compatible with the MIT/Apache code if guide text is embedded in the app.
- The real accuracy risk is an outdated or altered *legal* guide circulating under our name. That is solved by trademark, version dates and a "last reviewed by" line, not by SA.

**(c) Specifications: spec text under CC BY 4.0, with schemas, test vectors and reference code under MIT OR Apache-2.0.**
- Add a short royalty-free **patent non-assertion pledge** for implementers of the spec.
- Keep the spec name and "compatible" badge under the trademark policy.
- Matrix's choice of Apache-2.0 for the spec itself is an acceptable alternative [V](https://spec.matrix.org/latest/).

---

## PART 2: FEASIBILITY CHECKS

### (a) Can a third-party app programmatically START WhatsApp live location or Google Maps location sharing?

**No, on both platforms.**
- **WhatsApp.** WhatsApp's documented deep links are click-to-chat links (`wa.me/<number>?text=…`), which open a chat with **prefilled text** [K]. faq.whatsapp.com blocks automated fetching, so this is confirmed only through secondary sources such as [bird.com](https://bird.com/explained/whatsapp/what-is-a-whatsapp-click-to-chat-link.md). No documented parameter, intent or URL starts Live Location [U: none found; WhatsApp does not document one].
- **Google Maps.** Maps URLs support only Search, Directions, Display a map, Create a shortlist and Street View. **There is no location-sharing action** [V](https://developers.google.com/maps/documentation/urls/get-started). There is no public API for Google Maps location sharing [K].
- **Apple.** There is no public API to start Find My / Messages location sharing [K].

**Closest achievable flow**
1. **Our own live-location link.** The app posts location to our own endpoint and generates a link. With one tap, it opens WhatsApp or Signal via click-to-chat or the share sheet, with "I'm at a protest, live location: <link>" prefilled. The user taps Send. That is 2–3 taps.
   - Android: `ACTION_SEND` with `setPackage("com.whatsapp")` [K].
   - iOS: `UIActivityViewController` or a `whatsapp://send?text=` URL [K].
   - Trade-off: our server holds location data. It must be minimised, ephemeral and E2E-encrypted where possible.
2. **Guided WhatsApp Live Location.** Open the chat via `wa.me`, then show a 3-step overlay or illustration: "tap 📎 → Location → Share Live Location". That is about 5 taps. It uses WhatsApp's E2E encryption and nothing touches our servers.
3. **Pre-arranged Google Maps sharing.** Ask the user, *before* the protest, to set up Google Maps sharing "until you turn this off" with 2–3 trusted contacts. Our checklist links them to it.

### (b) Can a third-party app send a message via WhatsApp, Signal or Telegram without the user tapping Send?

| Channel | Without tapping Send? | Evidence |
|---|---|---|
| **WhatsApp click-to-chat / `whatsapp://send`** | **No**. It only prefills | [K]; see the secondary source above |
| **WhatsApp Business Platform (Cloud API)** | Yes, but only **from a business number** that you register. Template messages need opt-in, and it costs money | [K]. It is not "from the user's own WhatsApp" |
| **WhatsApp via iOS Shortcuts** ("Send Message" action provided by WhatsApp) | **[U] Possibly yes.** Secondary sources say a Shortcuts automation with "Ask Before Running" off sends automatically ([Guiding Tech](https://www.guidingtech.com/how-to-schedule-whatsapp-messages-on-iphone/)); one reader reports it broke after iOS 17.5.1. WhatsApp does not document it | Our app **can** trigger a *user-built* shortcut with `shortcuts://run-shortcut?name=…&input=text&text=…` [V](https://support.apple.com/guide/shortcuts/run-a-shortcut-from-a-url-apd624386f42/ios). It opens the Shortcuts app. **Must be tested on current iOS and WhatsApp** |
| **Android `ACTION_SEND` intents** | **No**. The target app opens with a draft | [K] |
| **Android AccessibilityService** (auto-tap Send) | Technically yes. **Play policy risk is high** | Non-accessibility apps need a Play Console declaration, prominent in-app disclosure and affirmative consent. "Deceptive or undeclared uses" risk suspension. Fixed, deterministic, user-defined automation is not the banned "autonomous" category [V](https://support.google.com/googleplay/android-developer/answer/10964491). Automating another company's app may also breach that app's terms [U]. **Not recommended** for the store build; at most an opt-in power feature in a sideloaded or F-Droid build |
| **Telegram Bot API** | **Yes, with a condition.** "Bots can't start conversations with users. A user must either add them to a group or send them a message first" [V](https://core.telegram.org/bots). A bot can then message its users freely, up to about 1 message per second per chat and about 30 per second in bulk [V](https://core.telegram.org/bots/faq) | Workable design: each **trusted contact** pre-starts the user's alert bot or joins an alert group. Our app then calls `sendMessage` over HTTPS with no tap. Caveats: bot messages are **not E2E-encrypted** (Telegram cloud chats) [K], and the bot token on the phone is a secret to protect |
| **Signal** | **No official API.** signal-cli is unofficial [K]. Signal's terms ban "bulk messaging, auto-messaging" and access "in unauthorized manners" [V](https://signal.org/legal/) | Not viable for a published app |
| **SMS** (for comparison) | Android: yes, with `SEND_SMS`, which Play restricts to default-SMS or approved use cases [K/U]. iOS: no for apps; yes via a user Shortcut "Send Message" with Show When Run off [U] | |

**Recommendation.** For a hands-free SOS, use (1) the Telegram bot or group with pre-registered contacts, plus (2) a server-side push or email from our backend to pre-registered contacts. Use WhatsApp and Signal only as one-tap prefilled fallbacks.

### (c) "Bug mode" triggers: lock screen and hardware buttons

**iOS**
- **Action Button** models [V](https://support.apple.com/en-us/108044): iPhone 15 Pro/Pro Max, all iPhone 16 models including 16e, iPhone 17/17 Pro/Pro Max/17e, iPhone Air, and iPhone 18 Pro/Pro Max.
  - Our app can expose a **Control** (WidgetKit ControlWidget, iOS 18+). Controls can be placed in "Control Center, the Lock Screen, and the Action button" [V](https://developer.apple.com/documentation/widgetkit/adding-refinements-and-configuration-to-controls.md).
  - A control's intent can require device authentication through `authenticationPolicy`, or can omit it [V, same page]. The default value is **[U]**, so it needs testing.
- **Back Tap** (iPhone 8 or later, iOS 14 or later) can trigger Shortcuts [V](https://support.apple.com/111772). A Shortcut can then run our App Intent. Whether it works while locked is **[U]**.
- **Starting audio recording in the background without unlocking.** `AudioRecordingIntent` (iOS 18+) is "An app intent that starts, stops or otherwise modifies audio recording state".
  - The system displays an audio-recording indicator.
  - **"you must start a Live Activity when you begin the audio recording and keep it active as long as you record audio. If you don't start a Live Activity, the audio recording stops."** [V](https://developer.apple.com/documentation/appintents/audiorecordingintent.md)
  - So yes, recording can be started from a lock-screen control or the Action Button, but it is **visible**: there is an orange microphone indicator and a Live Activity on the lock screen.
  - **It cannot be covert on iOS.** The guide must say so honestly.
- **Does recording continue with the screen locked once started?** **Yes**, if the app has the `audio` background mode. Apple's doc for `AVAudioSession.Category.record`: "To continue recording audio when your app transitions to the background (for example, when the screen locks), add the `audio` value to the UIBackgroundModes key" [V](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/record.md).
  - Phone calls and alarms can interrupt the session [V, same page].
  - Video recording does **not** continue in the background [K].
- **Can an app disable Face ID or Touch ID?** **No** public API [K]. Document the **user gesture** instead: hold the side button and either volume button for 2 seconds (the power-off/SOS screen appears), then cancel. A passcode is now required. Apple lists "After initiating power off/Emergency SOS by pressing and holding either volume button and the side button simultaneously for 2 seconds" as a passcode-required state [V](https://support.apple.com/en-us/102381).
  - Pressing the side button 5 times also brings up Emergency SOS [K]. **Warn the user** that if "Call with 5 Button Presses" or "Call with Hold and Release" is on, this may **auto-dial 112** [K; Apple's SOS page would not render].

**Android**
- **Quick Settings tile** (`TileService`). It works from the lock screen.
  - `isLocked()`, `isSecure()` and `unlockAndRun()` let you choose behaviour while locked [K; developer.android.com page could not be fetched].
  - Apps targeting Android 14 (API 34) must launch activities from a tile via `startActivityAndCollapse(PendingIntent)` [K].
- **Home-screen widget.** Starting a microphone foreground service from a widget tap is an **explicit exemption**: "The service starts by interacting with app widgets" [V](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).
  - Notification taps are also exempt [V, same page].
  - **Quick Settings tiles are not listed** [V: the page does not mention them].
  - Safe pattern for a tile: open a tiny activity shown over the lock screen (`setShowWhenLocked`), start the mic FGS from that visible activity, then finish the activity. Starting the FGS directly from the tile is **[U]**; test it on Android 14, 15 and 16.
  - The app needs RECORD_AUDIO granted and a `microphone` foreground-service type, otherwise a `SecurityException` is thrown on Android 14+ [V, same page]. Play requires a foreground-service type declaration [K].
- **Persistent notification with a "Record" action** while the app is in "protest mode". It is exempt, and is the most reliable trigger.
- **Lock-screen shortcuts (Android 14+)** are chosen from a system list (camera, flashlight and so on). I found no API for third-party apps to add one [U].
- **Microphone indicator.** Android 12+ shows a green microphone privacy indicator [K]. So recording is not covert on Android either.
- **Lockdown.** The power-menu "Lockdown" option has existed since Android 9. It disables biometrics, Smart Lock and lock-screen notifications until a PIN is entered. On some devices it must first be enabled in settings.
  - Sources are secondary: [Computerworld](https://www.computerworld.com/article/3297039/android-pie-security-setting.html), [How-To Geek](https://www.howtogeek.com/806113/how-to-use-lockdown-mode-on-android/).
  - Samsung added a lockdown mode in One UI 9 [secondary](https://9to5google.com/2026/06/01/one-ui-updates-lockdown-mode/).
  - **Teach the user the gesture; an app cannot trigger it.**
- **`DevicePolicyManager.lockNow()` from a non-admin app: not possible.** It requires the user to activate the app as a **device admin** with the `force-lock` policy. The device-admin guide still documents `dpm.lockNow()` [V](https://developer.android.com/work/device-admin).
  - Android 9 deprecated *some* device-admin policies; whether force-lock is among them is **[U]**, because the deprecation page could not be fetched. My understanding [K] is that force-lock was not deprecated.
  - In AOSP, a DPM lockNow sets a "strong auth required" flag, so biometrics are refused until the PIN is entered [U: verify on target OEM builds].
  - An Accessibility service can call `GLOBAL_ACTION_LOCK_SCREEN` (API 28+) [K], but that brings the Play accessibility-policy burden above.
  - Making the app a device admin is a heavy, scary permission. **Recommend teaching the Lockdown gesture instead.**
- **Volume buttons with the screen off.** There is no supported API for a normal app [K]. Hacks exist, such as a MediaSession volume provider or an AccessibilityService key filter, but they are unreliable across OEMs and off-screen states **[U]**. **Do not promise this feature.**

### (d) Google Drive upload for more than 100 users

- **Scopes** [V](https://developers.google.com/workspace/drive/api/guides/api-specific-auth):
  - `drive.file` is **non-sensitive**. It covers files the app creates, or files the user opens or shares with it, which is enough for upload-and-share.
  - `drive` (full access) is **restricted**. Restricted scopes need restricted-scope verification, and "If you store restricted scope data on servers (or transmit), then you must go through a security assessment."
- **Verification.**
  - "If your app utilizes only non-sensitive scopes, it is not mandatory for your app to complete the app verification process." To show your name and logo on the consent screen you need lighter **brand verification** [V](https://support.google.com/cloud/answer/13463073).
  - Restricted scopes add a **yearly security assessment** by a Google-approved assessor, i.e. CASA [V](https://support.google.com/cloud/answer/13464321).
  - Brand-verification turnaround: Google's page gives **no timeframe** [V]. A figure of "2–3 business days" circulates but is **[U]**.
- **100-user cap.** Unverified apps are limited to "100 new users in total". This applies when the app uses **sensitive or restricted** scopes without completed verification [V](https://support.google.com/cloud/answer/7454865). A `drive.file`-only app should not hit the cap, but needs brand verification for a clean consent screen [U: confirm in Cloud Console when configuring].
- **Sharing.**
  - Specific people: POST `files/{id}/permissions` with `{"role":"reader","type":"user","emailAddress":"…"}`.
  - Anyone with the link: `type:"anyone"`. Expiry dates cannot be set on `anyone` permissions [V](https://developers.google.com/workspace/drive/api/guides/manage-sharing).
  - For notification emails, see `sendNotificationEmail` in [permissions.create](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create) [K].
- **Law-enforcement access.**
  - [Google: How Google handles government requests for user information](https://policies.google.com/terms/information-requests). For non-US requests, Google requires the authority to "follow the same due process and legal requirements" as for a local provider, and it may disclose in emergencies [V].
  - [Google Transparency Report: Government requests for user information](https://transparencyreport.google.com/user-data/overview) [link only; the page renders by JavaScript].
  - Consumer Drive is **not E2E-encrypted** [K]. **Encrypt evidence bundles client-side before upload** if Drive is used.

### (e) Offline (no-internet) messaging on iPhone, India, October 2026

| Option | India App Store? | Security status | Verdict |
|---|---|---|---|
| **bitchat** | **Removed** from Apple's India App Store, reported 3 October 2026. Per Dorsey, MeitY demanded it under **s.69A IT Act**; Apple cited "content that is illegal in India"; TestFlight is also unavailable in India [V](https://theprint.in/economy/bitchat-removed-from-apples-india-app-store-following-govts-demand-jack-dorsey/3061236/). Google Play status not stated there; TechCrunch reports it unavailable on Play in India [link only](https://techcrunch.com/?p=3173486) | Unaudited [K] | Not available. Recommending circumvention of a s.69A block is a legal risk for the project |
| **Berty** | **Listed** (v2.470.9, last updated 22/01/2025) [V](https://apps.apple.com/in/app/berty/id1535500412) | Its own listing says it "hasn't been audited yet". Berty's own post says "Berty Protocol has not yet been audited" and that "it's sadly too early for Berty to be deployed for crisis use" (1 March 2022) [V](https://berty.tech/blog/berty-not-war-ready/) | **Not well-audited**, and appears stale. Do not recommend for high-risk use |
| **Bridgefy** | **Listed** (v5.1.9) [V](https://apps.apple.com/in/app/bridgefy-offline-messages/id975776347). Its privacy label lists third-party advertising and analytics identifiers | USENIX Security 2022 (Albrecht et al.): after the Signal-protocol switch, fixes "failed to remedy the previously reported vulnerabilities". It remained open to attacker-in-the-middle and impersonation, and "the privacy issues of Bridgefy remained largely unresolved" [V](https://usenix.org/conference/usenixsecurity22/presentation/albrecht). No public audit after 2022 found [U] | **Avoid** for anything sensitive |
| **Briar** | **No iOS app**; Android only (Play, F-Droid) [V](https://briarproject.org/) | Cure53 audit in 2017 [K/U: not re-verified this session] | The best option for **Android** users |
| **Meshtastic** | **Listed** (v2.7.22, Meshtastic LLC) [V](https://apps.apple.com/in/app/meshtastic/id1586432531). **Needs a LoRa radio** (about ₹2–5k device) [K] | No independent audit found [U]. **CVE-2025-52464** (critical): duplicate or low-entropy keys on vendor-flashed devices let attackers decrypt direct messages; fixed in firmware 2.6.11/2.6.12 [V](https://www.cvelogic.com/cve/CVE-2025-52464). Channel encryption uses shared keys with no forward secrecy [K] | Usable for **organised groups** that accept the hardware and legal constraints. Not for anonymous use |
| **Apple built-ins** | AirDrop works without internet [K]. Messages via satellite is not offered in India [U/K] | AirDrop sender identity is recoverable. Chinese authorities publicised cracking AirDrop sender hashes in 2024 [K] | Fine for handing files to trusted people nearby; **not anonymous** |

**LoRa legality in India**
- The **Use of Low Power Equipment in the Frequency Band 865 to 868 MHz for Short Range Devices (Exemption from Licensing Requirement) Rules, 2021**, notified as **G.S.R. 853(E), 10 December 2021**, exempt the band from licensing [V](https://www.thc.nic.in/Central%20Governmental%20Rules/use%20of%20low%20power%20Equipment%20in%20the%20frequency%20band%20865%20to%20868%20MHz%20for%20Short%20Range%20Devices%20Exemption%20from%20Licence%20Rules,2021.pdf). The text is hosted on thc.nic.in; the original e-Gazette copy is not verified.
- Conditions:
  - Use is on a non-interference, non-protection basis.
  - Power limits are 25 mW e.r.p. for non-specific SRDs (≤50 kHz bandwidth, 1% duty cycle), 500 mW for "Tracking, Tracing and Data Acquisition" (≤200 kHz, duty cycle ≤10% or 2.5%, adaptive power control), and 25 mW for wideband.
  - **Equipment must be type-approved** (Rule 5).
- Meshtastic's `IN` region uses 865–867 MHz with a **30 dBm (1 W)** firmware ceiling and a 100% duty cycle [V](https://meshtastic.org/docs/configuration/radio/lora/). That is **above** every limit in the Rules.
- Which table a LoRa chat device falls under is **[U]**. A typical 125 kHz LoRa channel does not fit Table I's ≤50 kHz FHSS profile.
- **Legal opinion needed.** At minimum, the guide must tell users to reduce transmit power to ≤14 dBm (25 mW) or ≤27 dBm (500 mW) e.r.p. as applicable, and to buy WPC/ETA-certified hardware.

**Honest recommendation.** In the India App Store in October 2026 there is **no well-audited offline messenger for iPhone**.
1. **iPhone users:**
   - Plan offline coordination *before* the protest: meeting points, buddy pairs and times.
   - Use SMS as an unencrypted fallback when the network is partly up.
   - Use AirDrop (Contacts Only) for nearby file handoff.
   - Treat Berty and Bridgefy as **unsafe for sensitive content**.
2. **Android users:** Briar.
3. **Organised legal-aid or medic teams:** Meshtastic, with pre-configured private channels, current firmware, reduced TX power and certified hardware.
4. **Do not build our own mesh crypto.** Integrate or link to existing tools, and revisit Berty if an audit is published.

---

## Open items to verify next (ranked by risk)

1. Device test: does an iOS 18+ Control or Action Button `AudioRecordingIntent` start recording from the lock screen without Face ID? Check the default `authenticationPolicy`.
2. Device test: does a microphone FGS start directly from an Android 14–16 `TileService`, or only via a visible activity?
3. Device test: does the WhatsApp Shortcuts "Send Message" action still send without a tap on current iOS?
4. Legal opinion on LoRa: which G.S.R. 853(E) table applies, the ETA requirement, and Meshtastic power settings.
5. Confirm in the Google Cloud Console that a `drive.file`-only app has no 100-user cap, and find the actual brand-verification turnaround.
6. Ask Horizontal about use of the Tella name and their appetite for upstream contributions.
7. Check for a permissive (non-LGPL) OpenTimestamps client for Swift and Kotlin, or plan a small clean-room implementation of the calendar protocol.

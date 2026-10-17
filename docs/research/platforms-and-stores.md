---
title: "Protestor Assist Research — Platforms and Stores"
type: research
project: "[[Protestor Assist — Hub]]"
hub: "[[Protestor Assist Research — Hub]]"
created: 2026-10-16
updated: 2026-10-16
tags: [protestor-assist, research]
---

> App-store rules, install paths in India, and the iPhone and Android limits the app must be designed around, with official sources.

# Platform and app-store constraints: protester-safety app (India, October 2026)

Researched 16 October 2026. Each claim links to its source. Official sources were used where they exist. **[UNCERTAIN]** marks anything not confirmed on an official page.

---

## 0. Bottom line

| Route | Realistic time to "people in India can install" | Gating factor |
|---|---|---|
| Android APK sideload (GitHub Releases / own site) | **Same day** as a working build | No store gate. Developer verification is not enforced in India until 2027. |
| Google Play, new **personal** account | **About 3–4 weeks minimum** | 12 testers × 14 continuous days of closed testing, then production-access review (up to 7 days) |
| Google Play **internal testing** track (≤100 named testers) | **1–3 days** (account and identity verification) | Testers must be added by email. This does not count as public. |
| Google Play, **organisation** account | 1–3 days *if a D-U-N-S number already exists*, otherwise up to 30 days | D-U-N-S lead time |
| iOS TestFlight external (public link, ≤10,000 testers) | **About 2–4 days** | Apple enrolment (India: Apple Developer app only), then Beta App Review of the first build |
| iOS App Store | **About 2–5 days** | Enrolment, then App Review (90% in under 48 h). Political sensitivity raises rejection risk. |
| iOS Ad Hoc (EAS internal distribution, registered UDIDs) | About 1–2 days after enrolment | Each device UDID must be registered, so this cannot be public |

**A 24-hour install window is realistic only for Android sideloading.** iOS needs at least 2–4 days, and only if the Apple account is already enrolled or enrolls quickly.

---

## 1. Google Play

### 1.1 New personal developer accounts: testing gate
- Personal accounts created after **13 Nov 2023** must run a **closed test with at least 12 testers, each opted in for 14 continuous days**, before they can apply for production. A tester who leaves and rejoins must restart the 14 days. Google usually reviews the production-access application in **7 days or less**. ([Play Console Help: App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB))
- Earlier the requirement was 20 testers. It was cut to 12 in Dec 2024. ([Android Authority, 19 Dec 2024](https://androidauthority.com/google-play-app-testing-requirement-3510580))
- **Internal testing** allows up to **100 testers**. A build "becomes available to testers within minutes", and internal tests "might not be subject to standard Play policy or security reviews". This is the fastest Play route, but testers must be added by email, so it is not public. ([Play Console Help: Set up an open, closed or internal test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en))
- New personal accounts must also complete **identity verification** (government ID), **device verification** with the Play Console mobile app on a real Android phone, and **phone verification** before publishing. ([Play Console Help: Verify your developer identity](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)) **[UNCERTAIN]** No official processing time is given for identity verification. Expect hours to a few days.

### 1.2 Organisation accounts
- These need a **D-U-N-S number**, which can take **up to 30 days** to obtain, plus a website, organisation documents and OTP-verified contact details. ([Play Console Help: Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en))
- **Exemption from the 12×14 testing rule:** the official requirements page covers **personal accounts only**. Android Authority states that "business accounts aren't subject to the same app testing requirement at all." ([Android Authority](https://androidauthority.com/google-play-app-testing-requirement-3510580)) **[UNCERTAIN, but consistent]** Google's own page does not explicitly say organisations are exempt. It simply scopes the rule to personal accounts.
- This only helps if an existing entity (an NGO, LLP or company) already holds a D-U-N-S number.

### 1.3 Review times
- Google gives no fixed review time. "For certain developer accounts, we'll take more time ... up to seven days or longer in exceptional cases." ([Play Console Help: Prepare and roll out a release / review times](https://support.google.com/googleplay/android-developer/answer/9859751?hl=en))
- The first link for a closed test "can take several hours to become available". ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en))

### 1.4 Android developer verification for sideloaded apps (announced Aug 2025)
- **Enforcement began 30 Sep 2026**, only in **Brazil, Indonesia, Singapore and Thailand**, and only for installs from *participating stores* on certified devices running Android 7+. **Global rollout is due in 2027.** ([Android Developers: Developer verification FAQ](https://developer.android.com/developer-verification/guides/faq?hl=en); [Android Authority, 1 Oct 2026](https://androidauthority.com/android-sideloading-developer-verification-first-wave-rollout-3717921))
- **India is not in the first wave.** Direct sideloads such as an APK from GitHub Releases are **not blocked today**, even in the four first-wave countries. ([Android Authority, 1 Oct 2026](https://androidauthority.com/android-sideloading-developer-verification-first-wave-rollout-3717921))
- **ADB installs never need verification.** ([FAQ](https://developer.android.com/developer-verification/guides/faq?hl=en))
- After the 2027 rollout, unverified apps will need the user's "advanced flow": developer mode, an anti-coaching check, a restart, a **24-hour wait**, then biometric confirmation. ([FAQ](https://developer.android.com/developer-verification/guides/faq?hl=en))
- A **free "limited distribution" account** needs no government ID, but it is capped at **20 devices**, so it is useless for mass distribution. A full Android Developer Console account costs $25. ([Android Developers: Limited distribution](https://developer.android.com/developer-verification/guides/limited-distribution?authuser=1); [FAQ](https://developer.android.com/developer-verification/guides/faq?hl=en))
- **Recommendation:** register the package name and verify through the Play Console / Android Developer Console now anyway, so sideloaded APKs keep working when the 2027 rollout reaches India.

### 1.5 Play Protect "enhanced fraud protection" in India (affects sideloaded APKs)
- Since a Nov 2024 pilot in India, Play Protect **blocks internet-sideloaded apps that declare RECEIVE_SMS, READ_SMS, notification-listener or Accessibility permissions.** ([9to5Google, 3 Oct 2024](https://9to5google.com/2024/10/03/google-blocking-sideloaded-apps-india/); [TechCrunch](https://techcrunch.com/2024/10/03/google-pilots-blocking-some-sideloaded-apps-in-india))
- **SEND_SMS is not on the reported list**, so an SOS feature that only *sends* SMS should still install. **[UNCERTAIN]** The list could have expanded since 2024. Test an APK side-loaded through Chrome on an Indian device before launch. **Never declare RECEIVE_SMS or READ_SMS.**

### 1.6 SEND_SMS policy (automatic SOS SMS)
- Play restricts SMS permissions to default SMS handlers, except for listed exceptions. One exception is **"Physical safety/emergency alerts to send SMS — Apps that send SMS alerts in emergency situations", which grants SEND_SMS only.** It is subject to Play review and a **Permissions Declaration Form**, and applies only "where no alternative method exists". ([Play Console Help: Use of SMS or Call Log permission groups](https://support.google.com/googleplay/android-developer/answer/10208820?hl=en); [Permissions and APIs that access sensitive information](https://support.google.com/googleplay/android-developer/answer/16558241?hl=en))
- So a non-default-SMS app **can** auto-send SOS SMS on Play, but only after a declaration review, which adds review time and rejection risk.
- **Design implication:** the Play build should use the compose-intent (user taps Send) for v1. Auto-send should go only in the sideload APK flavor, or in a later Play update once the declaration is approved.

### 1.7 Background location policy
- Background location must be **essential to core functionality**. You declare **one** feature in the Permissions Declaration Form and provide a ≤30-second video showing the in-app prominent disclosure and the runtime prompt. Physical/perceived safety counts as a "significant benefit". ([Play Console Help: Background location access](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en))
- A **foreground service that continues a user-initiated action is reviewed separately**. If its location use is equivalent to background access, it is subject to the background-location requirements. ([same](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en))
- **Design implication:** v1 should do live-location sharing only through a **user-started location FGS** with a visible notification. Do **not** request ACCESS_BACKGROUND_LOCATION in v1, because it triggers the declaration and video review.

### 1.8 Foreground-service type declarations (targetSdk 34+)
- Every FGS type used must be declared in the manifest **and** in **Play Console › App content › Foreground service declaration**. For each type you give a description, the user impact if deferred, a **video link** and a use case. ([Play Console Help: Foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en))
- The preset use cases include camera ("background camera streaming, e.g. video chat"), microphone ("voice recording") and location ("user-initiated location sharing"). Evidence recording may need a **custom use case** description. ([same](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en))
- Manifest permissions are `FOREGROUND_SERVICE` plus `FOREGROUND_SERVICE_CAMERA`, `_MICROPHONE` or `_LOCATION`. Runtime prerequisites are CAMERA, RECORD_AUDIO, and fine/coarse location with location services on. ([Android Developers: FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types))

### 1.9 While-in-use restrictions (camera, microphone, location)
- An app in the background **cannot create** a camera, microphone or location FGS, "even if the app falls into one of the exemptions from background start restrictions". On Android 14+ this fails immediately with a SecurityException. ([Android Developers: Restrictions on starting a FGS from the background](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start))
- The exemptions include a start **from a notification action or an app widget**. ([same](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start))
- **Design implication:** recording must be started while the activity is visible (a big in-app button), or from a **home-screen widget or notification action**. A lock-screen hardware-button trigger is not possible without these.

---

## 2. Apple

### 2.1 Developer Program enrolment
- **India: enrolment is available only through the Apple Developer app** (iPhone/iPad/Mac). The fee is $99/yr. Individuals "can review the license and purchase at enrollment". If no confirmation arrives within **24 h** of purchase, contact support. ([Apple: Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/))
- **Organisations** need a D-U-N-S number, a work email on the organisation's domain, a public website and binding authority. Apple Developer Support must verify before purchase, which can take days to weeks. ([same](https://developer.apple.com/help/account/membership/program-enrollment/))
- If a card in someone else's name is used, enrolment can be delayed and government photo ID requested. ([same](https://developer.apple.com/help/account/membership/program-enrollment/))
- **[UNCERTAIN]** Individual enrolment through the app is often same-day, but Apple publishes no SLA.
- Note: an individual account shows the developer's **personal legal name** as seller on the App Store, which is a personal-safety and exposure consideration for this app.

### 2.2 TestFlight
- **Internal:** up to **100** App Store Connect users, no review. **External:** up to **10,000**, by email or **public link**. The **first build needs Beta App Review**, and later builds "may not require a full review". Builds expire after **90 days**. ([Apple: TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview); [TestFlight](https://developer.apple.com/testflight/); [Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers))
- Builds uploaded with EAS Submit appear in TestFlight after about 10–15 minutes of processing. ([Expo: Submit to the Apple App Store](https://docs.expo.dev/submit/ios/))
- **[UNCERTAIN]** Apple publishes no Beta App Review time. It is commonly under 24–48 h.

### 2.3 App Review times and expedited review
- "typically reviewing at least 50% of submissions in less than 24 hours and 90% in less than 48 hours." ([Apple: App Review](https://developer.apple.com/distribute/app-review/))
- **Expedited review** is for "extenuating circumstances, such as fixing a critical bug or timing your release to coincide with an event". The submission must already be in review, and the request is granted "as allowed by availability and demand". ([Apple: Request expedited review](https://developer.apple.com/help/app-review/after-submitting-for-review/request-expedited-review)) An event-tied request (naming the protest date) is a legitimate use, but it is not guaranteed.

### 2.4 Relevant App Review Guidelines (last updated 8 Jun 2026)
Source: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **5 Legal:** "Apps must comply with all legal requirements in any location where you make them available ... apps that solicit, promote, or encourage criminal or clearly reckless behavior will be rejected."
- **5.1.5 Location:** "Location-based APIs shouldn't be used to provide emergency services ..." Frame SOS as **notifying the user's own trusted contacts**, never as a replacement for 112 or emergency dispatch. Always link or call 112 through the system dialer.
- **1.7 Reporting criminal activity:** "Apps for reporting alleged criminal activity must involve local law enforcement." **Do not** build a feature that reports police conduct to a public map or feed.
- **1.4 Physical harm** ("If your app behaves in a way that risks physical harm, we may reject it") and **1.1.7** (no capitalising on "recent or current events, such as violent conflicts"). Keep marketing copy neutral and safety-focused, not partisan or mobilising.
- **5.1.1:** a privacy policy is mandatory, both in App Store Connect metadata and in the app. Collection needs consent.
- **2.5.4:** "Multitasking apps may only use background services for their intended purposes: VoIP, audio playback, location, ..."
- **4.2 Minimum functionality:** the app must be more than a repackaged website.
- There is no explicit "politically sensitive" rule. The relevant risks are 5 (local law), 1.7 and takedown on government demand (below).

### 2.5 History of removals
- **HKmap.live (Oct 2019):** Apple removed the crowdsourced police-location app, saying it "has been used to target and ambush police, threaten public safety", after verifying with Hong Kong police. ([NBC News](https://www.nbcnews.com/news/world/apple-pulls-police-tracking-app-used-hong-kong-protesters-after-n1064506); [AppleInsider](https://appleinsider.com/articles/19/10/10/apple-again-pulls-police-monitoring-app-from-hong-kong-app-store))
- **India, Bitchat (3 Oct 2026):** Apple removed Jack Dorsey's offline mesh messenger from the **India App Store on a MeitY demand under s.69A of the IT Act**. Apple **also disabled TestFlight testing and public TestFlight links in India** for it. In July 2026, I4C (MHA) had separately directed **GitHub** to remove Bitchat repositories under s.79(3)(b). ([Business Today, 3 Oct 2026](https://www.businesstoday.in/technology/news/story/apple-removes-jack-dorseys-bitchat-from-india-app-store-cites-meity-order-under-it-act-559339-2026-10-03); [Internet Freedom Foundation](https://internetfreedom.in/blocking-bitchat-is-unconstitutional-meity-must-publish-and-withdraw-its-secret-order/))
  - **Implication:** both store distribution and **TestFlight public links** can be shut off in India by a 69A order, and **GitHub Releases is not immune** (see the I4C → GitHub action). Mirror the APK on more than one host. Publish a SHA-256 checksum and signing-certificate fingerprint so users can verify mirrors.
  - **[UNCERTAIN]** Whether Google Play also removed Bitchat in India is reported by secondary sources ([pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/20538/india-blocks-bitchat-app-store-google-play)) and not confirmed here.
- Background: India has blocked thousands of apps under s.69A. ([MediaNama, Sep 2025](https://www.medianama.com/2025/09/223-india-3000-apps-ban-section-69a/))

---

## 3. iOS technical limits

### 3.1 Video recording when the app is backgrounded or the screen is locked: **not possible on iPhone**
- AVCaptureSession is interrupted with `videoDeviceNotAvailableInBackground`: "An interruption caused by the app being sent to the background while using a camera." ([Apple: AVCaptureSession.InterruptionReason](https://developer.apple.com/documentation/avfoundation/avcapturesession/interruptionreason))
- **Multitasking camera access is iPad-only.** It covers Split View, Slide Over, Stage Manager, and PiP for **video calls**. It is a plain API (`isMultitaskingCameraAccessEnabled`) from iPadOS 16, and the entitlement is only needed for deployment targets earlier than iOS 16. ([Apple: Accessing the camera while multitasking on iPad](https://developer.apple.com/documentation/avkit/accessing-the-camera-while-multitasking-on-ipad))
- Apple DTS (2025): "A video call app that implement Picture-in-Picture (PIP) will have access to the camera when it enters that background and that is all the functionality that is currently possible." This applies to the background, **not to a locked screen**. ([Apple Developer Forums thread 787605](https://developer.apple.com/forums/thread/787605)) PiP-for-video-calls requires a genuine video-call app and would likely fail review for an evidence recorder.
- **iOS 18+ LockedCameraCapture** lets a capture *extension* launch from the Lock Screen, Control Center or the Action button, so recording can **start** without unlocking. It runs only while that UI is on screen. ([Apple: LockedCameraCapture](https://developer.apple.com/documentation/lockedcameracapture)) Developers report it is **buggy on iOS 26** (extension fails to relaunch, inconsistent content handoff). ([Forums thread 822735](https://developer.apple.com/forums/thread/822735)) It needs a native Swift extension, so it is **out of scope for a 24-hour Expo build**.
- **iOS 26 `BGContinuedProcessingTask`** lets a user-initiated task (for example hashing or uploading a finished video) continue in the background with a Live Activity progress UI. It cannot keep the camera running. ([Apple: BGContinuedProcessingTask](https://developer.apple.com/documentation/backgroundtasks/bgcontinuedprocessingtask))

### 3.2 What *does* keep running on a locked iPhone: **audio recording**
- With the `audio` background mode, **expo-audio** continues recording "when the app is backgrounded or the screen locks". This needs `enableBackgroundRecording: true` in the config plugin and `allowsBackgroundRecording: true` at runtime. ([Expo: Audio](https://docs.expo.dev/versions/latest/sdk/audio/); [Apple: Configuring background execution modes](https://developer.apple.com/documentation/xcode/configuring-background-execution-modes))
- **Design implication:** on iOS, when the app leaves the foreground, the video segment ends (finalise and hash it) and the app **switches automatically to audio-only recording plus location logging** until the user returns. Tell users plainly to keep the app open and the screen on for video. Disable auto-lock while recording (`expo-keep-awake`).

### 3.3 Incoming phone call during capture
- An interruption reason exists for this: `audioDeviceInUseByAnotherClient`, "the audio hardware temporarily being made unavailable (for example, for a phone call or alarm)". ([Apple: InterruptionReason](https://developer.apple.com/documentation/avfoundation/avcapturesession/interruptionreason))
- **[UNCERTAIN, test on device]** The whole session is interrupted, so expect the current movie file to be finalised. The app must resume a new segment after `interruptionEndedNotification` (observing it is shown in [Apple's multitasking camera article](https://developer.apple.com/documentation/avkit/accessing-the-camera-while-multitasking-on-ipad)). Design for **segmented recording** (for example 1–5-minute chunks, each hashed) so an interruption never loses more than the current segment.

### 3.4 SMS without the user tapping Send: **impossible on iOS**
- MFMessageComposeViewController "only lets you construct the initial message and present it for a person's approval ... If the person opts to send the message, the Messages app takes on the responsibility." ([Apple: MFMessageComposeViewController](https://developer.apple.com/documentation/messageui/mfmessagecomposeviewcontroller))
- Multiple recipients are supported (`recipients: [String]`). ([same](https://developer.apple.com/documentation/messageui/mfmessagecomposeviewcontroller))
- **Design implication:** on iOS, SOS opens a pre-filled multi-recipient SMS (one tap to send). Fully automatic alerts need a **server path** (push, or an SMS gateway such as an Indian DLT-registered provider), which needs data connectivity and a backend. Out of scope for 24 hours unless a backend already exists.

### 3.5 Background location for live sharing
- This needs the `location` background mode. Apps are otherwise suspended shortly after backgrounding. `CLBackgroundActivitySession` started in the foreground keeps updates flowing, and When-In-Use authorisation is enough for it. ([Apple: Handling location updates in the background](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background))
- In Expo: `isIosBackgroundLocationEnabled: true` plus `Location.startLocationUpdatesAsync` with TaskManager. Background location is **not available in Expo Go**, so a development or production build is required. ([Expo: Location](https://docs.expo.dev/versions/latest/sdk/location/))
- **[UNCERTAIN]** Whether expo-location uses `CLBackgroundActivitySession` internally, or requires "Always" for background updates, was not confirmed. Expo docs say to request background permission, which maps to "Always".

---

## 4. Android technical limits

### 4.1 Recording video with the screen off
- Since Android 9, background apps "cannot access the microphone or camera". Use a foreground service. ([Android 9 behaviour changes](https://developer.android.com/about/versions/pie/android-9.0-changes-all))
- A **`camera` (+ `microphone`) typed FGS**, started **while the activity is visible**, can keep recording with the screen off. Camera2 can target encoder surfaces (MediaRecorder/MediaCodec) with no preview surface. ([Android Developers: FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types); [Restrictions on background start](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start); practitioner write-up, [dev.to, Aug 2026](https://dev.to/superfunicular/how-an-android-phone-keeps-recording-video-with-the-screen-off-foreground-services-camera2-and-nfa) (non-official))
- Android 14: a missing FGS type throws `MissingForegroundServiceTypeException`. Show the notification (`startForeground`) promptly, before opening the camera. ([dev.to](https://dev.to/superfunicular/how-an-android-phone-keeps-recording-video-with-the-screen-off-foreground-services-camera2-and-nfa); [Android Developers](https://developer.android.com/develop/background-work/services/fgs/service-types))
- Android 15/16: the official FGS-types page lists no new limits for the camera, microphone or location types. The 6 h/24 h timeout applies to `mediaProcessing`, and dataSync cannot start from BOOT_COMPLETED. ([Android Developers: FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types))
- **CameraX** binds use cases to a `LifecycleOwner`. The official video-capture page does **not** document recording from a `LifecycleService` with no visible activity. ([Android Developers: CameraX video capture](https://developer.android.com/media/camera/camerax/video-capture)) **[UNCERTAIN]** Practitioners bind CameraX to a `LifecycleService` successfully. Test it.
- **Library reality [UNCERTAIN]:** neither expo-camera nor react-native-vision-camera documents a "keep recording with screen off" mode. Both bind to a mounted view. A third-party SDK's docs report that RN camera on Android stays live in the background only "for a limited period" without an FGS, and indefinitely with one. ([100ms docs](https://www.100ms.live/docs/react-native/v2/how-to-guides/set-up-video-conferencing/background-handling)) Reliable screen-off recording therefore needs a **small custom native module** (Expo Modules API, Kotlin: an FGS plus a CameraX or Camera2 recorder). That is roughly 300–500 lines and is the single riskiest piece for a 24-hour build. **Fallback for v1:** keep the screen on with a dimmed or black overlay while recording in the foreground, and run an audio FGS (expo-audio background recording) when the app is backgrounded.
- OEM task killers (Xiaomi, Oppo, Vivo and similar, common in India) may still kill FGS apps. Ask the user to exempt the app from battery optimisation, sparingly, because Play scrutinises this. ([dev.to](https://dev.to/superfunicular/how-an-android-phone-keeps-recording-video-with-the-screen-off-foreground-services-camera2-and-nfa))

### 4.2 Incoming call while recording
- Audio: "The call always receives audio." Only accessibility services or privileged apps can capture during a call, and "Two ordinary apps can never capture audio at the same time." **The recorder's audio is silenced for the duration of the call.** Detect this with `AudioRecordingConfiguration.isClientSilenced()`. ([Android Developers: Sharing audio input](https://developer.android.com/media/platform/sharing-audio-input))
- Video: **[UNCERTAIN, test on device]** No official page says the camera stops on a call. In practice the video track usually continues while the audio is silent, but some OEMs differ.

### 4.3 Battery: hardware encoder 720p30 vs 1080p30
- **No authoritative measured power figures were found** in official docs or accessible papers in this pass. ([IEEE "Energy consumption anatomy of live video streaming from a smartphone"](https://ieeexplore.ieee.org/document/7136502) exists, but only the abstract is accessible.) Apple notes that capture under thermal or system pressure can be shut down, and recommends lowering resolution or frame rate. ([Apple](https://developer.apple.com/documentation/avkit/accessing-the-camera-while-multitasking-on-ipad))
- Engineering judgement **[UNVERIFIED]**: the camera sensor/ISP and the display dominate, and the encoder is a smaller share, so 720p vs 1080p saves modestly (a ballpark of 10–25%). **Turning the screen off saves more than the resolution drop.** Default to **720p30 H.264 at about 2–3 Mbps** mainly for **storage and upload size** (about 1–1.4 GB per hour against about 2–3 GB per hour at 1080p). Measure on 2–3 typical Indian mid-range phones before claiming numbers.

---

## 5. Framework choice for a 24-hour AI-agent build

### 5.1 Current Expo
- **Expo SDK 58** is the npm `latest` (expo@58.0.12, 16 Oct 2026; 58.0.0 published 29 Sep 2026). It ships **React Native 0.88** and React 19.3, Android 7+ (targetSdk 36), iOS 16.4+ and Xcode 26.4+. ([Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0); [SDK 58 beta changelog](https://expo.dev/changelog/sdk-58-beta); npm registry checked 16 Oct 2026)
- **SDK 57** (30 Jun 2026) is the mature alternative. ([Expo changelog](https://expo.dev/changelog)) **[NOTE]** SDK 58 stable is only about 2 weeks old. If any third-party native lib breaks, drop to SDK 57.
- Expo Go now requires login, and SDK 58 Expo Go is not yet in the stores. This is irrelevant here because background location and FGS **require a development build anyway**. ([Expo changelog](https://expo.dev/changelog); [Expo: Location](https://docs.expo.dev/versions/latest/sdk/location/))

### 5.2 Libraries
| Need | Choice | Notes |
|---|---|---|
| Camera (foreground) | **expo-camera** (`~58.0.10`) | `recordAsync({maxDuration, maxFileSize})` handles segmented recording natively. iOS codec choice. Pause/resume only on iOS 18. ([docs](https://docs.expo.dev/versions/latest/sdk/camera/)) Simpler and fully Expo-managed. |
| Camera (alternative) | react-native-vision-camera **v5.2.3** (Nitro Modules; needs `react-native-nitro-modules` + `react-native-nitro-image`) | More control (formats, bitrate), but a heavier dependency surface. Neither library gives Android screen-off recording on its own. ([VisionCamera v5 post](https://margelo.com/blog/whats-new-in-visioncamera-v5/llms.txt); npm) |
| SHA-256 of large video | **expo-file-system `File.digest('SHA-256')`** (new in SDK 58) | Native, returns hex, avoids loading into JS. ([Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/); [SDK 58 beta notes](https://expo.dev/changelog/sdk-58-beta)) **[UNCERTAIN]** whether it streams internally. Test on a 1 GB file. Fallback: `FileHandle.readBytes` chunks into react-native-quick-crypto `createHash('sha256').update()`. ([quick-crypto hash API](https://crypto.margelo.com/docs/api/hash); [large-file guide](https://crypto.margelo.com/docs/guides/large-files)) |
| expo-crypto | Avoid for files | `digest()` takes a BufferSource one-shot and has no incremental API. ([docs](https://docs.expo.dev/versions/latest/sdk/crypto/)) |
| Location | **expo-location** | Foreground, plus a background task with an Android FGS notification via the `foregroundService` option. Needs a dev build. ([docs](https://docs.expo.dev/versions/latest/sdk/location/)) |
| SOS SMS | **expo-sms** | Multiple recipients supported, but it **opens the compose UI**: "Opens the default UI/app for sending SMS messages with prefilled addresses". Android result is always `unknown`. ([docs](https://docs.expo.dev/versions/latest/sdk/sms/)) Auto-send on Android needs a ~40-line Expo Module calling `SmsManager` (sideload flavor only, see 1.6). |
| Background audio | **expo-audio** | `enableBackgroundRecording` adds the iOS audio mode and an Android microphone FGS. ([docs](https://docs.expo.dev/versions/latest/sdk/audio/)) |
| PDF certificate | **expo-print** `printToFileAsync({html})` | Works on iOS and Android. On iOS, local images must be **inlined as base64**. ([docs](https://docs.expo.dev/versions/latest/sdk/print/)) |
| Files / share | expo-file-system, expo-sharing | — |

### 5.3 EAS Build / Submit
- Free plan: **15 Android + 15 iOS builds per month, low-priority queue, 45-minute timeout, 1 macOS concurrency**. Starter ($19/mo) gives a high-priority queue and a 2-hour timeout. ([Expo pricing](https://expo.dev/pricing)) **[UNCERTAIN]** Free-tier queue waits are not published and can be long at peak times. **Pay for Starter for launch day.**
- iOS release builds need a **paid Apple Developer membership**. EAS can generate and manage certificates and profiles after you sign in to Apple. ([Expo: Build setup](https://docs.expo.dev/build/setup/))
- EAS Submit "works on macOS, Linux, and Windows, so you don't need a Mac to ship iOS builds". It authenticates with an App Store Connect API key or Apple ID plus an app-specific password. ([Expo: Submit iOS](https://docs.expo.dev/submit/ios/))

### 5.4 Flutter comparison
- Flutter's camera plugin hits the same OS limits: no iOS background video, and Android screen-off recording needs native FGS code. **[NOT VERIFIED in this pass]** Building iOS without a Mac needs a third-party CI (for example Codemagic). Expo's EAS handles credentials, signing and submission from Linux end to end, and AI agents produce more reliable TypeScript/Expo code. **Recommendation: Expo.**

---

## 6. Building from a Linux container (no Mac)
- **iOS:** yes, through **EAS cloud build** (`eas build -p ios`) plus `eas submit`. You need an Expo account and a paid Apple Developer account, and the Apple credentials (or an App Store Connect API key) must be supplied once, interactively or through `EXPO_APPLE_*` / ASC key env vars. ([Expo: Build setup](https://docs.expo.dev/build/setup/); [Expo: Submit iOS](https://docs.expo.dev/submit/ios/)) Local iOS builds need Xcode, fastlane and CocoaPods, so they are not possible on Linux. ([Expo: Local builds](https://docs.expo.dev/build-reference/local-builds/))
- **Android:** **local builds are supported on Linux**: "macOS and Linux are supported". This uses `eas build --local` (needs `eas login` / `EXPO_TOKEN`), or a plain `npx expo prebuild` plus `./gradlew assembleRelease`. Requires Node, the Android SDK and NDK (and a JDK, typically 17). ([Expo: Local builds](https://docs.expo.dev/build-reference/local-builds/)) Device/emulator APK builds don't need any store account. ([Expo: Build setup](https://docs.expo.dev/build/setup/))
- **Signing keystore:** generate it once and **back it up off-machine**. Losing it means sideload users cannot update in place. Publish the certificate SHA-256 fingerprint with each release.

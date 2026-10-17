---
title: "Protestor Assist Research — Distribution and Accounts"
type: research
project: "[[Protestor Assist — Hub]]"
hub: "[[Protestor Assist Research — Hub]]"
created: 2026-10-17
updated: 2026-10-17
tags: [protestor-assist, research]
---

> Every route to get the app onto iPhones and Android phones in India, ranked by speed and reach, and step-by-step Google Play and Apple enrolment and submission, with official sources.

# Protestor Assist — Distribution Routes Research (iPhone + Android, India)

As of: 17 October 2026. Sources are official (developer.apple.com, support.google.com, developer.android.com, f-droid.org) unless marked otherwise.
Marker key: **[VERIFIED]** = stated on the official page cited. **[UNCERTAIN]** = not stated officially, inferred, or from secondary/press sources. Treat UNCERTAIN items as working assumptions to check.

---

## 0. The context: the Bitchat precedent (Oct 2026)

- On 3 Oct 2026 Apple removed Bitchat from the **India** App Store, citing a MeitY order under **IT Act s.69A**. TestFlight access to Bitchat was also blocked in India. The app stayed available outside India. Google Play also showed it unavailable in India on 3 Oct. TechCrunch did not confirm whether Google was acting on an order. Bitchat's **website** was also inaccessible on various Indian ISPs. In July 2026 GitHub had been ordered to take down Bitchat repositories (under a different provision). Source: TechCrunch, 3 Oct 2026 — https://techcrunch.com/?p=3173486 (press, not official).
- **What this means for every route below:**
  - Store routes (App Store, TestFlight, Play, Galaxy, Indus) each give the government one **single point** to block, and the platform will comply in India.
  - Self-hosted routes (APK on a website, PWA, self-hosted F-Droid repo) can still be blocked at ISP level under s.69A (domain blocking). The government can also order GitHub to take down repositories. They are harder to remove from phones already installed: an installed APK or PWA keeps working after a block. An App Store app also stays on the phone after removal from the storefront, but iOS TestFlight builds stop working when access is disabled or the build expires.
  - **Resilience = more than one channel + phones already holding the app before any order.** Speed of first install matters most for that reason.
- Apple Guideline 5 (intro): "Apps must comply with all legal requirements in any location where you make them available… apps that solicit, promote, or encourage criminal or clearly reckless behavior will be rejected." — https://developer.apple.com/app-store/review/guidelines/ [VERIFIED]

---

# PART A — Every route, compared

## A.1 iPhone

### Summary table (iPhone)

| # | Route | Time to first install | Reach | Cost | What the user must do | Main risks |
|---|---|---|---|---|---|---|
| 1 | **App Store** | ~1–3 days after submission if clean (50% <24h, 90% <48h). Realistically 3–10 days given sensitive category and likely rejection/resubmit cycles [UNCERTAIN] | Unlimited | Already paid (US$99/yr) | Tap Get | s.69A storefront removal in India (Bitchat precedent); rejection under 5.1.1/5.1.5/Guideline 5 |
| 2 | **TestFlight external + public link** | First build needs Beta App Review. Apple publishes no SLA; commonly ~1–2 days [UNCERTAIN] | 10,000 testers per app | Free (within membership) | Install TestFlight app → open link → Accept → Install | Builds expire after 90 days. Apple can disable TestFlight in India (did so for Bitchat). Looks "beta". Same guidelines apply |
| 3 | **TestFlight internal** | Minutes after upload processing; no review | 100, and each must be an App Store Connect user on your team | Free | Accept ASC team invite, then TestFlight | Gives each person ASC account access. Unsuitable beyond a core team |
| 4 | **Ad Hoc** | Same day once you have UDIDs | 100 iPhones per membership year | Free (within membership) | Send you their device UDID; install signed .ipa via link/MDM/Finder | 100-slot cap, burned for the year even if removed mid-year. UDID collection is friction and a privacy exposure (a list of activist devices) |
| 5 | **Enterprise Program** | N/A — not eligible | — | US$299/yr | — | Requires a legal entity with 100+ employees and D-U-N-S. "Not for public apps." Certificate revocation kills all installs |
| 6 | **Alt marketplaces / web distribution** | N/A for India | EU, Japan, Brazil only | — | — | **India not included** |
| 7 | **PWA (Safari, Add to Home Screen)** | Immediate (deploy to HTTPS) | Unlimited | Domain + hosting | Open URL in Safari → Share → Add to Home Screen (iOS 26 opens it as a web app by default) | No background execution. Storage eviction risk if not persisted. ISP domain blocking. Weaker camera/evidence integrity than native |
| 8 | **Free provisioning (personal Apple ID)** | Immediate, but only to your own devices via Xcode | Your own devices | Free | Plug into your Mac | Apps stop launching after ~7 days. Not a distribution route |
| 9 | **Sideloading tools (AltStore Classic etc.)** | Hours per user, with a computer | Tech-savvy users only | Free | Install AltServer on PC/Mac, sign in with their Apple ID, refresh every 7 days, 3-app limit | Impractical. Uses free provisioning terms in a way Apple doesn't sanction. No EU/JP/BR-style legal basis in India |

### 1) App Store
- **Review times [VERIFIED]:** "At least 50% of submissions are typically reviewed in under 24 hours… at least 90% in under 48 hours." — https://developer.apple.com/distribute/app-review/
- **Expedited review [VERIFIED]:** Only for (a) a critical bug fix or (b) an event-related release. Only for a submission already in review. Request at https://developer.apple.com/contact/app-store/?topic=expedite. It is discretionary ("as allowed by availability and demand"). — https://developer.apple.com/help/app-review/after-submitting-for-review/request-expedited-review
  - A first-launch protest app *might* qualify as "event-related" if tied to a dated event, but that is a judgement call [UNCERTAIN]. The page does not say whether expedites apply to TestFlight.
- **Unlisted app distribution** (App Store, discoverable by direct link only) still requires full App Review plus an extra request. It is no faster. It might lower visibility to some extent, but it does not protect against s.69A [UNCERTAIN as to benefit]. — https://developer.apple.com/support/unlisted-app-distribution/
- **Appeals:** App Review Board, one appeal per rejected submission. — https://developer.apple.com/distribute/app-review/
- **Risk:** removal from the India storefront under s.69A. Apps already installed generally keep working, but updates through the India store stop [UNCERTAIN — Apple does not document the behaviour after removal].

### 2) TestFlight external testing
- **Up to 10,000 external testers; public link; no contact info needed; can set criteria and a tester limit (1–10,000)** [VERIFIED] — https://developer.apple.com/testflight/ and https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers
- **First build added to an external group goes to App Review; later builds "may not require a full review"** [VERIFIED] — https://developer.apple.com/help/app-store-connect/test-a-beta-version/overview-of-testflight/
- **Up to six builds can be submitted for TestFlight App Review in 24 hours**; only one build per version in review at a time [VERIFIED] — invite-external-testers page.
- **Builds can be tested for up to 90 days**, then they become unavailable [VERIFIED] — overview page. You must ship a new build at least every ~80 days to keep users working.
- **Beta App Review time:** Apple publishes no figure [UNCERTAIN]. Developer experience is typically under 48h for the first build.
- **Testers can use up to 30 devices each** [VERIFIED] — testflight page.
- An external group can only be created **after an internal group exists** [VERIFIED].
- **Country restriction:** the official pages fetched do not describe per-country TestFlight availability. The Bitchat case shows Apple **can and did disable TestFlight links in India** [press-sourced]. Assume TestFlight is no safer than the App Store against s.69A.
- **User steps:** install the free TestFlight app from the App Store → tap your public link → Accept → Install. Builds show as beta and nag on expiry.

### 3) TestFlight internal testing
- Up to **100** people who "must be App Store Connect users with access to your content" (role: Account Holder/Admin/App Manager/Developer/Marketing) [VERIFIED] — https://developer.apple.com/testflight/
- No review needed; available after build processing [VERIFIED that internal testing needs no Beta App Review].
- **Practical use:** you plus 2–5 trusted co-developers or testers only. Adding activists as ASC users exposes your account to them.

### 4) Ad Hoc distribution
- **100 devices per product family (iPhone, iPad…) per membership year**. Disabling a device does not free a slot. You can only reset/remove devices at the start of a new membership year [VERIFIED] — https://developer.apple.com/help/account/devices/devices-overview
- Since the membership was just reinstated, you may be at the start of a membership year with a full 100 slots. Check Certificates, Identifiers & Profiles → Devices [UNCERTAIN].
- **UDID collection:** each person must give you the device UDID (Finder/Apple Devices app on a computer, or a configuration-profile UDID site). You register it, rebuild the provisioning profile, and re-sign. Every new device means a new build.
- **Practical for volunteers?** Only for a core group (≤100 iPhones total, ever, this year). Useful for organisers or legal observers *before* App Store/TestFlight approval. Not a mass route. Keeping a UDID list of activist phones is a sensitive data set; minimise it.
- Ad Hoc builds are signed with your distribution certificate. If Apple revokes the certificate, the app stops launching [UNCERTAIN — standard behaviour, not on the cited page].

### 5) Apple Developer Enterprise Program
- **Eligibility [VERIFIED]:** a legal entity (no DBAs/trade names), **100+ employees**, D-U-N-S, public website, verification interview, continuous evaluation. US$299/yr. "Only for the internal use and distribution of proprietary apps… not for public apps." — https://developer.apple.com/programs/enterprise/
- **He is not eligible**, and public distribution would be a breach.
- **Revocation:** Apple revokes enterprise certificates used for public distribution, which disables every installed copy at once. The official page does not spell out the consequences [UNCERTAIN as to exact terms; well documented in past enforcement]. **Do not use.**

### 6) Alternative app marketplaces / web distribution
- **EU:** alternative marketplaces + **web distribution** (for approved apps that aren't marketplaces) under the Alternative EU Terms Addendum. iOS 17.4+ [VERIFIED].
- **Japan:** alternative marketplaces, iOS 26.2+ [VERIFIED]. "Only alternative app marketplaces install from a website."
- **Brazil:** alternative marketplaces, iOS 26.5+ [VERIFIED].
- Source: https://developer.apple.com/documentation/marketplacekit/participating-in-alternative-distribution-for-specific-regions
- **India is not listed. There is no alternative distribution for Indian iPhone users** [VERIFIED by omission]. Marketplace eligibility depends on the device's region/Apple account, so Indian users cannot use EU/JP/BR marketplaces. AltStore PAL docs say the device must be physically in the EU with an EU Apple ID (https://faq.altstore.io/llms-full.txt, non-official).

### 7) Progressive Web App on iPhone (Safari, iOS 26)
Capability summary (per firt.dev compatibility notes, updated 13 Oct 2026 — https://firt.dev/notes/pwa-ios/ — non-official but authoritative; WebKit official where marked):

| Capability | iOS status | Notes |
|---|---|---|
| Add to Home Screen | Yes. **iOS 26: every site added to Home Screen opens as a web app by default** | Users go via Share sheet. No install prompt API |
| Camera `getUserMedia` | Yes (since iOS 13) | Works in Safari. Standalone-mode reliability historically weaker [UNCERTAIN — test on iOS 26] |
| Video recording `MediaRecorder` | Yes (since 14.5) | Produces MP4/H.264 on Safari [UNCERTAIN — test codecs] |
| Geolocation | Yes | **Foreground only.** Stops when the app is backgrounded or the screen locks |
| Web Crypto (SHA-256 via `crypto.subtle.digest`) | Yes, in secure contexts [UNCERTAIN — not in firt notes; standard in WebKit for years] | Fine for hashing evidence on-device |
| Offline (Service Worker + Cache API) | Yes | |
| Persistent storage `navigator.storage.persist()` | Supported since 15.2. **WebKit grants it based on heuristics, e.g. whether the site is a Home Screen web app**; persistent origins are excluded from eviction [VERIFIED WebKit] — https://webkit.org/blog/14403/updates-to-storage-policy/ | |
| Storage quota | Home-screen web apps get the browser-app quota (up to 60% of disk per origin) [VERIFIED WebKit] | |
| 7-day eviction | Safari ITP deletes script-writable storage for sites not visited in 7 days of browser use; Home Screen web apps have their own counter and are effectively exempt [UNCERTAIN — from WebKit's 2020 ITP post, not re-verified] | **Evidence must be exported or shared promptly, not kept only in PWA storage** |
| Web Share API (incl. files) | Yes (Web Share 2.0 since iOS 15) | Can hand a video file to the share sheet (save to Files/Photos, WhatsApp, Signal) [UNCERTAIN on file size limits] |
| File download | `<a download>` / blob downloads go to Files [UNCERTAIN] | |
| Web Push | Installed web apps only (16.4+) | |
| Background Sync / Background Fetch / Periodic Sync | **Not supported** | No background upload or location |
| Screen Wake Lock | Yes (installed web apps 18.4+) | Keeps the screen on while recording |

- **Bottom line for iPhone PWA:** it can do a **foreground** evidence camera (record → hash → share/export), rights guides offline, and a **foreground** SOS (tap → opens SMS/WhatsApp share with location via `sms:` link or share sheet). It **cannot** do background location tracking, background upload, lock-screen/volume-button triggers, or guaranteed persistence. It is the **only zero-review, instant, unlimited-reach iPhone route.** It is exposed to ISP domain blocking (as Bitchat's website was), but once installed with cached assets it keeps working offline.

### 8) Free provisioning (personal Apple ID / "Personal Team")
- Only to devices plugged into your Xcode. Apps stop launching after ~7 days. Limit of 10 new App IDs per 7 days (Apple DTS staff reply, which calls these limits "not well documented") — https://developer.apple.com/forums/thread/745359 [partly UNCERTAIN]. **Not a distribution route.** Irrelevant now that he has a paid membership.

### 9) Sideloading tools (AltStore Classic, SideStore, etc.) outside the EU
- AltStore Classic needs **AltServer on a Windows PC or Mac**, the user's **own Apple ID**, same Wi-Fi or USB; **apps expire after 7 days** and need refreshing; **only 3 active sideloaded apps** — https://faq.altstore.io/llms-full.txt (non-official, project docs).
- **Legality/practicality in India:** there is no Indian statutory right to sideload. These tools rely on free developer provisioning, which Apple's terms meant for the user's own development, not third-party apps [UNCERTAIN — no explicit Apple statement fetched]. **Practicality: very poor** for a mass audience of non-technical users under stress. Not recommended.

---

## A.2 Android

### Summary table (Android)

| # | Route | Time to first install | Reach | Cost | What the user must do | Main risks |
|---|---|---|---|---|---|---|
| 1 | **Direct APK (website / GitHub Releases / Telegram / WhatsApp)** | **Immediate** | Unlimited | Free (hosting) | Download → allow "Install unknown apps" for that browser/app → Install → accept Play Protect prompts | India Play Protect pilot **blocks** if the APK declares RECEIVE_SMS, READ_SMS, notification-listener or accessibility. ISP/GitHub blocking. Fake/malicious copies |
| 2a | **Play internal testing** | Minutes (first upload: immediately, temp listing up to 48h) | 100 testers, by email list | US$25 one-time | Be on your email list, opt in via link, install from Play | Needs a Google account per tester. Not public |
| 2b | **Play closed testing** | Hours to publish the test; first review [UNCERTAIN, ~1–3 days] | Effectively large (up to 200 lists × 2,000; Google Groups) | US$25 | Join a Google Group/list, opt in via link, install from Play | Not searchable. This is the mandatory 14-day gate |
| 2c | **Play open testing** | **Not available until production access** | Unlimited | — | — | — |
| 2d | **Play production** | ~3–5 weeks for a new personal account (ID check + 14-day test + ≤7-day production access review + app review) [estimate] | Unlimited | US$25 | Install from Play | s.69A removal (Bitchat). Restricted-permission policies (SMS, background location) |
| 3 | **F-Droid main repo** | Weeks (review queue) [UNCERTAIN], then 24–48h after merge | Privacy-conscious minority | Free | Install F-Droid client (itself an APK), find app | Strict FOSS rules. Anti-feature labels |
| 3b | **Self-hosted F-Droid repo** | Same day | Same as F-Droid users | Free | Add repo URL/QR in F-Droid client | ISP blocking of your domain |
| 4 | **Obtainium + GitHub Releases** | Same day | Tech-savvy | Free | Install Obtainium, add your GitHub repo URL | GitHub takedown orders (GitHub was ordered to remove Bitchat repos, July 2026) |
| 5 | **Alt stores (Galaxy Store, Indus)** | Days to weeks [UNCERTAIN] | Samsung/Indus users | Free / free first year | Install from store | Same s.69A exposure. Slow, opaque reviews |
| 6 | **PWA (Chrome)** | Immediate | Unlimited | Domain | Open URL → Install prompt | No background location. Domain blocking |

### 1) Direct APK sideloading
- **User steps:** download the APK in Chrome/WhatsApp/Telegram/file manager → Android prompts "For your security, your phone is not allowed to install unknown apps from this source" → Settings → allow **"Install unknown apps"** for *that* source app → back → Install → Play Protect may scan, warn, or offer to scan [UNCERTAIN exact wording varies by Android version and Play Protect build].
- **India enhanced fraud protection (Play Protect) [VERIFIED, Google's own announcement]:** from Nov 2024, rolling out to all Android devices with Google Play services in India. Play Protect **blocks installation** of apps from "Internet-sideloading sources, such as web browsers, messaging apps and file managers" that declare **any** of these four permissions:
  1. `RECEIVE_SMS`
  2. `READ_SMS`
  3. `BIND_NOTIFICATION_LISTENER_SERVICE` (Google wrote "BIND_Notifications")
  4. `BIND_ACCESSIBILITY_SERVICE` (Google wrote "Accessibility")
  — https://blog.google/intl/en-in/products/launching-enhanced-fraud-protection-pilot-in-india/
  - **Design consequence:** the sideloaded APK must **not** declare any of these. `SEND_SMS` (for SOS texts) is **not** on the list. Do **not** use an accessibility service for volume-button or power-button SOS triggers: it gets the APK blocked in India. Whether Google has since widened the list is not shown in the sources fetched [UNCERTAIN — re-check before release].
- **Android developer verification (sideloaded apps) [VERIFIED]:**
  - From **30 Sep 2026**, enforcement covers certified devices in **Brazil, Indonesia, Singapore, Thailand** only. Global rollout is "**2027 and beyond**." **India is not in the first wave and has no announced date** [VERIFIED by omission].
  - Requirements once it applies: register in the Android Developer Console (Play developers are registered automatically), verify identity, and register package names by uploading an APK signed with your key.
  - A free **limited-distribution** account (no government ID) covers **up to 20 devices**.
  - Unregistered apps remain installable via ADB or the **"advanced flow"**: enable developer mode → "are you being coached?" check → restart and re-authenticate → **one-day wait** → confirm with biometrics/PIN → then installs from unverified developers are allowed for 7 days or indefinitely, with an "Install Anyway" warning.
  - Sources: https://developer.android.com/developer-verification/guides ; https://developer.android.com/blog/posts/android-developer-verification-rolling-out-to-all-developers-on-play-console-and-android-developer-console ; https://android-developers.googleblog.com/2026/03/android-developer-verification.html
  - **Action:** once you have a Play Console account, register the sideload package name under the same signing key so the APK route survives the 2027 India rollout [UNCERTAIN whether Play-only registration covers APKs distributed off-Play with the same key — check the Developer Console FAQ].
- **Distribution channels:** GitHub Releases (with SHA-256 checksums and a signing-cert fingerprint published on your site), own website, Telegram channel, WhatsApp file share. **Always publish the signing certificate SHA-256** so people can tell your build from tampered copies.
- **Blocking risk:** s.69A ISP blocking of your domain. GitHub takedown orders (Bitchat precedent). Telegram/WhatsApp forwarding is hard to block but spreads unverified copies.

### 2) Google Play tracks (new personal account, created now)
- **Testing requirement [VERIFIED]:** applies to personal accounts created after 13 Nov 2023. You need a **closed test with at least 12 testers, opted in continuously for at least 14 days**. At least 12 must be opted in when you apply. **"Open testing becomes available after you gain production access."** The production-access review "usually takes seven days or less." — https://support.google.com/googleplay/android-developer/answer/14151465
- **Internal testing [VERIFIED]:** up to **100 testers**, added **by email list** (typed or CSV). Testers need a Google account. New bundles are available "within minutes". A first upload is available immediately but shows a temporary name/listing for up to 48 hours. Internal tests "may not go through standard Play policy or security reviews." — https://support.google.com/googleplay/android-developer/answer/9845334
  - **[UNCERTAIN]** The answer for 9845334 notes the new-personal-account testing requirement "before making an app available on Google Play". Internal testing is generally usable before production access, but confirm in your Console.
- **Closed testing [VERIFIED]:** email lists (up to 200 lists × 2,000 users, 50 per track), **Google Groups**, or organisations. The opt-in link appears only once the app is "Published" (on that track). The first publish can take several hours. — same page.
- **Open testing [VERIFIED]:** unlimited (or a cap ≥1,000), searchable. Only **after** production access.
- **Restricted permissions that will bite [VERIFIED]:**
  - **SEND_SMS** is in the restricted SMS group. There is an exception for **"Physical safety/emergency alerts to send SMS: apps that send SMS alerts in emergency situations"**, which needs a **Permissions Declaration Form**. Google expects you to use the SMS **Intent** (pre-filled message the user sends) if that suffices. — https://support.google.com/googleplay/android-developer/answer/10208820
  - **Background location** needs a declaration form (one feature only), a ≤30-second video, a prominent in-app disclosure containing the word "location", and a privacy policy URL that isn't a PDF. Google treats physical safety as a significant user benefit. — https://support.google.com/googleplay/android-developer/answer/9799150
  - **Target API:** new apps submitted from **31 Aug 2026** must target **Android 16 (API 36)**. An extension to 1 Nov 2026 can be requested. — https://developer.android.com/google/play/requirements/target-sdk
- **Practical shortcut:** build a **Play-safe flavour** (SMS via Intent, foreground-only location) and a **sideload flavour** (direct SEND_SMS, same package, no blocked permissions). Different features under one package name complicate declarations, so consider separate application IDs [UNCERTAIN — design choice].

### 3) F-Droid
- **Inclusion [VERIFIED]:**
  - FLOSS licence; reviewers build from source with a FLOSS toolchain.
  - **No Google Play Services, Firebase, Crashlytics, or proprietary ad/tracking SDKs.** A FLOSS build flavour is acceptable.
  - F-Droid will not sign up for API keys.
  - Apps must be maintained and useful.
  - Source: https://f-droid.org/docs/Inclusion_Policy/
- **Anti-features [VERIFIED]:** Ads, DisabledAlgorithm, KnownVuln, NonFreeAdd, NonFreeAssets, **NonFreeDep** (needs proprietary software installed, e.g. Google Maps), **NonFreeNet** (promotes or depends entirely on a proprietary network service), NoSourceSince, **TetheredNet**, **Tracking** (not applied if opt-in, off by default). — https://f-droid.org/docs/Anti-Features/
  - **Google Drive API upload:** if optional, it likely earns *NonFreeNet* at most; if core, it may also hit the "no API keys" problem [UNCERTAIN — F-Droid doesn't address Drive specifically]. A Drive client library (Google Play Services auth) would be a NonFree dependency → needs a FOSS flavour.
- **Process and timing [VERIFIED]:** fork `fdroiddata` → add `metadata/<appid>.yml` → test with `fdroid lint/build` → merge request labelled "New App". After merge, the app typically appears "around 24 to 48 hours" later. **Time from MR to merge is not stated**; in practice weeks to months depending on queue [UNCERTAIN]. — https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/
- **Reproducible builds [VERIFIED]:** not required but encouraged. With them, F-Droid ships **your** signed APK (same signature as GitHub/Play builds), so users can switch channels without reinstalling. **Decide this before the first release:** switching signing keys later forces reinstalls.
- **Self-hosted repo [VERIFIED]:** `fdroid init` → put APKs in `repo/` → `fdroid update -c` → publish `repo/` over HTTPS (or `fdroid deploy`). Keep the keystore and `config.yml` off the server. Users add `https://yourdomain/fdroid/repo/` in Manage Repos. — https://f-droid.org/docs/Setup_an_F-Droid_App_Repo/
- **IzzyOnDroid** (third-party F-Droid-format repo that pulls APKs from GitHub releases) is usually faster than the main repo [UNCERTAIN — not researched on official F-Droid pages].

### 4) Obtainium / GitHub release channel
- Obtainium installs and updates apps straight from GitHub/GitLab/Codeberg releases, F-Droid and third-party repos, direct APK links, and more. It notifies on new releases. — https://github.com/ImranR98/Obtainium (project page)
- User steps: install Obtainium (APK or F-Droid) → Add App → paste your repo URL. Good for an update channel for power users; poor for first-time mass users.
- Risk: depends on GitHub (takedown orders) unless you also publish on Codeberg or your own domain.

### 5) Alternative Android stores in India
- **Samsung Galaxy Store:** Seller Portal registration. The official launch page gives **no review time or fee**. Developer forum threads report "Under Device Test" lasting weeks [UNCERTAIN]. — https://developer.samsung.com/galaxy-store/launch.html
- **Indus Appstore (PhonePe):** self-serve developer platform. **Free listing for the first year, then a "nominal annual fee"**; zero commission. Supports 12 Indian languages. No published review time [UNCERTAIN]. Source is a PhonePe press release, 23 Sep 2023 — https://www.phonepe.com/press/phonepe-announces-the-launch-of-the-indus-appstore-developer-platform/
- **Amazon Appstore:** discontinued on non-Fire Android devices from **20 Aug 2025** (press, e.g. https://9to5google.com/2025/02/20/amazon-appstore-android-shutting-down-2025/). **Not a route.**
- **Huawei AppGallery:** negligible India reach (Huawei phones are largely absent from India) [UNCERTAIN]. **Skip.**
- All of these are as exposed to s.69A as Play, with slower and less predictable reviews. They are low priority.

### 6) PWA on Android (Chrome)
- **Installable** via Chrome's install prompt (manifest + service worker + HTTPS). Chrome generates a WebAPK, so it shows in the launcher and app drawer [UNCERTAIN — not re-fetched; long-standing Chrome behaviour].
- **Capabilities:** camera/`MediaRecorder` (WebM/MP4), Geolocation (foreground), Web Crypto, offline via service worker, Web Share with files, Background Sync. Persistent storage is granted more readily to installed apps.
- **Limits:** no background geolocation; no direct SMS sending (only `sms:` links).
- It is the same codebase as the iPhone PWA, so one build covers both platforms immediately.

---

# PART B — Step-by-step enrolment and submission

## B.1 Google Play Console — personal account, individual in India

**Prepare (Day 0):**
- A Google account you will keep for life. Use a dedicated one, with 2-Step Verification on. You must be 18+.
- **Payment card** in your legal name for the **one-time US$25 fee**: Visa, Mastercard, Amex, or Visa Electron (outside US). **Prepaid cards not accepted.** The fee is **not refunded** if your info is judged invalid. — https://support.google.com/googleplay/android-developer/answer/6112435
- **Government photo ID**: unexpired, colour, clear, not a photocopy. It must match your Google **payments profile** name and address exactly. — https://support.google.com/googleplay/android-developer/answer/14177239
  - The India-specific accepted document list sits on a separate "acceptable documents by country" article that was not fetched. Passport, Aadhaar, driving licence and PAN are commonly used [UNCERTAIN]. A passport is the safest choice.
- **Address**: legal address on the payments profile. Address-proof documents may be requested [UNCERTAIN].
- **Phone numbers and emails**: private contact email, private phone, contact phone (each verified by OTP), and a **public developer email** (shown on Play).
- **A physical Android phone**: Android 10+, not rooted, for **device verification** through the Play Console mobile app. Verification takes under a minute. — https://support.google.com/googleplay/android-developer/answer/14316361
- **D-U-N-S: not needed** for personal accounts [VERIFIED].

**Enrol:**
1. Go to play.google.com/console → sign up → accept the Developer Distribution Agreement → pay US$25 → choose **Personal** account (cannot be changed later).
2. Create or select a **personal payments profile** (legal name and address).
3. Enter private contact info (OTP-verified) and the public profile: developer name, public email, optional website.
4. **Identity verification:** upload ID. Review "may take a few days." [VERIFIED]
5. **Device verification:** Play Console web → Home → task → scan QR → Play Console app → Verify.

**What's shown publicly [VERIFIED, with one tension]:**
- The developer name, which can differ from your legal name and "can be changed any time" — https://support.google.com/googleplay/android-developer/answer/13628312
- Your **legal name, country and developer email** are also displayed. Your full address is shown only if you monetise.
- The 14177239 article says "your legal name is shown as your developer name." **Assume your legal name is publicly visible on the listing either way.**

**Closed test (the 14-day gate):**
1. Create the app → set up store listing basics, privacy policy URL, Data safety form, content rating, target audience, and the App access/ads declarations.
2. **Testing → Closed testing →** create a track → **Testers:** add a **Google Group** (simplest; people self-join) or an email list. Recruit **at least 15–20**, not 12, to absorb drop-outs.
3. Upload an AAB targeting API 36 → roll out to the closed track. The first publish goes through review [UNCERTAIN on time, typically hours to a few days] → copy the **opt-in link** → each tester opens it, taps **Become a tester**, and installs from Play.
4. **"Continuously opted in for 14 days"** is tracked by Play automatically; there is nothing to upload as proof. The Console dashboard shows progress toward the requirement [UNCERTAIN on exact UI].
   - Testers must not opt out. Ask them to open the app a few times and send feedback (the questionnaire asks about feedback).
   - Push 2–3 updates during the 14 days to show iteration.
5. **Recruiting 12+:** colleagues, juniors, law-school contacts, friends. Google Group invite plus a WhatsApp message with the opt-in link. Avoid paid "tester exchange" services: their value under Google's review is unclear, and they add risk of low-quality engagement [UNCERTAIN].

**Apply for production access (Dashboard → Apply for production) [VERIFIED questionnaire]:**
- **About the closed test:** how easy recruiting was; whether testers used all features; whether usage matched expected production behaviour and any differences; a summary of feedback and how it was collected.
- **About the app:** target audience; value proposition; estimated first-year installs.
- **Production readiness:** what changed based on the test; how you decided it was ready.
- Review "usually seven days or less." Then submit the production release (normal app review; new-developer reviews can take several days [UNCERTAIN]).

**Realistic Play timeline:**
- ID verification: 2–4 days
- Closed track review: 1–3 days
- Closed test: 14 days
- Production access: ≤7 days
- Production review: 1–7 days

That is **≈ 3.5–5 weeks** to public Play availability. Internal testing (100 people) can start once the account is verified.

## B.2 Apple — now that the membership is reinstated

1. **Agreements:** App Store Connect → Business → accept the latest Program License Agreement. The free-apps agreement is enough; no paid-apps banking or tax setup is needed for a free app [UNCERTAIN on whether a reinstatement prompts re-acceptance].
2. **Certificates, Identifiers & Profiles:**
   - Register the **Bundle ID** (explicit, e.g. `in.<yourname>.protestorassist`). It is permanent and cannot be reused, so pick carefully.
   - Enable capabilities: Push only if used; Background Modes "location" only if you truly need it (it invites scrutiny under 2.5.4/5.1.5).
   - Create an Apple Distribution certificate.
3. **App Store Connect → Apps → + New App:**
   - Platform iOS, name (must be unique on the store), primary language, bundle ID, SKU.
4. **Upload a build** from Xcode (Archive → Distribute → App Store Connect).
   - Set `ITSAppUsesNonExemptEncryption = NO` in Info.plist if you only use OS-provided crypto (HTTPS via URLSession, CryptoKit SHA-256 hashing). This skips the export questions on every upload. — https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations
   - OS-provided encryption such as HTTPS "is typically exempt"; proprietary encryption is not.
   - Note Apple's warning that apps using exempt encryption **may need to file a US year-end self-classification report** [VERIFIED that Apple says this; whether it applies to hashing-only is UNCERTAIN].
   - If you add your own end-to-end encryption (e.g. encrypted evidence vault with libsodium), answer YES and follow the documentation upload flow.
5. **TestFlight:**
   - Create an **internal group** (required first) and add yourself.
   - **Test Information:** beta app description, feedback email, contact info, privacy policy URL, and review notes/demo info (field list per "Provide test information" — partly UNCERTAIN, as the page was not fully read).
   - Create an **external group** → Add Build → "What to Test" → **Submit Review**.
   - After approval: **Testers → Create Public Link → Open to Anyone** (or filter by iOS version) → set a tester limit up to 10,000. — https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers
6. **App Privacy (nutrition label):** App Store Connect → App Privacy. — https://developer.apple.com/app-store/app-privacy-details/
   - **On-device-only data is not "collected"** and need not be declared.
   - If evidence never leaves the phone except by the user's own share-sheet action, and there is no server, analytics or crash SDK, you may legitimately declare **"Data Not Collected"**.
   - If the app uploads to your server or cloud, declare **Precise Location** (≥3 decimal places) and **Photos or Videos**, plus Contacts if SOS contacts are synced off-device.
   - A **privacy policy URL is required.**
7. **App Store submission:**
   - Screenshots, description, support URL, age rating questionnaire.
   - **App Review notes:** explain each permission, that SOS opens Messages for the user to send (not automated), and that the rights content is general legal information authored by an advocate.
   - **Developer name shown: your personal legal name as the seller** ("Your name will be displayed as the seller name of your apps on the App Store") [VERIFIED] — https://developer.apple.com/programs/enroll/. The only way to hide it is an organisation account: a legal entity plus D-U-N-S (trust/Section 8 company/LLP), which takes weeks.

**App Review Guidelines most likely to bite (quotes [VERIFIED] from https://developer.apple.com/app-store/review/guidelines/):**
- **5.1.5 Location Services — biggest risk for "SOS":** "Location-based APIs shouldn't be used to provide **emergency services**…"
  - **Do not market the app as an emergency service.**
  - Word it as "share my location with my contacts" or "alert my trusted contacts", with a clear note to call **112** for emergencies (link to `tel:112`).
  - Explain the purpose of location in-app; get consent before collecting or transmitting location.
- **5.1.1 Data Collection:**
  - (i) privacy policy linked in metadata **and inside the app**;
  - (ii) consent, and a way to withdraw it;
  - (iii) data minimisation — request only what core features need;
  - (iv) no manipulative permission prompts;
  - (v) no forced login; if accounts exist, in-app account deletion.
- **5.1.1(ix) Highly regulated fields:** apps in highly regulated fields, "or that require sensitive user information", "should be submitted by a legal entity… not by an individual developer". A reviewer *could* invoke this against a legal-rights app collecting sensitive data from an individual account [UNCERTAIN — legal services are not in the listed examples; minimise data and keep everything on-device to stay clear].
- **5.1.2(i) Data Use and Sharing:** no sharing of personal data without permission. Disclose any third parties, including third-party AI.
- **Guideline 5 intro:** comply with local law wherever available; apps that "solicit, promote, or encourage criminal or clearly reckless behavior will be rejected."
  - Frame the content as **know-your-rights / lawful documentation** (e.g. recording in public places, rights on arrest under BNSS).
  - **No** content on evading police, defeating internet shutdowns, or organising unlawful assemblies.
- **1.4.5 Physical harm:** do not "urge customers to participate in activities… that risk physical harm". Avoid copy that encourages confronting police or entering danger to film.
- **1.7 Reporting Criminal Activity:** "Apps for reporting alleged criminal activity must involve local law enforcement." Avoid framing evidence capture as "report police crimes". Frame it as personal record-keeping and legal-aid documentation.
- **2.5.4 Background services:** background modes only for their intended purpose (location, audio, etc.). Background recording or location will be scrutinised.
- **4.2 Minimum functionality:** a native app must be more than a wrapped website. The rights-guide content alone wouldn't pass; the camera plus SOS makes it "app-like".
- **5.6.2 Developer identity:** information must be truthful and current.
- **1.4.1** (medical) is not relevant unless you add first-aid content. If you do, include "consult a doctor" language.

---

# Ranking by speed × reach

**iPhone:**
1. **PWA:** hours, unlimited, no review. Limited capabilities; foreground only.
2. **TestFlight public link:** ~1–3 days after the first upload; 10k cap; 90-day builds.
3. **App Store:** ~2–10 days; unlimited; the most durable once installed.
4. **Ad Hoc:** same day; ≤100 devices. For core organisers only.
5. **TestFlight internal:** minutes; ≤100, team members only.
6. The rest (Enterprise, alt marketplaces, free provisioning, AltStore) are not viable in India.

**Android:**
1. **Direct APK** (GitHub/site/Telegram/WhatsApp): minutes; unlimited. Must avoid the 4 blocked permissions.
2. **PWA:** minutes; unlimited; shared codebase with iPhone.
3. **Self-hosted F-Droid repo / Obtainium:** same day; savvy users; gives an update channel.
4. **Play internal testing:** days (account verification); 100.
5. **Play closed → production:** ~3.5–5 weeks; unlimited and highest trust.
6. **F-Droid main repo:** weeks; niche but trusted.
7. **Galaxy Store / Indus:** slow and opaque; low priority.

**Not researched or unconfirmed:**
- exact Beta App Review SLA;
- India ID-document list for Play;
- whether the Play Protect India permission list has expanded since 2024;
- TestFlight per-country controls;
- Indus/Galaxy review times;
- whether Play-only developer registration covers off-Play APKs with the same key.

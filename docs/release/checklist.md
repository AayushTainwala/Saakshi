# Release checklist

Moved from `docs/BUILD_HANDOFF.md` on 10 Nov 2026, word for word. This is a living list: builders and the review session add to it and tick it off. Section names it cites ("Group 1.7", "Stream B", "Owner questions") are now in [../handoff/](../handoff/).

Things that must be done or decided before a release goes public. Streams add items as `- [ ] (Stream X, release) item`.

- [ ] (Stream B, R2) **Supabase plan for live location.** `saakshi-live` stays on the free plan while testing (owner's answer). Before R2 goes public, review the plan: free-plan projects can be paused when inactive, which would break every live link without warning.
- [x] (Stream B, R2, for Stream D) **Privacy texts for live location.** Update the privacy policy, the Apple privacy label and Play's Data safety answers before an R2 build is published (facts in Stream B, "For Stream D"). *Done by Stream D, 21 Oct, NEEDS OWNER REVIEW.*
  - The privacy policy, English and Hindi, describes live location's server, bug mode and its witness texts.
  - Apple's label becomes **Location → Precise Location, App Functionality, not linked to you**.
  - Play's Data safety declares **Precise location, collected, optional, for App functionality, encrypted in transit, deletable**, plus a foreground-service declaration for camera, microphone and location.
  - The App Review notes drop "No server".
  - Still open: Supabase's log retention for IP addresses (see `store/apple/privacy-label.md`).
  - **Brought up to round 2, Part 1 on 10 Nov (review session), NEEDS OWNER REVIEW.** The policy (English and Hindi, dated 10 November 2026) now covers: "Share my location", "I need help" and "My phone is being taken" as the ways live location starts; the share with no fixed end, deleted a week after the phone last reports; the battery level sent at 20% or less; positions sent every 5 minutes at 5%; Pocket recording in place of bug mode; the low-battery text from the Android APK; the secret code; Android's screen lock (device admin, lock only); and the map on the live page, which sends the viewed position to OpenStreetMap (owner, 10 Nov: keep the map and say so). The Apple label notes, Play's Data safety notes and the App Review notes follow.
  - Still open, and marked in those files: which Apple and Google data type the battery level is declared under (neither store's own page could be read from the session), and whether either form reaches the live web page's map.
  - **Merging to `main` publishes the policy:** `pages.yml` puts `store/site/` on GitHub Pages.
- [ ] (Review, beta) **Owner's sign-offs:** the certificate text (then set `FORM_TEXT_REVIEWED`), the rights prompts, and every Hindi string.
- [ ] (Review, beta) **Design pass:** directions mocked up and chosen by the owner, then applied; a real app icon and launch screen in place of Expo's placeholders.
- [ ] (Review, beta) **Phone testing:** every feature on at least one iPhone and two different Android phones (one Samsung, one Xiaomi, Oppo or Vivo), with what was found fixed.
- [ ] (Stream D, beta) **TestFlight Submit step** in the Release workflow works from CI.
- [ ] (Stream D, beta) **Dependency audit:** `npm ci` reports 61 known vulnerabilities in build tools. Triage which, if any, reach the app; don't run `npm audit fix --force`.
- [ ] (Stream D, beta) **TestFlight public link** (Apple's beta review) and **Play closed test** (12 or more testers for 14 days).
- [ ] (Review, beta) **Rights and safety guides (G1, G2):** the owner decides whether they join the beta.
- [ ] (Round 2, release) **Device admin on Android (group 1.7):** say in the Play listing and the review notes why Saakshi asks for it (force-lock only, opt-in, switched off in Settings), and in the privacy policy that it reads nothing. If Play's review objects, the Play build can ship without it. Play's rules that touch it (Malware: Ransomware and Elevated Privilege Abuse; Deceptive Device Settings Changes) are quoted in "Group 1.7"; describe it as locking the screen, never as stopping Saakshi being deleted (question in "Owner questions").
- [ ] (Round 2, release) **Power-off lock requests.** Draft and file the requests to Apple (Feedback Assistant), Google and phone makers asking for a power-off lock; the release notes say a power-off lock is an essential safety feature, which phones offer it, that we have asked, and how readers can ask too (SPEC G5). **At release, not now.**
- [ ] (Round 2, release, start early) **Google Play's SMS permission:** apply under "Apps that send SMS alerts in emergency situations" so the Play version sends by itself.
- [ ] (Round 2, release, start early) **Google's review of email sending** (after round 2, for email contacts).
- [ ] (Round 2, release, start early) **Apple Critical Alerts entitlement** (to sound through Do Not Disturb); time-sensitive notifications are used until then.
- [ ] (Round 2, release) **Privacy policy, Apple privacy label and Play Data safety:** add every channel and what passes through our server (Saakshi-to-Saakshi, the silence alarm's check-ins, Google Drive), from `docs/spec/alerts.md` section "privacy-policy facts".
- [ ] (Round 2, beta) **Supabase plan.** The server now carries a safety feature (the silence alarm); the free plan's pausing of quiet projects is unacceptable for the beta. Move `saakshi-live` to Pro before the beta, not only before the public release.
- [ ] (Round 2, release) **Google Cloud OAuth:** publish the consent screen out of "Testing" so Drive tokens last past a week.

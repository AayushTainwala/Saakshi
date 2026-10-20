# Build Handoff

The pickup file for build sessions. Each stream keeps its own section current: status, what was done, what's next, questions for the owner. Read [CLAUDE.md](../CLAUDE.md) first.

## Order

1. **Stream A** starts first and merges the shell (navigation, i18n, theming, module layout) to `main`.
2. **Streams C and D** may start before the shell is merged, on work that doesn't touch the app's code:
   - C: helpline verification, the law-note checks, and drafting content in Markdown under `docs/content/`;
   - D: `eas.json`, the GitHub Actions workflows, the credential steps, and store text in `store/`.

   Each then rebases on `main` once the shell is merged, and moves its content into the app's structure.
3. **Stream B** starts once the shell is merged, because its work is all app code.
3. Each stream opens pull requests into `main`. The owner (or a review session) merges them.

## Owner questions

Streams add questions here as `- [ ] (Stream X) question`.

- [x] (Stream A) **Deleting recordings.** *Answered 20 Oct:* ordinary delete ships in R1, one session at a time with a confirmation. Quick delete (E9) stays held back. SPEC E5.
- [x] (Stream A) **Segment length.** *Answered 20 Oct:* the evidence camera saves one file from start to stop, with no segments and no joining; the format must survive a sudden cut-off (check its cost on both platforms first and report in this handoff). Segments are for bug mode and body-cam mode only. SPEC E1, E8, body-cam mode.
- [x] (Stream A) **Certificate language.** *Answered 20 Oct:* English only for now, with the Hindi help text kept. SPEC E4.
- [x] (Stream A) **App Attest environment.** *Answered 20 Oct:* `production` confirmed.
- [ ] (Stream C) **Helpline list updates.** The Help tab fetches `helplines/helplines.json` from raw.githubusercontent.com each time it opens (a plain GET; nothing of the user's is sent, but GitHub sees the phone's IP address). Keep it automatic, or only on a "Check for updates" tap? And should the list be signed, so that a compromised `main` branch can't change numbers on every phone? Today it is only schema-checked.
- [ ] (Stream C) **Lawyers and medics list.** The schema (`src/modules/helplines/schema.ts`, `helplines/README.md`) shows name, phone, city, state and languages, and records the registration number, consent date and an expiry (`listedUntil`) in the public file. Is publishing the registration number right, or should it be checked and kept off GitHub? Who collects the written consent, and where is it kept?
- [ ] (Stream C) **"What police may ask of a phone"** (SPEC G5) is left out of the guide: `docs/research/law.md` has nothing on demands to unlock a phone or give a passcode. It needs its own research from statutes and judgments first. Shall I do that next?
- [ ] (Stream C) **SPEC section 6, BNS s.37.** Read verbatim on 20 Oct (`docs/research/law.md`, section 2F). The SPEC says "Explanations 1 and 2 keep the right where the person is not known to be a public servant, or does not state or produce their authority when asked". In the text, the stating or producing of authority is only in Explanation 2. That Explanation covers someone acting *by the direction of* a public servant. Explanation 1, for the public servant themself, turns only on whether the person knows or has reason to believe they are one. Shall I correct the SPEC line? It affects the v1.1 unlawful-detention card.
- [ ] (Stream C) **Carrying ID.** Should the "what to take" list tell people to carry a photo ID? It is left out because it has legal weight.

---

## Shell conventions (for every stream)

Set up by Stream A in the shell pull request. Follow these so streams don't collide.

- **Routes** live in `src/app/`. The five tabs are `src/app/(tabs)/{record,sos,guides,help,settings}/`, each its own stack (`_layout.tsx` plus `index.tsx`). Add a tab's screens inside its folder. Full-screen flows that hide the tab bar (the camera, the code pad) go at the root of `src/app/`. `/` redirects to `/record`.
- **Screens stay thin.** Feature logic and feature UI live in `src/modules/<name>/` and are imported only through `@/modules/<name>` (its `index.ts`). ESLint (`no-restricted-imports`) rejects `@/modules/<name>/<file>` imports.
- **Strings:** i18next with one namespace per area: `src/i18n/locales/{en,hi}/{common,settings,record,sos,guides,help}.json`. Each stream owns its namespace file. To add a namespace, add the JSON for both languages and list it in `src/i18n/resources.ts`. Keys are typed: `useTranslation('sos')` then `t('call112')`, and a key missing from English fails `tsc`. `src/i18n/__tests__/resources.test.ts` fails if Hindi lacks a key, has an empty string or drops a `{{placeholder}}`.
- **Language:** the phone's language by default (the first of its preferred languages that we support, else English); Settings → Language overrides it. Preferences are stored in `preferences.json` in the app's documents directory (`src/preferences/`).
- **Theme:** `useTheme()` from `@/theme` gives `{ scheme, colors }`; tokens (`spacing`, `radius`, `typography`, `touchTarget = 56`) are in `src/theme/tokens.ts`. Body text is 18 pt, nothing under 16 pt. `src/theme/__tests__/theme.test.ts` checks WCAG contrast for both palettes; keep it passing if you change colours.
- **Shared components** in `src/components/`: `Screen`, `AppText` (variants `small`, `body`, `label`, `heading`, `title`, `mono`), `Button` (`primary`, `secondary`, `danger`; at least 56 pt tall), `Card`, `OptionGroup`.
- **Tests:** `npx jest` (preset `jest-expo`, Testing Library for React Native v14, where `render` and `fireEvent` are async). Name tests `*.test.ts(x)` and put them in `__tests__/` beside the code (other files there, such as fakes, are not run as tests), never inside `src/app/` (every file there is a route). CI runs typecheck, lint and tests.
- **`expo-doctor`:** two of its checks need `exp.host` and `reactnative.directory`, which this cloud environment can't reach; the remaining checks pass.

---

## Stream A: Foundation and evidence

**Status:** R1 evidence pipeline (E1, E2, E4, E5, E6) built and tested in code; not yet run on a phone. Owner decisions of 20 Oct (owner questions above) add: ordinary delete, one-file video, and body-cam mode (B1–B4) in R1.
- Shell: merged to `main` (https://github.com/AayushTainwala/Saakshi/pull/1). **Streams B, C and D can start.**
- Evidence: https://github.com/AayushTainwala/Saakshi/pull/2 (`stream-a/evidence`), ready for review. The Native build workflow compiles the Android debug and iOS simulator apps successfully.

**Done, shell:**
- Template demo screens and assets removed; Expo Router native tabs Record, SOS, Guides, Help, Settings; i18next with English and Hindi and a language switch; light and dark themes with a switch; module stubs for `evidence`, `sos`, `location`, `bugmode`, `cloud`, `guides`, `helplines`; jest-expo with tests for i18n completeness, language choice, preferences and colour contrast; Expo packages updated to SDK 58's expected patch versions.
- The SOS tab has a "Call 112" button only; the rest of SOS is Stream B's. The Hindi strings are Stream A's first pass for Stream C to review.

**Done, evidence** (one commit per step on `stream-a/evidence`):
1. `docs/spec/evidence-bundle.md` v0.1: records, ES256 signatures over the RFC 8785 canonical record file, the per-session chain, Android Key Attestation and Apple App Attest binding, the bundle, certificate Part A, the witness message, and how to verify with `openssl`.
2. **E1 capture:** full-screen camera (`expo-camera`) for photos and video; video in 60-second segments; the latest location fix for each file.
3. **E1 hashing:** local Expo module `modules/saakshi-evidence` (`hashFile`) reads each file once in 1 MiB chunks for SHA-256, SHA-1, MD5 and CRC-32 (Android in plain Java on the IO dispatcher, iOS with CryptoKit in a detached task). Files are hashed at the camera's path before they are moved into the locker.
4. **E1 signing:** one device key per install. Android: Keystore EC P-256 in StrongBox or the TEE, with Key Attestation. iPhone: Secure Enclave P-256, bound to App Attest by attesting the SHA-256 of its public key; the app retries App Attest when the Record tab opens until it succeeds (it needs the internet once). Each file gets a signed record chained to the one before.
5. **E5 locker and export:** session screen with status (fingerprinted and signed, checked on this phone, witness message sent, certificate made), the chain head and each file's SHA-256; "Check files" re-hashes everything and checks the chain; "Export bundle" writes the ZIP in the spec and opens the share sheet. `tools/verify-bundle.mjs` checks a bundle with Node alone.
6. **E2 witness message:** opens the SMS app with the chain head, time (IST) and place; every attempt is noted in the manifest and hash report.
7. **E4 certificate:** a form for name, relation, address, IMEI (with `*#06#` help) and ownership; Part A pre-filled (Mobile, make and model, SHA256 and each file's hash) with the hash report enclosed, as a PDF saved with the session and added to the bundle. It states that Part B needs an expert.
8. **E6 rights prompts:** seven prompts drawn over the camera preview, with previous, next and hide; `rights/prompts.ts` lists the law.md source of each.
9. **For Stream B:** `createEvidenceSession()` from `@/modules/evidence` seals any recording (audio included) as it closes; use it for bug mode's segments (E8).

**Verified:**
- **Streaming hash on 1 GiB:** `modules/saakshi-evidence/verify/verify-hashing.sh` runs the Android hasher (the same `StreamingHasher.java`) on a 1 GiB random file with the JVM heap capped at 16 MB. Size, SHA-256, SHA-1, MD5 and CRC-32 all match `sha256sum`, `sha1sum`, `md5sum` and zlib; 10.1 s in this cloud container, 4 MB of heap used. It also passes on GitHub's runner (the Native build workflow's first job).
- **iOS hashing** uses the same chunked loop as Expo's own `File.digest`, but has not been run: there is no Swift toolchain here.
- **ZIP:** read back byte for byte by Python's `zipfile` and `unzip`, normal and ZIP64; and once with a 4.06 GiB entry (`SAAKSHI_BIG_ZIP=1 npx jest zip-large`), which `unzip -t` accepts.
- **Signatures and chain:** tests seal files through the real pipeline with a P-256 key in Node, build bundles, and run `tools/verify-bundle.mjs` on them as a ZIP and as a folder. One signature is also checked with `openssl dgst -verify` as the spec describes. Changed media, a removed segment and an edited record are all caught.
- 93 tests pass (plus the 4 GiB ZIP test, which runs only on request); typecheck and lint pass.

**Not verified:**
- Nothing has run on a phone. Camera capture, segment hand-over, the Keystore and Secure Enclave keys, App Attest, the share sheet, SMS composer and PDF printing need testing on a real Android phone and iPhone. App Attest does not work in the simulator.
- **Native code** compiles (Android debug and iOS simulator builds pass in `.github/workflows/native-build.yml`, which runs on every pull request that touches native code), but none of it has run. This container can't build either platform.
- `tools/verify-bundle.mjs` does not check attestation chains (spec section 10, step 6). That is the next piece of tooling to write.

**NEEDS OWNER REVIEW:**
- **Certificate Part A text** (`src/modules/evidence/certificate/html.ts`): check every line against the Gazette of India text of the Schedule. It follows law.md section 1B, which was read from the Gazette of Puducherry reproduction, and item 3 was joined from fragments. The PDF prints "DRAFT: the text of this form has not yet been checked against the Gazette of India" until `FORM_TEXT_REVIEWED` is set to `true`.
- **Rights prompts** (`src/i18n/locales/{en,hi}/record.json` under `rights`, sources in `src/modules/evidence/rights/prompts.ts`): wording in English and Hindi. Sources: Art. 22(1); BNSS ss.36(a), 38, 47(1)–(2), 48; *Mihir Rajesh Shah* para 56; BNS ss.221, 262. All are rows marked VERIFIED (IK) in law.md, none checked against the Gazette yet.
- **Certificate screen help text** (`certificate.*` in `record.json`), in both languages.

**Next:**
- Owner and phone testing of R1 as above; fix what it finds.
- Attestation checking in `tools/verify-bundle.mjs` (Android chain to Google's roots; Apple App Attest object).
- **For Stream B:** expose trusted contacts from `@/modules/sos` (for example `getTrustedContacts(): Promise<{ name: string; phone: string }[]>`). The witness message will then fill in recipients; today the user picks them in the SMS app.
- **R2:** E3 OpenTimestamps (our own client against the public calendar servers; proofs in `timestamps/` as spec version 0.2) and E7 Google Drive with the `drive.file` scope.

**Start prompt** (paste into a new cloud session on this repository, model Opus, effort high):

> You are Stream A for Saakshi. Read CLAUDE.md, docs/SPEC.md, docs/BUILD_PLAN.md and docs/BUILD_HANDOFF.md, then work on branch `stream-a/foundation`.
>
> **First, the shell, as one pull request.**
> - Remove the Expo template's demo screens.
> - Set up Expo Router tabs: Record, SOS, Guides, Help, Settings.
> - Add i18next with English and Hindi resource files, a language switch in Settings, and the device language as default.
> - Add theming: light and dark, large touch targets, readable at arm's length.
> - Create the module folders under `src/modules/` with `index.ts` stubs.
> - Add a test runner (jest-expo).
> - Typecheck and lint must pass. Open the pull request and update the handoff, so Streams B, C and D can start.
>
> **Then the evidence pipeline** (spec section 4: E1, E2, E4, E5, E6):
> 1. Write `docs/spec/evidence-bundle.md` (v0.1) before code depends on it.
> 2. Camera capture for photo and video.
> 3. Streaming SHA-256 on close. Verify the chosen approach on a 1 GB file.
> 4. A signed record per file and segment, with the previous segment's hash chained in. Use hardware-backed keys with attestation (iOS App Attest and Secure Enclave; Android Keystore and Key Attestation) through a local Expo module.
> 5. The evidence locker and export bundle through the share sheet.
> 6. Witness SMS of the hash, time and place to chosen contacts.
> 7. BSA s.63 certificate Part A as a PDF with the hash report. Use the Schedule fields in docs/research/law.md section 1B; the text needs the owner's review.
> 8. Rights prompts overlaid while recording, never burned into the file.
>
> Read Tella's code (github.com/Horizontal-org/Tella-Android and Tella-iOS, MIT) for reference on capture and metadata. Its file hashing is in BaseVault.java and VaultFilesManager.swift.
>
> Keep each step a separate commit, and open a pull request when E1–E6 work. For R2 later: E3 (OpenTimestamps through its public calendar servers, written ourselves, not the LGPL clients) and E7 (Google Drive with the drive.file scope).

---

## Stream B: Safety and alerts

**Status:** waits on Stream A's shell.

**Start prompt** (model Opus, effort high):

> You are Stream B for Saakshi. Read CLAUDE.md, docs/SPEC.md (section 5), docs/BUILD_PLAN.md and docs/BUILD_HANDOFF.md. Branch `stream-b/sos` from the latest `main`, after Stream A's shell is merged.
>
> **For R1:**
> - S1: emergency contacts stored only on the phone, picked from the address book or typed in. SOS composes an SMS to all of them with a location link and the time; on iPhone the user taps Send. 112 is always one tap away.
> - S2: in the Android APK build only, SOS sends the SMS automatically through a local Expo module using SmsManager and SEND_SMS. Keep it behind a build-time flag so a Play build can drop the permission.
>
> **For R2:**
> - S4: a trigger that opens straight to a 3-digit code pad, sending on the third correct digit. iPhone: App Intents for the Action Button, Lock Screen and Control Center controls. Android: a home-screen widget and a notification action. Refuse codes matching emergency numbers.
> - S3: live location by link. A Supabase table with a share token, positions and expiry, row-level security, deletion when sharing stops, and a plain web viewer page. Ask the owner for the region before creating anything.
> - E8: bug mode. Segmented audio of 1–3 minutes, each segment hashed through Stream A's evidence module, with the hash sent and the segment uploaded through E7 when available. It must keep recording with the screen locked: iOS background audio with a Live Activity; Android a foreground service of type microphone.
> - Confiscation mode: one action that starts SOS, live location and bug mode together, plus separate controls for each.
>
> Note every platform limit you hit in the handoff. Test logic with unit tests. Open a pull request per release.

---

## Stream C: Content and Hindi

**Status:** R1 content (G3, G4, G5, O1) built and tested in code, on branch `claude/stream-c-content-0eav2f` (the session's assigned branch, in place of `stream-c/content`): https://github.com/AayushTainwala/Saakshi/pull/5. The law.md checks are partly done: a second pass on 20 Oct, after the network was widened, reached Indian Kanoon and nalsa.gov.in, but not the Gazette, India Code, sci.gov.in or 112.gov.in (see the end of `docs/research/law.md`).

**Done:**
- **G3 helplines** (`src/modules/helplines/`, list in `helplines/helplines.json`, format in `helplines/README.md`):
  - 112, 108, 102 and NALSA's 15100, each with official `gov.in`/`nic.in` sources and the date checked;
  - an empty `people` list for consenting lawyers and medics, with a strict schema (unknown fields, bad numbers, non-https sources and duplicate ids are rejected), and entries hidden after `listedUntil`;
  - the app ships with the bundled copy, fetches `https://raw.githubusercontent.com/AayushTainwala/Saakshi/main/helplines/helplines.json` when the Help tab opens, keeps whichever is newer by `updated`, ignores an invalid file, and saves the fetched one to `helplines.json` in the documents directory. CI's jest run checks the repository's file against the schema.
  - The Help tab lists each number with a Call button (`tel:`), its official sources, the lawyers and medics section (empty for now) and the list's date.
- **G4 chest mount, G5 phone safety, O1 if the network goes down** (`src/modules/guides/content/`): structured TS data, every text in English and Hindi (a missing language fails `tsc`). Guides tab lists them; `src/app/(tabs)/guides/[guide].tsx` shows one.
  - G4: body-cam mode first (start before mounting, Battery Saver / Low Power Mode, **unlock with volume-down twice**, pieces saved and signed, the iPhone and Android differences, battery and heat), then harness and clamp, lanyard (breakaway only), backpack strap clip, and three 3D models as links with their licences.
  - G5: passcode instead of face or fingerprint, with iPhone and Android settings; forcing passcode-only at the moment (iPhone side + volume for about 2 seconds, then Cancel, with a warning that holding longer calls emergency services; Android Lockdown); what to take and leave; setting up Saakshi in advance. Adapted from EFF SSD (CC BY 4.0), credited at the end of the guide and in `THIRD_PARTY_NOTICES.md`.
  - O1: meeting points, check-in times and an SMS plan for everyone; Briar for Android; no mesh app for iPhone, with the reason.
  - Sections can declare a feature they need: the confiscation-mode section is hidden until `AVAILABLE_FEATURES.confiscationMode` (in `src/modules/guides/content/index.ts`) is set to true. **For Stream B:** set it in the R2 pull request that adds confiscation mode.
  - DIY mounts carry `needsTesting` and show "Not yet tested by the Saakshi team" in the app until the flag is removed.
- **Hindi:** all new strings (`help`, `guides`) and guide content in everyday Hindi. Stream A's Hindi in `common`, `settings`, `sos` and `record` was read through and left as it is: it is already plain.
- **law.md, second pass (20 Oct):**
  - *R v. B* (Madras HC, 30.10.2024) read in full and added to section 1C: its Part B view is obiter;
  - BNS s.37 read verbatim, with a correction (see owner questions);
  - Telecom Suspension Rules 2024: notification date recorded from a Gauhati HC order;
  - a conflicting P&H HC statement on the commencement S.O.s recorded;
  - a review of High Court rulings on BSA s.63 on Indian Kanoon (`docs/research/hc-s63-review.md`; not exhaustive): none decides who may sign Part B, and they are split on late certificates;
  - NALSA's 15100 confirmed from NALSA's own pages.

  Still owed, because those sites can't be reached from here: the Schedule against the Gazette, the commencement and DPDP notifications, and the D.K. Basu and Arnesh paragraph numbers.
- 126 tests pass (33 new); typecheck and lint pass.

**Not verified:**
- **Official pages:** only NALSA's could be opened (15100 is `page-read`). 112, 108 and 102 still rest on search-engine extracts of official pages (`"how": "search-extract"`). The G5 phone steps and the EFF adaptation rest on search summaries and general knowledge, not on reading Apple's, Google's or EFF's pages: `ssd.eff.org`, `support.apple.com` and `support.google.com` are not reachable from here.
- Nothing has run on a phone. The `tel:` links, the fetch and the guide screens need checking on both platforms.
- The Printables model's licence (CC BY-ND) and the Thingiverse clamp's (CC BY-NC) come from mirror sites, as in the research doc.

**NEEDS OWNER REVIEW:**
- **Helplines** (`helplines/helplines.json`): the four numbers and their descriptions in both languages, including the medical ones (108: accidents, injuries and serious illness; 102: mainly pregnant women and young children). Open each source and change `how` to `page-read`. Sources are tabled at the end of `docs/research/law.md`.
- **Help tab wording** about listed lawyers and medics: "Saakshi does not arrange their help or answer for their work" (`help.json`, `people.intro`).
- **G4** (`chestMount.ts`): body-cam section against Stream A's build when it lands (button sequence, what the locked screen says, iPhone gaps); the lanyard strangulation warning; the heat note. **NEEDS TESTING:** harness and clamp, lanyard, backpack strap clip.
- **G5** (`digitalSafety.ts`): the iPhone and Android steps need trying on current phones (Samsung One UI 9 beta reportedly drops Lockdown from the power menu); the iPhone emergency-call warning; the what-to-take list (see the ID question above). Compare against the SSD text for the attribution.
- **O1** (`offline.ts`): the claims that Briar has been independently audited (Cure53 2017; Radically Open Security via OTF 2023–24, from the research doc) and has no iPhone app; the link goes to briarproject.org only, as its Play Store status was not confirmed.
- **law.md**: the leads in the check results are unverified and must not be relied on until the documents are opened.
- **`docs/research/hc-s63-review.md`**: drawn from Indian Kanoon text, not certified copies; several rows are short orders without reasons.

**Next:**
- Open the official pages (or allow their domains in the environment's network settings) and finish the seven law.md checks and the helpline `page-read` checks.
- Field-test the DIY mounts; remove `needsTesting` from each that passes and note it here.
- Research for "what police may ask of a phone", if the owner agrees (owner questions).
- v1.1: G1 know-your-rights cards and G2 physical safety.

**Start prompt** (model Opus, effort high):

> You are Stream C for Saakshi. Read CLAUDE.md, docs/SPEC.md (section 6) and docs/research/. Branch `stream-c/content` from the latest `main`, after Stream A's shell is merged.
>
> Write the R1 content as structured data (JSON or TS) under `src/modules/guides/content/` and `src/modules/helplines/`, in English and Hindi:
> - G3 helplines:
>   - 112, the ambulance numbers and NALSA's legal-aid helpline, each verified from an official government page and recorded with its source URL;
>   - an empty, schema-checked list for consenting lawyers and medics;
>   - loading from a remote JSON so the list updates without a release (host it in this repository's `helplines/` folder via the raw GitHub URL for now).
> - G4: the chest-mount guide (harness with clamp, a lanyard method, links to open 3D models with their licences, from docs/research/open-source-and-licences.md). Mark the DIY methods `NEEDS TESTING`.
> - G5: digital safety and preparedness. Turn off Face ID and fingerprint unlock before going out; force passcode-only at the moment (iPhone: hold side + volume for 2 seconds; Android: Lockdown). Also: what to leave at home, and setting up contacts and confiscation mode in advance. Adapt from EFF Surveillance Self-Defense (CC BY 4.0) with attribution.
> - O1: Briar for Android users. No mesh app for iPhone, because none is audited and available in India. Meeting points, check-in times and an SMS plan for everyone.
> - Hindi for every interface string in the i18n files. Use plain, everyday Hindi in Devanagari, not Sanskritised Hindi.
>
> Then do the checks owed at the end of docs/research/law.md, from official sources where reachable, recording each result there.
>
> Everything legal or medical is marked `NEEDS OWNER REVIEW` in the handoff. Open a pull request.

---

## Stream D: Release

**Status:** may start now on the pipeline and store text (see Order, step 2).

**Start prompt** (model Sonnet, effort high):

> You are Stream D for Saakshi. Read CLAUDE.md, docs/BUILD_PLAN.md and docs/research/distribution-and-accounts.md. Branch `stream-d/release` from the latest `main`, after Stream A's shell is merged.
>
> Build the release pipeline:
> - **eas.json** with profiles:
>   - `apk` (Android APK for GitHub Releases, SMS auto-send on);
>   - `play` (Android App Bundle, SMS auto-send off);
>   - `ios` (store build).
> - **GitHub Actions** using expo/expo-github-action and the `EXPO_TOKEN` secret:
>   - triggered manually and on `v*` tags;
>   - runs `eas build --non-interactive` for Android and iPhone, and `eas submit` to TestFlight;
>   - downloads the APK, computes its SHA-256 and signing-certificate fingerprint, and publishes a GitHub Release with both and plain install steps.
> - **Credentials**, from current EAS docs (don't rely on memory):
>   - how EAS gets the Android keystore and the iOS distribution certificate non-interactively;
>   - how the owner registers his App Store Connect API key with EAS without committing it.
>
>   Write the owner's one-time steps in the handoff in plain language. If one interactive command is unavoidable, say exactly which one and where to run it.
> - **Store text** in `store/`, in English and Hindi:
>   - listings, keywords, a privacy policy page (served from GitHub Pages);
>   - Apple's privacy label answers ("Data Not Collected" if true) and Play's Data safety answers;
>   - App Review notes explaining every permission, under the protect-yourself framing.
> - **Mirrors:** a plan for at least one host besides GitHub.
>
> Open a pull request.

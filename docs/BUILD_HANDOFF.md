# Build Handoff

The pickup file for build sessions. Each stream keeps its own section current: status, what was done, what's next, questions for the owner. Read [CLAUDE.md](../CLAUDE.md) first.

## Order

1. **Stream A** starts alone and merges the shell (navigation, i18n, theming, module layout) to `main`.
2. **Streams B, C and D** then start in parallel, each on its own branch from the updated `main`.
3. Each stream opens pull requests into `main`. The owner (or a review session) merges them.

## Owner questions

None yet. Streams add questions here as `- [ ] (Stream X) question`.

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

**Status:** shell done (pull request open from `stream-a/foundation`); evidence pipeline next.

**Done:**
- Shell: template demo screens and assets removed; Expo Router native tabs Record, SOS, Guides, Help, Settings; i18next with English and Hindi and a language switch; light and dark themes with a switch; module stubs for `evidence`, `sos`, `location`, `bugmode`, `cloud`, `guides`, `helplines`; jest-expo with tests for i18n completeness, language choice, preferences and colour contrast; Expo packages updated to SDK 58's expected patch versions.
- The SOS tab has a "Call 112" button only; the rest of SOS is Stream B's. The Hindi strings in the shell are Stream A's first pass for Stream C to review.

**Next:** evidence pipeline (below).

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

**Status:** waits on Stream A's shell (for the i18n files).

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

**Status:** waits on Stream A's shell.

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

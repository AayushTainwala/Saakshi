# Store text

Everything the App Store, TestFlight and Google Play ask for in writing, in English and Hindi, plus the privacy policy site. Nothing here ships inside the app. **All of it NEEDS OWNER REVIEW before it is submitted**, and the Hindi needs Stream C's review.

| File | What it is | Where it goes |
|---|---|---|
| `listing/en.json`, `listing/hi.json` | Name, subtitle, promotional text, keywords, description, What's New; Play title and short description | App Store Connect → the version → each localization; Play Console → Main store listing |
| `site/` | Privacy policy, English and Hindi, and a short home page | GitHub Pages, by `.github/workflows/pages.yml`: `https://aayushtainwala.github.io/Saakshi/privacy/` and `/privacy/hi/` |
| `apple/privacy-label.md` | App Privacy answers ("Data Not Collected") and why | App Store Connect → App Privacy |
| `apple/review-notes.md` | App Review notes explaining every permission | App Review Information → Notes, and TestFlight Review Notes |
| `apple/testflight.md` | Beta App Description, What to Test, public link | TestFlight → Test Information |
| `play/data-safety.md` | Data safety, permissions, other App content answers | Play Console → App content |

The App Store and Play descriptions are the same text: `appStore.description`, joined with line breaks.

## Framing

Every line follows CLAUDE.md. Saakshi protects the user and their rights. SOS alerts the user's own contacts and is never an emergency service (Guideline 5.1.5), with 112 always mentioned. Recording is personal record-keeping for the user and their lawyer, never reporting crimes (Guideline 1.7). The listings say nothing about protests.

## Legal statements in the store text

The only legal statement is about the certificate: section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 asks for a certificate in the form in its Schedule with an electronic record, Saakshi fills in Part A, and Part B must be signed by an expert.

- Source: BSA s.63(4)(a)–(c), in `docs/research/law.md` section 1A, from https://indiankanoon.org/doc/70224818/ and the PRS copy of the Act (gazette p.23).
- The listings don't say a recording is "admissible", "court-proof" or "tamper-proof". The law doesn't promise that, and the spec says nothing makes a recording unquestionable.

## Limits (checked by `store/__tests__/store.test.ts`)

Apple's limits are from App Store Connect Help, read 20 Oct 2026:
- name, at most 30 characters; subtitle, 30 characters: [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/);
- promotional text, 170 characters; description, 4000; keywords, 100 **bytes**; What's New, 4000: [Platform version information](https://developer.apple.com/help/app-store-connect/reference/platform-version-information/);
- App Review Notes, 4000 bytes: same page.

Hindi in Devanagari takes 3 bytes a letter, so the Hindi keyword field holds about 30 letters.

Google Play's limits are title 30, short description 80, full description 4000. They are from search summaries of Google's help pages, not read directly (support.google.com is unreachable from this session), so check them in the Console.

## Languages on the App Store

Apple's [App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations/) table lists Hindi as a localization. For India it gives **English (U.K.)** as the default language, and Hindi among the additional ones. So:
- set the app's primary language to **English (U.K.)**, using `listing/en.json`;
- add a **Hindi** localization from `listing/hi.json`.

Keep the keywords different between the two, because both may count for search in India. That is my reading of the table's purpose; Apple's page doesn't say how search uses the keywords.

## Not done yet

- Screenshots and the Play feature graphic. They need the built app on a phone.
- The owner's public contact email, for the privacy policy, TestFlight feedback and App Review contact. It's an owner question in docs/BUILD_HANDOFF.md.

# Google Play: Data safety and other App content answers

Where: Play Console → Saakshi → **Policy and programs → App content**. These answers are for the **Play build** (profile `play`: SMS auto-send off, no SEND_SMS permission). The GitHub APK is not on Play. Status: **NEEDS OWNER REVIEW**.

> **Not checked against Google's current wording.** This cloud session can't reach support.google.com or play.google.com. The answers follow from what the app does, but read each question as the Console words it today before answering. If a question doesn't fit the reasoning here, note it in docs/BUILD_HANDOFF.md.

## Data safety

| Question (as summarised) | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | Version 1.0 transmits no user data to us or to any third party. We run no server and have no analytics, ads or crash-reporting SDK. Recordings, location, contacts and certificate details stay in the app's storage on the phone. |
| Privacy policy URL | `https://aayushtainwala.github.io/Saakshi/privacy/` | It must be a public web page, not a PDF. |

Points to check against the Console's help text:

- **SMS through the Messages app.** The witness message and SOS open the user's SMS app through an Android intent, with the message filled in, and the user taps Send there. Saakshi itself transmits nothing. Check that Google's definition of "collection" ("transmitting data from your app off a user's device") doesn't treat this as collection. If it does, the exemption to look for is user-initiated sharing that the user reasonably expects.
- **Helpline list.** The app may download a public JSON file from raw.githubusercontent.com. It sends nothing about the user, and GitHub sees the IP address as with any web request. Check whether Google expects this to be declared. We do not think it is "collection by the app".
- **Answering "No"** skips the data-type and security-practice sections. If you answer Yes for any reason, the security questions ("data is encrypted in transit", "users can request deletion") must be answered truthfully for that data.

### When the answers change (R2)

- **Live location by link (S3):** declare **Location → Precise location**, collected, for **App functionality**, encrypted in transit; deleted when sharing ends.
- **Google Drive copies (E7):** decide with the E7 design whether this is collection (see `../apple/privacy-label.md`).
- **Background location** needs Google's separate permission declaration, video and in-app disclosure (docs/research/distribution-and-accounts.md, A.2 section 2).

## Permissions in the Play build

From the generated manifest (`npx expo prebuild`, 20 Oct 2026, with the `play` profile's flags):

| Permission | Used for |
|---|---|
| CAMERA | the evidence camera |
| RECORD_AUDIO | sound with videos |
| ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION | where a photo or video was taken, and the location in messages the user sends; foreground only |
| INTERNET | downloading the helpline list; nothing about the user is sent |
| VIBRATE | feedback |

`app.config.ts` removes SEND_SMS, READ_SMS, RECEIVE_SMS, SYSTEM_ALERT_WINDOW and the external-storage permissions from this build, and the release workflow checks the bundle for the SMS ones. **No restricted-permission declaration is needed** (SMS, call log, background location).

**To add when body-cam mode lands:** on Android it records with the screen off through a foreground service, so Play's **Foreground service** declaration will need the service types (camera, microphone) with a short video. Stream A should note the types in the handoff.

## Other App content declarations

| Declaration | Answer |
|---|---|
| App access | **All functionality is available without special access.** No login. |
| Ads | **No, my app does not contain ads.** |
| Content rating | Fill in the questionnaire truthfully. The app has no violence, sexual content, gambling or user-to-user chat. It does share the user's location, but only by SMS the user sends to their own contacts. Expect a low rating. |
| Target audience | **18 and over** is my recommendation, because the app is legal content and record-keeping for adults. This is the owner's decision (handoff owner questions). |
| News app | No. |
| COVID-19 contact tracing or status | No. |
| Government app | **No.** Saakshi is not made by or for a government. |
| Financial features | None. |
| Health | None. |
| Data safety | As above. |

## Store listing

Text in `../listing/en.json` (English (United Kingdom) or English (India)) and `../listing/hi.json` (Hindi, hi-IN):

- App name: `play.title`
- Short description: `play.shortDescription`
- Full description: `appStore.description` joined with line breaks (the same text as the App Store)

Graphics are needed but not made yet: an icon, a feature graphic and phone screenshots. The sizes here are from memory, not checked (Google's pages are unreachable from this session): icon 512 × 512, feature graphic 1024 × 500, at least two screenshots. Confirm them in the Console.

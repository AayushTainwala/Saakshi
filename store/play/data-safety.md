# Google Play: Data safety and other App content answers

Where: Play Console → Saakshi → **Policy and programs → App content**. These answers are for the **Play build** (profile `play`: SMS auto-send off, no SEND_SMS permission). The GitHub APK is not on Play. Status: **NEEDS OWNER REVIEW**.

> **Not checked against Google's current wording.** This cloud session can't reach support.google.com or play.google.com. The answers follow from what the app does, but read each question as the Console words it today before answering. If a question doesn't fit the reasoning here, note it in docs/BUILD_HANDOFF.md.

## Data safety

These answers are for builds with Stream B's R2 (merged 21 Oct), which adds live location by link (S3). While the user shares, positions go to our server (Supabase, Mumbai).

| Question (as summarised) | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Live location sends the phone's position to our server while the user shares it. |
| Is all collected data encrypted in transit? | **Yes** | The app reaches Supabase over HTTPS. |
| Do you provide a way for users to request that their data be deleted? | **Yes** | Stopping the share deletes it and all its positions at once; every share is deleted after 24 hours at most anyway. There is no account to delete. |
| Data types | **Location → Precise location** only | The app shares the GPS fix. |
| Precise location: collected or shared? | **Collected.** Not shared. | Supabase runs the server on our behalf. The search summaries say Google doesn't count a service provider acting for you as "sharing", but that wasn't read from Google's page, so check it. The people the user sends the link to see it because the user chose to send it. |
| Is it processed ephemerally? | **No** | It is kept for the length of the share, up to 24 hours. |
| Is collection required, or can users choose? | **Users can choose** | Live location runs only when the user turns it on; every other feature works without it. |
| Why is it collected? | **App functionality** | So that the user's chosen contacts can see where they are. |
| Privacy policy URL | `https://aayushtainwala.github.io/Saakshi/privacy/` | It must be a public web page, not a PDF. |

Everything else stays undeclared:
- **Recordings** (photos, video, sound and bug-mode pieces), **contacts** and **certificate details** stay in the app's storage on the phone.
- The **Play build sends no SMS by itself**: the witness message and SOS open the user's SMS app through an Android intent, and the user taps Send there.

Points to check against the Console's help text:

- **SMS through the Messages app.** Saakshi itself transmits nothing. Check that Google's definition of "collection" ("transmitting data from your app off a user's device") doesn't treat this as collection. If it does, the exemption to look for is user-initiated sharing that the user reasonably expects.
- **Helpline list.** The app may download a public JSON file from raw.githubusercontent.com. It sends nothing about the user, and GitHub sees the IP address as with any web request. Check whether Google expects this to be declared. We do not think it is "collection by the app".
- **Supabase's logs** may keep the phone's IP address for their own retention period, which hasn't been checked. If Google counts such logs, IP address may need to be declared under device identifiers.

### When the answers change again

- **Google Drive copies (E7):** decide with the E7 design whether this is collection (see `../apple/privacy-label.md`).
- **Background location:** live location uses "while using" permission with a location foreground service, so there is no ACCESS_BACKGROUND_LOCATION (Stream B's handoff). If that ever changes, Google needs a separate permission declaration, a video and an in-app disclosure (docs/research/distribution-and-accounts.md, A.2 section 2).

## Permissions in the Play build

From the generated manifest (`npx expo prebuild`, 21 Oct 2026, after R2, with the `play` profile's flags) and the manifests of the libraries and local modules merged into it:

| Permission | Used for |
|---|---|
| CAMERA | the evidence camera and body-cam mode |
| RECORD_AUDIO, MODIFY_AUDIO_SETTINGS | sound with videos, body-cam's sound and bug mode (MODIFY_AUDIO_SETTINGS comes from expo-audio) |
| ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION | where a recording was made, the location in messages the user sends, and live location; "while using" only |
| FOREGROUND_SERVICE, FOREGROUND_SERVICE_CAMERA, FOREGROUND_SERVICE_MICROPHONE, FOREGROUND_SERVICE_LOCATION, WAKE_LOCK | body-cam mode (camera and microphone), bug mode (microphone) and live location (location) keep running with the screen locked |
| POST_NOTIFICATIONS | the ongoing notices of body-cam mode, bug mode and live location, and the optional "Open code pad" notice (Android 13+) |
| RECEIVE_BOOT_COMPLETED | puts the optional "Open code pad" notice back after the phone restarts |
| INTERNET | live location, and downloading the helpline list |

`app.config.ts` removes SEND_SMS, READ_SMS, RECEIVE_SMS, SYSTEM_ALERT_WINDOW, VIBRATE and the external-storage permissions from this build, and the release workflow checks the bundle for the SMS ones. **No restricted-permission declaration is needed** (SMS, call log, background location).

**Foreground service declaration: needed**, for three types:
- **camera** and **microphone**, for body-cam mode;
- **microphone**, for bug mode;
- **location**, for live location.

Suggested descriptions:
- **Body-cam mode:** "The user starts it, and it records video and sound for the user's own records while the screen is dark and locked. It shows an ongoing notice with a Stop button, and ends when the user stops it."
- **Bug mode:** "The user starts it, and it records sound in short pieces for the user's own records with the screen locked, until the user stops it. It shows an ongoing notice."
- **Live location:** "The user starts it for a chosen time, up to 24 hours, so that contacts they chose can follow their location by a link. It shows an ongoing notice, and stops at the end of that time or when the user stops it."

Play asks for a short video of each feature; record them on a test phone. Google's exact form couldn't be read from this session.

## Other App content declarations

| Declaration | Answer |
|---|---|
| App access | **All functionality is available without special access.** No login. |
| Ads | **No, my app does not contain ads.** |
| Content rating | Fill in the questionnaire truthfully. The app has no violence, sexual content, gambling or user-to-user chat. It does share the user's location, but only by SMS the user sends to their own contacts. Expect a low rating. |
| Target audience | **18 and over** (owner's decision, 21 Oct). |
| News app | No. |
| COVID-19 contact tracing or status | No. |
| Government app | **No.** Saakshi is not made by or for a government. |
| Financial features | None. |
| Health | None. |
| Data safety | As above. |

## App signing

The owner's decision of 21 Oct: Play signs with **our EAS keystore**, not a key Google makes. The Play copy and the GitHub APK then share one signature, so a user can move between them without uninstalling, and without losing the recordings kept in the app.
- At the first upload, when the Console asks about the app signing key, choose to use your own key, and follow Google's export steps with the keystore downloaded from EAS (docs/BUILD_HANDOFF.md, Stream D, step 4).
- Google's export steps couldn't be read from this session, so follow the Console's own instructions.

## Developer contact

Public developer email: `tainwala.aayush@gmail.com`.

## Store listing

Text in `../listing/en.json` (English (United Kingdom) or English (India)) and `../listing/hi.json` (Hindi, hi-IN):

- App name: `play.title`
- Short description: `play.shortDescription`
- Full description: `appStore.description` joined with line breaks (the same text as the App Store)

Graphics are needed but not made yet: an icon, a feature graphic and phone screenshots. The sizes here are from memory, not checked (Google's pages are unreachable from this session): icon 512 × 512, feature graphic 1024 × 500, at least two screenshots. Confirm them in the Console.

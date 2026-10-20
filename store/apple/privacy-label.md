# App Store privacy label ("App Privacy")

Where: App Store Connect → Saakshi → App Privacy. Status: **NEEDS OWNER REVIEW** before you publish it.

## Answers for version 1.0

| Question | Answer |
|---|---|
| Privacy Policy URL | `https://aayushtainwala.github.io/Saakshi/privacy/` |
| Privacy Choices URL (optional) | leave empty |
| Do you or your third-party partners collect data from this app? | **No, we do not collect data from this app** |

After **No**, App Store Connect asks nothing more. Click **Save**, then **Publish**. The label then reads **Data Not Collected**.

## Why "Data Not Collected" is true for 1.0

All quotes are from Apple's [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) page, read on 20 Oct 2026.

- **What "collect" means.** Apple's definition: "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time." Saakshi 1.0 sends nothing to us: we run no server, and it has no SDK of any third-party partner. Apple defines those partners as "analytics tools, advertising networks, third-party SDKs, or other external vendors whose code you've added to your app".
- **Recordings, location, contacts and certificate details stay on the phone.** Apple: "Data that is processed only on device is not 'collected' and does not need to be disclosed in your answers."
- **SMS and the share sheet.** When the user taps Send in Messages, or picks a destination in the share sheet, the data goes where the user sends it, and neither we nor any partner can access it. Apple's page doesn't address the composer or the share sheet directly. Its closest example is payments: "If your app uses a payment service, the payment information is entered outside your app, and you as the developer never have access to the payment information, it is not collected". Guideline 5.1.1(iii) recommends this design: "Where possible, use the out-of-process picker or a share sheet".
- **App Attest (iPhone).** The app asks Apple's App Attest service to certify its key. Apple: "You are not responsible for disclosing data collected by Apple."
- **Helpline list from GitHub.** This is a plain download of a public file, and nothing about the user is sent with it. GitHub sees the IP address, as with any web request. We have no access to it, and GitHub is not code added to the app. Apple: "if an authentication token or IP address is sent on a server call and not retained … you do not need to disclose this".

## When the answer changes

Re-answer before each of these ships (R2 in docs/BUILD_PLAN.md):

- **Live location by link (S3).** Positions go to our Supabase server while sharing is on. Declare **Location → Precise Location**, used for **App Functionality**. Whether it counts as "linked to the user" depends on the design (no account, a random share token). Decide it with Stream B's design.
- **Copies to Google Drive (E7).** Files go to the user's own Google account. Whether this counts as collection by a third-party partner depends on whether a Google SDK is added (a partner's code) or Drive's web API is called directly. Settle it when E7 is designed.
- **Any crash reporting or analytics.** None is allowed (CLAUDE.md).

The privacy policy (`store/site/privacy/`) must change at the same time.

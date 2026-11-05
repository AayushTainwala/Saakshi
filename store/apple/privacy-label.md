# App Store privacy label ("App Privacy")

Where: App Store Connect → Saakshi → App Privacy. Status: **NEEDS OWNER REVIEW** before you publish it.

## Answers for builds with live location (from 21 Oct)

Stream B's R2, merged on 21 Oct, adds live location by link (S3). While the user shares, the app sends the phone's position to our server. So the label is no longer "Data Not Collected".

| Question | Answer |
|---|---|
| Privacy Policy URL | `https://aayushtainwala.github.io/Saakshi/privacy/` |
| Privacy Choices URL (optional) | leave empty |
| Do you or your third-party partners collect data from this app? | **Yes, we collect data from this app** |
| Data types | **Location → Precise Location**, and nothing else |
| Precise Location: how is it used? | **App Functionality** only |
| Is it linked to the user's identity? | **No** |
| Is it used for tracking? | **No** |

The label will then read **Data Not Linked to You: Location**.

### Why

All quotes are from Apple's [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) page, read on 20 Oct 2026.

- **Live location is collected.** Apple's definition: "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time."
  - Positions are kept on our server for the length of the share, up to 24 hours, so that contacts can follow them.
  - Live location is a main feature and runs for as long as the user shares. So it doesn't meet Apple's optional-disclosure criteria: "Collection of the data occurs only in infrequent cases that are not part of your app's primary functionality", and "data collected on an ongoing basis after an initial request for permission must be disclosed".
- **Precise, not coarse.** The app shares the GPS fix, and Apple counts location of three or more decimal places as precise (docs/research/distribution-and-accounts.md, B.2 step 6).
- **App Functionality.** Positions are used only so the user's chosen contacts can see where they are.
- **Not linked to the user's identity.** There is no account, no name and no device identifier. A share is a random code, and the server keeps a hash of a secret only the phone knows (Stream B's handoff, S3).
  - **One point to check.** Supabase's request logs may keep the phone's IP address for their own retention period, which Stream B hasn't checked. Apple says an IP address need not be disclosed "if an authentication token or IP address is sent on a server call and not retained". If Supabase keeps it, check against Apple's definition of "linked to the user" before answering. That definition wasn't read for this note.
- **Not tracking.** It isn't combined with other companies' data, used for advertising, or given to a data broker.

### Everything else stays undeclared

- **Recordings (photos, video, sound, bug-mode pieces), contacts and certificate details** stay on the phone. Apple: "Data that is processed only on device is not 'collected' and does not need to be disclosed in your answers."
- **SMS and the share sheet.** When the user taps Send in Messages, or picks a destination in the share sheet, the data goes where the user sends it, and neither we nor any partner can access it.
  - Apple's page doesn't address the composer or the share sheet directly. Its closest example is payments: "If your app uses a payment service, the payment information is entered outside your app, and you as the developer never have access to the payment information, it is not collected".
  - Guideline 5.1.1(iii) recommends this design: "Where possible, use the out-of-process picker or a share sheet".
- **App Attest (iPhone).** The app asks Apple's App Attest service to certify its key. Apple: "You are not responsible for disclosing data collected by Apple."
- **Helpline list from GitHub.** This is a plain download of a public file, and nothing about the user is sent with it. GitHub sees the IP address, as with any web request. We have no access to it, and GitHub is not code added to the app.
- **Backups.** The app excludes its files from iCloud device backup until the user chooses a destination (owner's decision, 20 Oct). A copy the user makes to their own iCloud is held by Apple for them. Apple: "You are not responsible for disclosing data collected by Apple."

## When the answer changes again

- **Copies to Google Drive (E7).** Files go to the user's own Google account. Whether this counts as collection by a third-party partner depends on how E7 is built:
  - adding a Google SDK puts a partner's code in the app;
  - calling Drive's web API directly does not.

  Settle it when E7 is designed.
- **Any crash reporting or analytics.** None is allowed (CLAUDE.md).

The privacy policy (`store/site/privacy/`) must change at the same time.

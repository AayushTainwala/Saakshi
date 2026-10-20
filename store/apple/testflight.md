# TestFlight test information

Where: App Store Connect → Saakshi → TestFlight → **Test Information**. It's needed before the first build goes to an external group for Beta App Review. Status: **NEEDS OWNER REVIEW**.

## Beta App Description

```text
Saakshi helps you protect yourself and your rights in India. Record photos and video for your own records, fingerprinted and signed on your phone; send a witness message; prepare Part A of your section 63 certificate; and alert your trusted contacts. In English and Hindi. Saakshi is not an emergency service: in an emergency, call 112.
```

## Feedback email

The owner's public developer email. (Owner question in docs/BUILD_HANDOFF.md.)

## Marketing URL and Privacy Policy URL

- Marketing: `https://aayushtainwala.github.io/Saakshi/`
- Privacy policy: `https://aayushtainwala.github.io/Saakshi/privacy/`

## Review Notes (Beta App Review)

Use the main block from `review-notes.md`, plus any optional blocks that apply.

## What to Test (per build)

The release workflow fills it in as "Saakshi <version> (<commit>)". For an external group, replace it in App Store Connect with what changed, for example:

```text
First beta. Please try: recording a photo and a video, checking the files, sending the witness message, making the certificate, exporting the bundle, and adding a trusted contact. Tell us what was confusing.
```

## Public link

After Beta App Review approves the build: TestFlight → the external group → **Create Public Link** → open to anyone, with a tester limit up to 10,000. Then set the repository variable `TESTFLIGHT_PUBLIC_LINK` to that link (GitHub → Settings → Secrets and variables → Actions → Variables), and the next GitHub Release will include it.

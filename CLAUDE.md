# Saakshi — instructions for Claude

Saakshi ("witness") is a free, open-source (MIT) iPhone and Android app that helps people in India protect themselves and their rights. It records evidence fit for court under BSA s.63, alerts the user's own contacts with their location, protects them when their phone is taken, and teaches what to do, in English and Hindi. The owner, Aayush Tainwala, is an advocate at the Bombay High Court, and the app is published under his name.

## Read first, every session

1. `docs/BUILD_HANDOFF.md`: your stream's status and next steps. Update it before you finish.
2. `docs/SPEC.md`: every product decision. Don't change scope without the owner; raise questions in the handoff.
3. `docs/BUILD_PLAN.md`: releases, architecture, streams.
4. `AGENTS.md`: Expo's own rules for this codebase (use versioned Expo docs, `npx expo install`, never hand-edit `ios/` or `android/`).

## Rules

- **Framing: protect yourself and your rights.** This is not a protest app. Every screen and string presents a feature as self-preservation and protection of rights under Indian law. Never word SOS as an emergency service (Apple guideline 5.1.5): it alerts the user's trusted contacts, and 112 is always one tap away. Never word evidence capture as reporting crimes (guideline 1.7): it is personal record-keeping for the user and their lawyer.
- **Law.** Legal content comes only from statutes and judgments, with the exact section or paragraph and a link, taken from `docs/research/law.md` or verified the same way and added there. Never state a right the law doesn't give. Anything legal that ships needs the owner's review; mark it `NEEDS OWNER REVIEW` in the handoff.
- **Self-protection only.** No content or feature that helps anyone attack, injure or obstruct.
- **Privacy.**
  - Nothing of the user's (recordings, contacts, location) leaves the phone unless the user turns on the feature that sends it.
  - No analytics, ads, crash reporting or tracking SDKs.
  - Request only the permissions a feature needs.
  - Never request READ_SMS, RECEIVE_SMS, notification-listener or accessibility-service permissions: Play Protect in India blocks sideloaded apps that do.
- **Evidence integrity.** Never modify an original recording. Hash it as it closes, sign the record, and keep the evidence-bundle format in `docs/spec/evidence-bundle.md` exact and versioned.
- **Languages.** Every user-facing string goes through i18n, in English and Hindi. No hard-coded strings in components.
- **Modules.** Each feature lives in `src/modules/<name>/` behind an `index.ts`. No module imports another module's internals.
- **Licences.** Our code is MIT. Before adding a dependency, check its licence; GPL, AGPL and LGPL are not allowed in the app. Code copied from Tella (MIT) keeps Horizontal's notice in `THIRD_PARTY_NOTICES.md`.
- **Secrets.** Never commit tokens, keys, keystores or `.p8` files. Secrets live in GitHub Actions secrets or EAS.
- **Done means:** `npx tsc --noEmit` and `npx eslint .` pass, tests for logic you added pass, the handoff is updated, and a pull request is open with a plain description.

## Commands

```bash
npm ci                    # install
npx expo install <pkg>    # add a dependency (SDK-matched versions)
npx tsc --noEmit          # typecheck
npx eslint .              # lint
npx expo-doctor           # config and dependency check
```

Builds run on EAS through GitHub Actions (`.github/workflows/`), not in cloud sessions.

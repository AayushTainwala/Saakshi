# Mirrors: hosts besides GitHub

SPEC section 2 requires that every release is published, with its SHA-256 checksum and signing fingerprint, **on more than one host**. The reason is in docs/research/distribution-and-accounts.md, section 0: in 2026 GitHub was ordered to take down repositories of a similar app, and stores removed it in India. A mirror only helps if it is set up **before** anything is blocked, and if users can tell a genuine copy from a fake one wherever they find it.

## What makes any copy trustworthy

The signing certificate fingerprint, not the host. Every release has the same certificate SHA-256, published in the GitHub Release notes, in `SIGNING-CERTIFICATE.txt` beside the APK, and on every mirror. Android refuses to update an installed Saakshi with an APK signed by anyone else. So a copy passed around on WhatsApp or Telegram is safe to install if its fingerprints match, and harmless if they don't, because it won't install over the real app.

**Lose the keystore and this guarantee is gone.** Back it up (docs/BUILD_HANDOFF.md, Stream D, step 4).

## Plan

| # | Host | What it holds | How it's updated | Status |
|---|---|---|---|---|
| 1 | **GitHub Releases** | APK, `SHA256SUMS`, `SIGNING-CERTIFICATE.txt`, notes | `release.yml`, on every `v*` tag | Built |
| 2 | **Codeberg** (codeberg.org) | A copy of the code (`main` and each release tag), and the same release files and notes | `release.yml`, job `codeberg`, after each GitHub Release | Built, **switched off until the owner sets it up** (below); not yet run |
| 3 | **Internet Archive** (archive.org) | One item per release with the APK and checksum files | By hand for now (below) | Plan |
| 4 | **Telegram channel or WhatsApp channel** run by the owner | The APK file and the fingerprints as a pinned post | By hand | Plan |
| 5 | **IzzyOnDroid** (an F-Droid-format repository) | Pulls the APK from GitHub or Codeberg releases, so F-Droid and Neo Store users get updates | IzzyOnDroid's own bot | Blocked by size (below) |

### 2. Codeberg (first mirror)

Why Codeberg is first:
- It is a second, independent Git host with releases, so code and APKs survive together.
- Its release API is the same shape as GitHub's, so the workflow can publish to it automatically.
- IzzyOnDroid can pull from it (its Inclusion Policy names "Gitea/Forgejo tagged releases (e.g. at Codeberg)": https://gitlab.com/IzzyOnDroid/repo/-/wikis/Inclusion-Policy).

**Not verified from here.** This cloud session can't reach codeberg.org.
- The API calls in `release.yml` come from the Gitea source (Forgejo is a fork of Gitea): create a release with `POST /api/v1/repos/{owner}/{repo}/releases`; upload a file with `POST …/releases/{id}/assets?name=…` and the form field `attachment`; authenticate with `Authorization: token …`. Check them against https://codeberg.org/api/swagger before the first run.
- Also check Codeberg's Terms of Use (https://codeberg.org/Codeberg/org/src/branch/main/TermsOfUse.md) for limits on release attachments. The APK may be 50–100 MB.

The owner's one-time setup:
1. Make an account at codeberg.org. Create an **empty** repository named `Saakshi`, with no README.
2. User settings → Applications → **Generate new token** (the Gitea/Forgejo menu, not checked on Codeberg), with repository read and write access (the scope is `write:repository` in Gitea's terms). Copy it.
3. On GitHub, open Saakshi → Settings → Secrets and variables → Actions:
   - **Secrets** → New repository secret `CODEBERG_TOKEN`, holding the token;
   - **Variables** → New repository variable `CODEBERG_REPO`, holding `your-codeberg-name/Saakshi`.
4. From the next tagged release, the job pushes `main` and the tag to Codeberg, creates the release with the same notes, and uploads the APK, `SHA256SUMS` and `SIGNING-CERTIFICATE.txt`. Its link is added to the GitHub Release notes. If the job fails, the GitHub Release is unaffected; fix the cause and re-run that job.

### 3. Internet Archive

Archive.org items are hard to remove and get no attention from app stores. Upload by hand after each release:
1. Make an account at archive.org.
2. Go to archive.org → Upload. Make one item per release, for example `saakshi-1.0.0`, with:
   - the APK, `SHA256SUMS` and `SIGNING-CERTIFICATE.txt`;
   - the release notes as the description;
   - the licence MIT.

The official command-line uploader (`internetarchive`, `ia upload`) is **AGPL-3.0**. CLAUDE.md bars AGPL code from the app. A CI tool isn't part of the app, but I haven't automated it without the owner's say. IA's plain S3-style HTTP API could be called with `curl` instead. Its docs (https://archive.org/developers/) were unreachable from this session, so that is left for a later session.

### 4. Messaging channels

A broadcast channel the owner controls (Telegram or WhatsApp) reaches people where they already are, and forwarded files keep working when websites are blocked.
- Post each APK with the fingerprints, and pin the post.
- Tell users to check the certificate fingerprint before installing a forwarded copy.

### 5. IzzyOnDroid (blocked for now)

Its Inclusion Policy says: "IzzyOnDroid usually reserves up to 30 megabytes per app … That's at the same time the upper size limit for single .apk files."
- An Expo APK for all processor types is likely larger than that. The size is unknown until the first build.
- If it is too big, there are two ways forward:
  - build per-ABI APKs (an arm64-v8a APK is much smaller), which needs a change to the `apk` profile and a second fingerprinted file per release;
  - ask IzzyOnDroid for an exception.
- Its policy also requires no tracking components ("no ATS elements at all" for privacy apps). Saakshi meets that.

F-Droid's main repository is a longer route. It builds from source with its own key unless builds are reproducible, so its APK wouldn't match our fingerprint. It is left for after R1 (docs/research/distribution-and-accounts.md, A.2 section 3).

## Own domain (later)

A domain of the owner's (on a host other than GitHub, such as Cloudflare Pages or Netlify) can carry the install page and fingerprints, and link to every mirror. It can be blocked at ISP level like any site, but it is one more path. The privacy policy can move there too, as long as the store listings are updated with the new URL.

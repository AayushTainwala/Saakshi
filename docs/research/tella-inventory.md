---
title: "Protestor Assist Research — Tella Inventory"
type: research
project: "[[Protestor Assist — Hub]]"
hub: "[[Protestor Assist Research — Hub]]"
created: 2026-10-17
updated: 2026-10-17
tags: [protestor-assist, research]
---

> What Tella (Horizontal, MIT) already does on Android and iOS, read from its code: features, architecture, dependencies and their licences, build route, rebranding, and the effort to add our India pieces.

# Tella (Horizontal) fork: inventory and build-feasibility assessment

Prepared 17 Oct 2026. Sources: shallow clones of `Horizontal-org/Tella-Android` (HEAD 58997a7, 7 Oct 2026, v3.4.0 / versionCode 258) and `Horizontal-org/Tella-iOS` (HEAD e530b33, 14 Sep 2026, MARKETING_VERSION 3.3.0 on `develop`; latest tagged GitHub release is 3.1.0), cloned to `/tmp/claude-0/-home-claude/aa0cfdb8-a2bf-544e-9c28-f4e7196f812c/scratchpad/tella/{android,ios}`. Also used: tella.app (tella-app.org now redirects there) feature and translation pages, GitHub release pages, GitHub Actions billing and runner docs, and the dependency repos' LICENSE files. No build scripts or Gradle wrappers were run.

Both repos have an MIT `LICENSE` (© 2025 Horizontal). Android also ships a `NOTICE.txt` covering third-party licences (SQLCipher, CacheWord, Glide and others), which a fork must keep.

---

## 0. Headline findings

1. **The vault already computes SHA-256 for every file on both platforms.** Android computes it while encrypting, in `tella-vault/.../BaseVault.java` (DigestOutputStream, `vaultFile.hash`). iOS computes it on import, in `Data/VaultManager/VaultFilesManager.swift` → `URL.sha256Hash()` (CryptoKit). **Neither platform signs anything.** The `CertificateGenerator` files on both platforms create self-signed TLS certificates for Nearby Sharing (mTLS). They do not produce evidence certificates.
2. **Neither platform records audio reliably with the screen locked or the app in the background.** Android has no foreground service (no `<service>` entries at all in the manifest). iOS has `UIBackgroundModes = [fetch, processing]` and no `audio` mode. "Bug mode" is therefore new work on both platforms, not a tweak.
3. **Licences:** two GPLv3 components sit in the Nextcloud integrations. Android uses `com.github.nextcloud-deps.hwsecurity:hwsecurity-fido/fido2` (GPLv3, or a commercial licence from Confidential Technologies GmbH). iOS uses **NextcloudKit** via SPM (GPLv3 with an App Store exception). Shipping either one makes the binary GPLv3. **Recommendation: delete the Nextcloud connection on both platforms.** Android also uses mapsforge (LGPL-3.0 with §4(d)/(e) relinking obligations waived), which is acceptable with a notice, or can be removed with the map picker.
4. **Proprietary and Google SDKs:** Android already has a clean `fdroid` product flavour (`org.hzontal.tellaFOSS`) that excludes Firebase Crashlytics, Play Services, Google Drive and Dropbox. **Fork from that flavour.** iOS has no FOSS variant: GoogleSignIn, GoogleAPIClientForREST/Drive and SwiftyDropbox are hard dependencies in the Podfile and must be removed by hand.
5. **Telemetry:** Android has opt-in Divvi Up (DAP, privacy-preserving aggregate) analytics (`org.divviup.android`, MPL-2.0; `util/divviup/DivviupUtils.kt`, `views/activity/analytics/*`), and Crashlytics in the playstore flavour only. Both platforms send user-initiated feedback to `https://api.feedback.tella-app.org`. iOS has no analytics SDK. Remove all of these in the fork.
6. **Hindi is absent on both platforms.** Translations are managed in Weblate (moved there in Aug 2026). Indian languages already present: Android has bn, kn, ml, ta, lus (Mizo); iOS has bn, ml, ta, lus.
7. **This container cannot build Android.** The egress proxy refuses Maven Central, Google Maven, dl.google.com and jitpack.io, and no Android SDK is installed. Build in GitHub Actions instead (Horizontal already ships `.github/workflows/build-fdroid-apk.yml` on ubuntu-22.04).
8. **iOS needs a git-ignored file before it compiles:** `TellaConfig.xcconfig` is referenced in the pbxproj but is not in the repo. It supplies `GOOGLE_REVERSE_CLIENT_ID` and `DROPBOX_APP_KEY`. Horizontal's team IDs (`6ZG9T42688`, `2RXQS7CK9P`) are hardcoded in the project. There is no fastlane or CI for iOS in the repo.

---

## 1. Feature inventory

### 1A. Android (`Tella-Android`)

| Feature | Present? | Evidence / notes |
|---|---|---|
| Camera (photo + video) | Yes | CameraX 1.4.2. `mobile/.../views/activity/camera/CameraActivity.kt` |
| Audio recorder | Yes | `mobile/.../media/AudioRecorder.java` (AudioRecord + MediaCodec AAC at 44.1 kHz on a single-thread executor), UI in `views/fragment/recorder/MicFragment.kt` / `MicActivity.kt`. Supports pause and resume. |
| Records with screen locked / backgrounded? | **No (not reliable)** | The manifest declares no `<service>` and no `FOREGROUND_SERVICE_MICROPHONE`. On Android 9+ the OS silences the mic for background apps, and Android 11+ requires a microphone foreground service. The recorder thread survives `onStop`, but the captured audio will be silent or the recording killed. Docs only say Tella "won't lock while camera or recorder is open". |
| Verification mode / metadata | Yes (opt-in) | `tella-vault/.../Metadata.java` fields: cells (cell tower IDs), wifis (SSIDs), timestamp, ambientTemperature, light (sensors), location (lat/lon/alt/accuracy/provider/speed), IPv4/IPv6, network type, manufacturer, hardware, screen size, wifiMac, deviceID, locale, language, fileHashSHA256. Collection code is in `util/TelephonyUtils.java`, `views/activity/MetadataActivity.java` and `CameraActivity.kt`. v3.4.0 added CSV export and a "File created" field, and moved Device ID to ANDROID_ID. Docs note that enabling it **turns off background encryption**. |
| File hash | Yes, SHA-256 on every vault write | `BaseVault.java` L105–131, L247–255: plaintext SHA-256 computed while streaming into the cipher and stored in `vaultFile.hash` (SQLCipher DB). Shown to users only in Verification mode and Nearby Sharing (`data/peertopeer/PeerFileHash.kt`). |
| Signing of evidence | **No** | Only TLS certificate generation for P2P (`certificate/CertificateGenerator.kt`). BouncyCastle `bcprov`/`bcpkix-jdk18on:1.78` is already a dependency (`tella-keys`), which is useful for manifest signing. |
| Encrypted vault | Yes | Files: **AES-256/CTR/NoPadding** (`tella-vault/.../CipherStreamUtils.java`). There is **no authentication tag**, so the ciphertext is malleable and integrity rests on the stored hash. Main key: random AES-256 (`tella-keys/.../MainKey.java`), wrapped by PBKDF2 + AES-GCM (`PBEKeyWrapper.java`) or by the Android Keystore (`AndroidKeyStoreWrapper.java`). Metadata DB: SQLCipher 4.6.1 (`net.zetetic:sqlcipher-android`). Passphrase caching: Guardian Project CacheWord. |
| Lock | Pattern, PIN, password, device credentials/biometric | `UnlockRegistry.Method {TELLA_PATTERN, TELLA_PIN, TELLA_PASSWORD, DEVICE_CREDENTIALS}`. Biometric goes through `androidx.biometric` in `tella-locking-ui/.../DeviceCredentialsUnlockActivity.java`. Also: lock timeout (`util/LockTimeoutManager.java`), delete after N failed unlocks, FLAG_SECURE "screen security". |
| Camouflage | Yes | 30+ `<activity-alias>` launchers in `mobile/src/main/AndroidManifest.xml` (calculator, weather, clock, camera, game and other skins, under `res/values/*_background.xml`), plus a working calculator front-end (`views/settings/SettingsCalculatorActivity`). |
| Quick delete / panic | Yes | Settings → Security (`views/settings/SecuritySettings.kt`): delete vault files, forms, server settings, and optionally uninstall Tella (`REQUEST_DELETE_PACKAGES`). Executed by `HomeVaultViewModel.executePanicMode()`, triggered from the home-screen slider (`PanicModeViewHolder.kt`). |
| Connections | Tella Web (Reports), Uwazi, ODK (OpenRosa/JavaRosa), Google Drive*, Dropbox*, Nextcloud, Nearby Sharing (P2P) | `data/reports`, `data/uwazi`, `data/openrosa` + `javarosa/` + `odk/`, `data/googledrive`, `data/dropbox` (*playstore flavour only; `src/fdroid/` holds stubs), `data/nextcloud`, `data/peertopeer` (Ktor 3.3 + Netty embedded HTTPS server with mTLS and rate limiting). |
| Background / resumable upload | Yes | WorkManager (`util/jobs/WorkerUploadReport.kt`, `EncryptionWorker.kt`). Tella Web "V2" uses adaptive **chunked upload with offsets** (`data/reports/repository/ReportsRepositoryImp.kt` ~L410, `ChunkingConfig`). A `data/upload/TUSClient.java` (TUS) client is also present. |
| Forms | Yes | ODK XForms through JavaRosa 2.6.0 (`views/collect/`, `CollectFormEntryActivity`), Uwazi entity templates, and Tella Web report templates. |
| Reports | Yes | Tella Web, Google Drive, Dropbox and Nextcloud report flows share `views/fragment/main_connexions/base/*`. |
| Resources | Yes | Tella Web "resources" (PDFs downloaded from the server; `data/resources`), rendered by the in-house `pdfviewer` module. |
| i18n | Android `res/values-*/strings.xml` (1,089 strings in en `strings.xml` plus `lock_strings.xml` and `vault_strings.xml`) | Locales: ar, az, be, bn, ckb, es, fa-IR, fr, in (id), kac, kn, ksw, lus, ml, my, pt, pt-MZ, ru, sn-ZW, ta, ts, uk, vi, zh-CN. **No Hindi (`values-hi`).** Managed in Weblate. |
| SOS / panic alert to contacts | **No** | "Panic" means data destruction only. There are no emergency contacts, SMS or location sharing. |
| Offline | Yes | All capture, encryption and form-filling work offline. The outbox queues submissions until a connection is available. Nearby Sharing works with no internet. |
| Other | Image editing (crop), signature widget (`SignatureActivity`), QR (zxing) for P2P pairing, offline map picker (mapsforge), opt-in Divvi Up analytics, feedback form. |

### 1B. iOS (`Tella-iOS`)

| Feature | Present? | Evidence / notes |
|---|---|---|
| Camera (photo + video) | Yes | Custom AVFoundation camera: `Tella/Scenes/Camera/Views/CustomCameraController.swift` (`CameraService`: AVCapturePhotoCaptureDelegate + AVCaptureFileOutputRecordingDelegate) and `CameraViewModel.swift`. |
| Audio recorder | Yes | `Scenes/Audio/Recorder/RecordingManager/RecordingAudioManager.swift` (AVAudioRecorder, session `.playAndRecord`). |
| Records with screen locked / backgrounded? | **No** | `Info.plist` has `UIBackgroundModes = [fetch, processing]` and no `audio`, so iOS suspends the recorder on background or lock. `TellaApp.swift` `scenePhase` handler: `.inactive` shows the security screen and `.background` saves state and starts the lock-timeout clock. |
| Verification mode / metadata | **No** (docs: "not yet") | There is only a "Preserve metadata" toggle (`settings.preserveMetadata`), which keeps EXIF/GPS from `LocationManager` (CLLocation) in the photo or video. There is no cell, Wi-Fi or sensor capture. (The entitlement `com.apple.developer.networking.wifi-info` is present.) |
| File hash | Yes, SHA-256 on import | `VaultFilesManager.swift` L79/L132/L203 → `URLExtension.sha256Hash()` (CryptoKit `SHA256`); stored in the `hash` column of the vault DB. Used in Nearby Sharing (`SenderPrepareFileTransferVM.swift`). It is computed **after** the file lands in tmp, not in-stream. |
| Signing of evidence | **No** | `Utils/CertificateGenerator.swift` (swift-certificates, `sha256WithRSAEncryption`) is P2P TLS only. A Secure Enclave key already exists (`Data/Crypto/KeychainStore.swift`, `kSecAttrTokenIDSecureEnclave`), so the pattern for a signing key is there. |
| Encrypted vault | Yes | Files: **AES-256-CTR via CommonCrypto** (`Data/Crypto/Cryptor.swift`, `kCCModeCTR`), also unauthenticated. Keys live in the Keychain wrapped with a Secure Enclave key (`CryptoManager`, `VaultKeyStore`, `VaultKeyMigrator` after the v3.1 audit fixes). DB: SQLCipher (CocoaPods). Default data protection `NSFileProtectionCompleteUnlessOpen`. |
| Lock | Password or PIN | `Data/Crypto/PasswordTypeEnum.swift` {tellaPassword, tellaPin, passcode}. **No Face ID / Touch ID** (no LAContext usage). Lock timeout, delete-after-failed-unlock, show-unlock-attempts and screen security are in `Scenes/Settings/Views/Security/*`. |
| Camouflage | **No** | No alternate icons (`setAlternateIconName` is never called). Docs confirm Android only. |
| Quick delete | Yes (files + connections) | `SecuritySettingsView.swift` (`settQuickDelete`, files and connections checkboxes). It cannot uninstall the app on iOS. |
| Connections | Tella Web, Uwazi, Google Drive, Dropbox, Nextcloud, Nearby Sharing | `Scenes/{Reports,Uwazi,GDrive,Dropbox,Nextcloud,NearbySharing}`. **No ODK** (zero OpenRosa or XForm references). |
| Background / resumable upload | Yes | Background `URLSessionConfiguration.background(withIdentifier:)` (`Data/Networking/Session/TellaURLSessionConfigurationFactory.swift`), BGTaskScheduler, and per-file `bytesSent`/`current` offsets (`Data/Networking/Upload/BaseUploadOperation.swift`, `UploadService.swift`, `AutoUpload.swift`). |
| Forms | Uwazi templates and Tella Web report templates only | No XForms. |
| i18n | `Supporting Files/*.lproj/Localizable.strings` (757 keys in en) with Swift accessor enums in `Utils/Localizable/*.swift` and in-app language switching (`Utils/Language/LanguageManager.swift`, `Language.swift` enum) | Locales: ar, az, be, bn, ckb, en, es, fa-IR, fr, id, lus, ml, my, pt-BR, pt-MZ, ru, sn-ZW, ta, ts, uk, vi, zh-Hans. **No Hindi.** Adding a language means adding an lproj **and** a `Language` enum case. |
| SOS | **No** | |
| Offline | Yes | Capture, vault and Nearby Sharing work offline. The outbox queues submissions. |
| Other | Image edit (Mantis), resources, feedback, ZIP export (ZIPFoundation), `VaultManager` framework target, vendored `llhttp` C HTTP parser (MIT) for the Nearby Sharing server. |

---

## 2. Architecture

### Android
- **Language:** Kotlin 2.2.0 and Java, roughly 60/40. Lines of code (all `.kt` + `.java` per module):

  | Module | Kotlin | Java | layout XMLs |
  |---|---|---|---|
  | `mobile` (app) | 55,285 | 37,630 | 220 |
  | `shared-ui` | 5,136 | 3,310 | 52 |
  | `tella-locking-ui` | 2,008 | 3,044 | 9 |
  | `tella-vault` | 507 | 3,123 | 0 |
  | `tella-database` | 466 | 1,804 | 0 |
  | `tella-keys` | 0 | 1,416 | 0 |
  | `pdfviewer` | 1,068 | 0 | 4 |
  | **Total** | **~64.5k** | **~50.3k** | ~285 |

  That comes to **about 115k LOC**.
- **UI:** XML views with ViewBinding, Fragments and the Navigation component, written in a mix of MVP (`mvp/`) and MVVM (`mvvm/`). **Jetpack Compose is used only in the `pdfviewer` module.** DI is Hilt 2.57.1 (kapt). Async code mixes RxJava 2 and coroutines.
- **SDK levels:** minSdk **21** (Android 5.0), target and compile SDK **36**, NDK pin `28.0.12916984` (no first-party native code; the NDK is probably used for stripping prebuilt `.so` files), Java/Kotlin JVM target 17.
- **Build:** AGP 8.9.1, Gradle wrapper **8.11.1**, Kotlin 2.2.0, kapt and serialization plugins. CI uses Temurin **JDK 21** with platform 36 and build-tools 36.0.0.

**Dependencies and licences.** Licences come from upstream LICENSE files checked today. Rows marked ⚠ are the ones to act on.

| Dependency | Licence | Note |
|---|---|---|
| AndroidX (appcompat, camera-*, work, navigation, biometric, credentials, exifinterface, multidex…) | Apache-2.0 | OK |
| Hilt / Dagger | Apache-2.0 | OK |
| SQLCipher for Android 4.6.1 | BSD-style (Zetetic community) | OK, keep the notice |
| CacheWord 0.1.1 | BSD-3 | OK |
| BouncyCastle bcprov/bcpkix 1.78 | MIT-style | OK |
| Conscrypt 2.5.3 | Apache-2.0 | OK |
| RxJava2/RxAndroid/RxRelay, Retrofit 3, OkHttp, okhttp-digest, Gson, Glide 4.15, ExoPlayer 2.18.2, Timber, Tape, commons-io, commons-codec, joda-time, zxing-android-embedded, PermissionsDispatcher, android-image-cropper, androidsvg, circularimageview, ink-android, kxml2, SimpleXML converter, kotlinx-serialization, Ktor 3.3 + Netty | Apache-2.0 / MIT / BSD | OK |
| ODK JavaRosa 2.6.0 (`org.opendatakit`) | Apache-2.0 | OK |
| `commons-httpclient:3.1` | Apache-2.0 | ⚠ EOL since 2011, with known CVEs. Remove it if Nextcloud is dropped. |
| **mapsforge-map-android 0.25.0** | **LGPL-3.0** (with §4d/e relink waived) | ⚠ Acceptable with a notice, or remove it along with the location-picker map. |
| Nextcloud `android-library` 2.22.0 | MIT | OK by itself |
| **`nextcloud-deps.hwsecurity:hwsecurity-fido/fido2` 4.1.0-patch1** | **GPL-3.0-or-later or commercial** | ❌ **Copyleft. Remove it, which means removing the Nextcloud connection.** |
| `org.divviup.android:divviup-android` 0.2.1 | MPL-2.0 | ⚠ Telemetry. Remove it. |
| `com.github.vihtarb:tooltip` (jitpack) | not verified | ⚠ Check, or replace with a Material tooltip. |
| Firebase Crashlytics (BoM 26.1.0), play-services-base/auth, googleid, credentials-play-services-auth, Google API client + Drive v3 | Proprietary SDKs (Apache-licensed wrappers that pull GMS) | ❌ Playstore flavour only. **Use the `fdroid` flavour.** |
| Dropbox core + android SDK 7.0.0 | MIT, but a third-party cloud | playstore only, so excluded by fdroid |
| LeakCanary (declared version, debug) | Apache-2.0 | OK |

**Telemetry and network calls in the fdroid flavour:** opt-in Divvi Up (leader and helper URLs are blank in `res/values/divviup.xml`, presumably injected at release build time), user-initiated feedback to `api.feedback.tella-app.org/opinions/` (`data/ParamsNetwork.kt`), and help links to tella-app.org. There are no ads and no third-party analytics. Horizontal's own CI strips any `firebase|crashlytics|com.google.gms` lines from the Gradle files for F-Droid.

### iOS
- **Language:** Swift 5 (`SWIFT_VERSION = 5.0`). There are **711 Swift files and ~62k LOC**, plus the vendored C `llhttp` parser and a tiny ObjC `VaultManager.h` framework header.
- **UI:** **SwiftUI first.** 315 files import SwiftUI and 48 import UIKit; there are about 14 UIKit bridges (UIViewControllerRepresentable for the camera, QuickLook and pickers). The architecture is MVVM with Combine plus async/await actors (`FilesActor`, `NearbySharingStateActor`).
- **Minimum OS:** **iOS 15.0** (`IPHONEOS_DEPLOYMENT_TARGET`, Podfile `platform :ios, '15.0'`).
- **Project:** `objectVersion 54`, `LastUpgradeCheck 1420` (Xcode 14.2 era) with a workspace (CocoaPods). Targets: Tella, VaultManager (framework), TellaTests, TellaUITests.

**Dependencies:**

| Dependency | How | Licence | Note |
|---|---|---|---|
| SQLCipher ≥ 4.5.2 | CocoaPods | BSD-style | OK |
| ZIPFoundation | CocoaPods | MIT | OK |
| GoogleSignIn ~> 9.1 | CocoaPods | Apache-2.0, Google service | ❌ Remove (privacy, Google dependency) |
| GoogleAPIClientForREST/Drive | CocoaPods | Apache-2.0, Google service | ❌ Remove |
| SwiftyDropbox | CocoaPods | MIT, third-party cloud | ⚠ Remove for privacy |
| **NextcloudKit** | SPM (upToNextMajor) | **GPL-3.0 + App Store exception** | ❌ **Copyleft. Remove it with the Nextcloud connection.** |
| Mantis | SPM (exact version) | MIT | OK |
| swift-certificates (pulls swift-asn1, swift-crypto) | SPM | Apache-2.0 | OK |
| llhttp (vendored) | source | MIT | OK |

**Telemetry:** no analytics or crash SDK. The only Tella-owned endpoint is user-initiated feedback (`Data/Networking/Constants/FeedbackConstants.swift` → `https://api.feedback.tella-app.org`) plus doc links in `Utils/Constants.swift`.

---

## 3. Build

### Android
- **Needs:** JDK 17+ (CI uses Temurin 21), Gradle 8.11.1 (wrapper), AGP 8.9.1, Android SDK platform 36, build-tools 36.0.0, NDK 28.0.12916984, and network access to google(), mavenCentral(), jitpack.io, the Gradle plugin portal and oss.sonatype snapshots.
- **Release command (upstream):** `./gradlew :mobile:assembleFdroidRelease -Pfdroid`, then sign with `apksigner` (the release signingConfig is read from the `RELEASE_STORE_FILE` env/property; fdroid builds are unsigned by design). See `fastlane/README.md`, `docs/fdroid-release-verification.md` and `scripts/fdroid-postprocess-apk.sh`.
- **This container:** `java` = OpenJDK 21.0.12 is present, and `gradle` 8.14.3 is present at `/opt/gradle`. `sdkmanager` is absent and `ANDROID_HOME` is unset. There is 30 GB free on `/`, 7 GB RAM and 2 vCPU. **Blocker: the egress proxy rejects dl.google.com, repo.maven.apache.org and jitpack.io**, so neither the SDK nor any dependency can be fetched. Unless those domains are allowed, a release APK cannot be built here.
- **Resource estimate if network were allowed:** SDK platform + build-tools + platform-tools ≈ 1 GB, NDK ≈ 2.5–3 GB, Gradle caches ≈ 2–3 GB, build outputs ≈ 1–2 GB, so **about 7–9 GB disk** in total. RAM is tight: `gradle.properties` sets `-Xmx6g` on a 7 GB machine, so lower it to around 3–4 GB, set `workers.max=1` and run R8 single-threaded. Expect 15–30 minutes cold. Feasible, but marginal.
- **Recommended path:** GitHub Actions `ubuntu-latest`, adapted from Horizontal's `build-fdroid-apk.yml`. Store our keystore in Actions secrets.

### iOS
- **Xcode:** the project is from the Xcode 14.2 era, but **App Store Connect requires uploads built with Xcode 26 / the iOS 26 SDK since April 2026**, so use Xcode 26.x. Expect Swift 6-era warnings (SWIFT_VERSION 5 mode keeps it compiling) and possibly some deprecation fixes. This has not been verified by an actual build.
- **Missing config:** create `TellaConfig.xcconfig` (it is referenced but absent; it carries `GOOGLE_REVERSE_CLIENT_ID` and `DROPBOX_APP_KEY`), or remove the Google and Dropbox URL types from `Info.plist` when those integrations are removed.
- **Dependencies:** CocoaPods (`pod install`; the workspace is committed, Pods/ is git-ignored) plus SPM (NextcloudKit, Mantis, swift-certificates). CocoaPods trunk is moving to read-only (late 2026). Existing pods stay installable, but if Google, Dropbox and Nextcloud are removed, the only remaining pods are SQLCipher and ZIPFoundation. **Migrating both to SPM** (SQLCipher has an SPM package; ZIPFoundation is SPM-native) would remove CocoaPods entirely.
- **GitHub Actions:** GitHub's docs state that "Use of the standard GitHub-hosted runners is free and unlimited on public repositories", and the standard runners include `macos-14`, `macos-15` and `macos-26` (arm64, 3 CPU / 7 GB / 14 GB SSD). Larger runners are always billed. **A public fork can therefore build and upload to TestFlight for free** with fastlane (`match` or App Store Connect API key + `gym` + `pilot`). The fastlane setup must be written from scratch because the iOS repo has none. Also needed: a paid Apple Developer account (USD 99/yr), our own team ID, and new bundle IDs for the app and the `VaultManager` framework.

---

## 4. Rebranding surface

| Item | Android | iOS |
|---|---|---|
| App ID | `mobile/build.gradle`: `applicationId "org.hzontal.tella"` (playstore), `"org.hzontal.tellaFOSS"` (fdroid). The Kotlin namespace `org.horizontal.tella.mobile` can stay. | `PRODUCT_BUNDLE_IDENTIFIER = org.wearehorizontal.tella`, `org.hzontal.tella.VaultManager`, test targets `com.anessapetteruti.*`. Team IDs 6ZG9T42688 / 2RXQS7CK9P. `BGTaskSchedulerPermittedIdentifiers` uses `$(PRODUCT_BUNDLE_IDENTIFIER)`. |
| App name | `res/values/strings.xml` `app_name` = "Tella". **114 en strings contain "Tella"**, across 26 locale `strings.xml` files. The camouflage aliases have their own labels. | `Info.plist` `CFBundleDisplayName = Tella`, permission strings mention Tella, **87 en Localizable entries contain "Tella"**. |
| Icons | `res/mipmap-*` (127 files in xxxhdpi alone, mostly camouflage icons, which can be kept), adaptive icon in `mipmap-anydpi-v26`. | `Assets.xcassets/AppIcon.appiconset`, `NewAssets.xcassets`, `OldAssets.xcassets`, `splash.png`. |
| Colours / fonts | `shared-ui/src/main/res/values/colors.xml` (`colorPrimary` = `space_cadet`, `tigers_eye` and so on), `styles.xml`. | `NewAssets.xcassets/Colors`, `Utils/Styles.swift`, `TypographyStyle.swift`, OpenSans fonts (Apache-2.0). |
| Hardcoded Tella URLs | `FossFeatureSheetUtils.kt` (tella-app.org/open-source), `OnBoardLockSuccessFragment.kt`, `AnalyticsContributeFragment.kt`, `data/ParamsNetwork.kt` (**api.feedback.tella-app.org**), doc links in strings. | `Utils/Constants.swift` (8 tella-app.org links), `FeedbackConstants.swift` (**api.feedback.tella-app.org**). |
| Other identifiers | Divvi Up task IDs, F-Droid fastlane metadata (`fastlane/metadata/android`), `.well-known/funding-manifest-urls`, `NOTICE.txt`. | `.well-known/funding-manifest-urls`, copyright headers ("© HORIZONTAL, Licensed under MIT"), which must stay because MIT requires the notice to be retained. |

**Trademark:** neither README, nor tella.app/open-source, nor a web search turned up a published trademark or brand policy. The website itself is CC 4.0. MIT grants no trademark rights in any case. The safe course is to remove the "Tella" name, logo and colours everywhere, keep the MIT copyright notices, and say "based on Tella by Horizontal (MIT)" in the About screen and the licence file. Contacting Horizontal is worthwhile anyway (see §6).

**Rebrand effort (AI agent):** Android 6–10 h, iOS 6–10 h, plus design assets.

---

## 5. Feature parity

| Feature | Android (fdroid flavour) | iOS |
|---|---|---|
| Photo / video camera | Yes (CameraX) | Yes (AVFoundation) |
| Audio recorder | Yes | Yes |
| Recording continues when locked/backgrounded | No (no FGS) | No (no `audio` background mode) |
| Verification metadata (location, cells, Wi-Fi, sensors, device, network) | Yes, opt-in, CSV export | No (only EXIF/GPS "preserve metadata") |
| SHA-256 per file | Yes (in-stream at encryption) | Yes (on import) |
| Evidence signing | No | No |
| Encrypted vault | AES-256-CTR + SQLCipher | AES-256-CTR (CommonCrypto) + SQLCipher, Secure Enclave key wrap |
| Lock: PIN / password | Yes / Yes | Yes / Yes |
| Lock: pattern | Yes | No |
| Lock: biometric | Yes (device credentials) | No |
| Lock timeout, delete after failed unlocks, screen security | Yes | Yes |
| Camouflage (icon/name, calculator) | Yes | No |
| Quick delete: files / connections / app | Yes / Yes / Yes | Yes / Yes / No (OS limit) |
| Tella Web reports | Yes | Yes |
| Uwazi | Yes | Yes |
| ODK forms | Yes | No |
| Google Drive | playstore only | Yes |
| Dropbox | playstore only | Yes |
| Nextcloud (GPL dependency) | Yes | Yes |
| Nearby Sharing (offline P2P, mTLS) | Yes | Yes |
| Background / resumable upload | Yes (WorkManager, chunked) | Yes (background URLSession, offsets) |
| Server "Resources" (PDFs) | Yes | Yes |
| Hindi UI | No | No |
| SOS / emergency contacts | No | No |
| Analytics | Opt-in Divvi Up | None |
| Offline capture | Yes | Yes |

---

## 6. Upstream contribution and localisation

- **CONTRIBUTING.md:** not present in either repo. Both READMEs have a "Contributing to the code" section: pick an issue and comment, fork, branch from `develop` named `XXX-description`, open a PR referencing the issue. Both have PR and issue templates and `stale.yml`. Horizontal holds monthly community meetings (tella.app/community-meetings) and invites contact about "support deploying Tella".
- **Localisation:** **Weblate** ("We use Weblate to manage all Tella translations"; Android release notes from Aug 2026 confirm the move to Weblate). Hindi is not among the 25 listed languages. **Contributing a Hindi translation upstream through Weblate is low-cost and goodwill-positive.** It would also let the fork pull Hindi strings back via merges.
- **Strategy note:** generic improvements (Hindi, a microphone foreground service, a signed hash manifest) could go upstream. India-specific content (rights guides, SOS numbers) belongs in the fork. Staying close to upstream matters: the codebases are large and get security-audit fixes (iOS 3.0/3.1 shipped audit fixes).

---

## 7. Effort assessment (hours for an AI coding agent)

These hours cover coding, wiring and unit tests only. They exclude human review, device QA, design, and legal or content writing. Ranges assume the agent works inside the existing architecture: XML/MVVM/Hilt on Android, SwiftUI/MVVM on iOS.

| Work item | Android | iOS | Notes |
|---|---|---|---|
| **(a) SHA-256 + signed metadata manifest per file** | 10–16 h | 10–16 h | The hash already exists. Work needed: a per-install signing key (Android Keystore EC P-256, or Ed25519 via the bundled BouncyCastle; iOS Secure Enclave P-256 via CryptoKit), a canonical JSON manifest (hash, size, MIME, capture time UTC plus monotonic/NTP flag, location, device, app version, public key fingerprint), stored encrypted next to the file and exported with it, plus a verify routine. Android can reuse the `Metadata` object. iOS has to gather metadata itself, because verification mode does not exist there. Consider hash-chaining manifests and optional RFC 3161 timestamping (+6–10 h each). |
| **(b) PDF "certificate" generator** | 8–12 h | 6–10 h | Android: `android.graphics.pdf.PdfDocument` + `StaticLayout` (Devanagari shaping works through the platform text stack), QR code via the existing zxing. iOS: `UIGraphicsPDFRenderer` + `CIQRCodeGenerator`. Content: file thumbnail, hash, manifest, signature, public key, and verification instructions. Add 2–4 h for a Hindi template and bundled Noto Sans Devanagari. |
| **(c) SOS screen: emergency contacts + prefilled SMS/WhatsApp** | 8–14 h | 8–14 h | Contacts stored in the encrypted DB, a picker, a message template with a location link, `ACTION_SENDTO smsto:` / `wa.me` intents on Android and `MFMessageComposeViewController` / `whatsapp://` or `https://wa.me` on iOS. **Silent auto-send is not possible on iOS.** On Android it needs `SEND_SMS`, which Play policy restricts, but that matters less for F-Droid or sideloaded builds. Add 4–8 h for a lock-screen-bypass / quick-tile entry point. |
| **(d) Static guide screens (rights, safety), English + Hindi** | 6–10 h | 6–10 h | Bundled Markdown or HTML rendered in a WebView or native views, with a table of contents and search. Content authoring and legal review are separate human work. |
| **(d′) Full Hindi UI translation** | 4–6 h agent draft (≈1,100 + lock/vault strings) | 3–5 h (757 keys, plus a `Language.hindi` enum case) | Needs native-speaker review. Better done through upstream Weblate. |
| **(e) Chunked "bug mode" audio, each chunk hashed** | 16–28 h | 14–24 h | Android: a new `ForegroundService` (`foregroundServiceType="microphone"`, persistent notification), rotating encoders every N seconds, hashing each chunk in-stream with the existing DigestOutputStream, a hash chain and manifest per session, survival of the lock timeout, and OEM battery-killer handling. iOS: add `UIBackgroundModes: audio`, keep the AVAudioSession active, rotate AVAudioRecorder/AVAudioEngine segments, and rework the `scenePhase` lock logic so locking the vault does not stop the recording. The iOS mic indicator always shows (no covert recording), and App Review must accept the background-audio use. |
| Prerequisite: remove GPL/proprietary integrations (Nextcloud on both; Google Drive and Dropbox on iOS; Divvi Up and feedback on Android) | 4–8 h | 8–12 h | Android is mostly done already by using the fdroid flavour. |
| Prerequisite: rebrand | 6–10 h | 6–10 h | See §4. |
| Prerequisite: CI (signed APK; fastlane + TestFlight) | 3–5 h | 6–10 h | The iOS figure includes certificate/match setup. |

**Rough total:** Android about 65–110 h and iOS about 70–115 h of agent time, plus substantial human review and on-device testing.

---

## 8. Biggest risks

1. **Copyleft contamination.** Nextcloud brings hwsecurity (GPLv3) on Android and NextcloudKit (GPLv3) on iOS. Strip both before the first release, or accept relicensing the fork as GPLv3.
2. **Background audio is new work, and the OS fights it.** Android OEM task killers and Play foreground-service policy, iOS background-audio review, and Tella's own lock-on-background design all work against "bug mode". It is the riskiest feature.
3. **Evidentiary weakness of the inherited design.** File encryption is AES-CTR with no MAC on both platforms, and the hash is stored in the same DB as everything else, with no signature, trusted timestamp or chain of custody. Under Indian evidence law (BSA 2023 s.63 certificate, which needs a hash), the manifest and certificate work in (a) and (b) is what makes this usable. The design should be reviewed by a forensic expert.
4. **iOS divergence.** iOS lacks verification mode, camouflage, ODK, the pattern lock and biometrics, so parity costs extra. The iOS codebase is also behind Android in features, which means two separate ports of each new feature (no shared code: Kotlin/Java vs Swift).
5. **Build environment.** This container cannot reach Maven or Google, so builds must run in GitHub Actions. The iOS project dates from the Xcode 14.2 era and must be built with Xcode 26 for App Store uploads. The missing `TellaConfig.xcconfig` and Horizontal's team IDs need fixing. CocoaPods trunk is going read-only.
6. **Maintenance and merge drift.** About 115k LOC on Android and 62k on iOS, with active upstream development (Android 3.4.0 shipped 6 Oct 2026). Rebranding strings across 26 locales makes upstream merges noisy. Keep brand strings isolated in one overlay resource set or flavour where possible.
7. **Old minSdk (21) and legacy libraries** (commons-httpclient 3.1, RxJava 2, kapt) increase the attack surface and build fragility. Consider raising minSdk to 26+.
8. **Trademark.** There is no published policy. Remove all Tella branding and the feedback and analytics endpoints, keep the MIT notices, and consider asking Horizontal for a blessing or collaboration.

---

### Sources
- Repos: https://github.com/Horizontal-org/Tella-Android, https://github.com/Horizontal-org/Tella-iOS (code as cited above); release pages `/releases` for both.
- Features by platform: https://tella.app/features (redirected from tella-app.org/features)
- Translation / Weblate: https://tella.app/translating-tella/
- Open-source page: https://tella.app/open-source/
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions ; runners: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Apple SDK minimum requirements: https://developer.apple.com/news/upcoming-requirements/
- Licences: raw LICENSE files of nextcloud/NextcloudKit (GPLv3 + App Store exception), nextcloud-deps/hwsecurity (GPLv3 / commercial), mapsforge/mapsforge (LGPL-3.0, relink waived), divviup/divviup-android (MPL-2.0), nextcloud/android-library (MIT), guardianproject/cacheword (BSD-3), nak5ive/ink-android (Apache-2.0).

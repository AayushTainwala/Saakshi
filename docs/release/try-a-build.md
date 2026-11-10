# How to try a build on your Mac

Moved from `docs/BUILD_HANDOFF.md` on 10 Nov 2026, word for word.

Every run of the **Native build** workflow makes two test builds you can download and try on your Mac. It runs on each pull request that changes native code, or whenever you start it by hand. The builds are:
- one for Apple's iPhone Simulator;
- one for the Android emulator.

They are for trying the app, not for sharing. The Android one is signed with a public test key, so a fake could carry the same key.

**1. Get the files**
1. Open https://github.com/AayushTainwala/Saakshi/actions and choose **Native build** on the left.
2. For a fresh build of `main`: **Run workflow** → **Run workflow**. It takes about 30–45 minutes.
3. Open a finished run (green tick), and scroll down to **Artifacts**. Download:
   - `Saakshi-<commit>-ios-simulator.zip` for the iPhone;
   - `Saakshi-<commit>-android-emulator.apk` for Android.

   You must be logged in to GitHub. Each build is kept for 30 days.

**2. iPhone, in the Simulator**
1. Install **Xcode** from the Mac App Store. It's free and a large download.
2. Open Xcode once. If it offers to install the iOS platform or a simulator, accept. If none is installed, add one in Xcode → Settings → Components (called Platforms in older versions).
3. Open the Simulator: in Xcode's menu, **Xcode → Open Developer Tool → Simulator**. An iPhone appears on screen.
4. Double-click the downloaded `.zip` in Finder. It becomes `Saakshi.app`.
5. Drag `Saakshi.app` onto the Simulator's iPhone screen. Saakshi appears on its home screen; click it to open.

**3. Android, in the emulator**
1. Install **Android Studio**, free from https://developer.android.com/studio, and go through its setup with the default choices.
2. On its welcome screen: **More Actions → Virtual Device Manager → Create device**.
   1. Pick a phone, such as a Pixel.
   2. Pick the recommended system image and let it download.
   3. Click **Finish**.
3. Start the virtual phone with its ▶ button.
4. Drag the downloaded `.apk` onto the emulator window. It installs; open Saakshi from the app list.

**What a simulator can't show.** Try these on a real phone, through TestFlight or the GitHub APK:
- **The iPhone Simulator** has no camera, can't send SMS, and App Attest doesn't work there. The phone's security-chip key may not either.
- **The Android emulator's camera** shows a made-up test scene.
- **SMS from the emulator** goes nowhere: there is no real SIM.
- **Location:** both can pretend to be somewhere. In the Simulator, use Features → Location. In the emulator, use the ⋯ button → Location.

If you put the Android test APK on a real phone, uninstall it before installing a real Saakshi release. The two are signed with different keys, so Android won't install one over the other.

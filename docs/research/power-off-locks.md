# Power-off locks and phone-maker protections

Researched 6 Nov 2026 (cloud session, web only; no phone was tested). Feeds SPEC G5 (phone setup in the walkthrough), the brief's Part 4, and the release-time requests to Apple, Google and makers.

## The question

If someone takes the user's phone, can the user's phone be set so that **powering it off needs the passcode**? Can Saakshi set that itself? Which makers offer it, and where?

## Source grades

- **[P]** the maker's or Android's own page, or Android reference documentation.
- **[S]** a news site, forum, community post or mirror. Treat as a lead, not a fact.
- **[T]** needs a test on a real phone before the walkthrough tells anyone it works.

Nothing here is legal content. No statute or judgment is relied on.

## Short answer

1. **Saakshi cannot put a code on power-off.** On Android, the power menu can be controlled only by a device owner, a profile owner or a holder of a special management permission, and only in "lock task mode" [P]. An ordinary Play app is none of these. On iPhone there is no public way at all. The only other routes are an accessibility service (banned by CLAUDE.md), rooting, or a fully managed phone. This matches SPEC G5.
2. **Several Android makers ship a setting that does it.** It is the user's own setting, found in Settings. Saakshi's walkthrough can only point the user to it. Paths below are mostly [S] and must be tested ([T]) before they ship in the walkthrough.
3. **Samsung, Pixel and iPhone: no confirmed power-off lock.** See each section.
4. **A phone-maker setting can accept a fingerprint or face** (Realme's does [S]). The walkthrough's "passcode only" advice conflicts with that. Test what each maker accepts.

## Android in general

| Finding | Source | Grade |
|---|---|---|
| `DevicePolicyManager.setLockTaskFeatures` with `LOCK_TASK_FEATURE_GLOBAL_ACTIONS` controls the power menu, only in lock task mode, and only for a device owner, profile owner, or holder of `MANAGE_DEVICE_POLICY_LOCK_TASK` | [DevicePolicyManager reference](https://developer.android.com/reference/android/app/admin/DevicePolicyManager) (Android Developers) | [P] for the method, but the sentence on the global-actions flag was read on a mirror of the Android reference (Microsoft Learn) and AOSP commits (gitlab.e.foundation), not on developer.android.com. Re-check on developer.android.com before quoting |
| A **Device Administrator** (what an ordinary app can become, with the user's consent) gets only the policies listed in its device-admin XML: password rules, lock now, wipe, disable camera and similar. Power-off control is not in that list | [Device administration overview](https://developer.android.com/work/device-admin) | [P] |
| A device owner exists only on the system or main user and is the most powerful policy controller; a profile owner affects one user | [DevicePolicyManager reference](https://developer.android.com/reference/android/app/admin/DevicePolicyManager) | [P] |
| Google Play's Device and Network Abuse policy forbids unauthorised interference with the device | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en) | [P] (relevant to why we should not look for tricks) |

Conclusion: not buildable in an ordinary Play app. Do not request device admin for this.

## Samsung and Knox

| Finding | Source | Grade |
|---|---|---|
| Knox SDK / Knox Customization can disable power-off (permission `KNOX_HW_CONTROL`, "device power off"); MDM vendors expose it as "Disable Power Off" | docs.samsungknox.com pages and MDM vendor pages (Hexnode, 42Gears) found in search | [P] for the permission name, [S] for the vendor pages |
| It needs a **Knox licence** from Samsung's developer portal (a business use case may be asked for) and Device Admin | Knox documentation (the licence page itself would not load for me) | [S], licence terms **unverified** |
| From Android 15 (Knox 3.11), selected Knox SDK methods are limited to apps running as Device Owner or Profile Owner | Knox FAQ on API restrictions | [P] for the rule; **I did not read the "Restricted API methods" page, so I do not know whether the power-off methods are on that list** |
| Samsung's own setting "Lock network and security" (Settings > Lock screen > Secure lock settings) keeps network and security functions locked while the phone is locked. Samsung's page does not mention power-off. Community posts disagree on whether it also asks for the PIN to power off | Samsung support, Samsung community | [P] for the setting, [S] for the power-off claim |
| One UI 9 beta reportedly adds a PIN requirement to power off or restart | IntoMobile, 2 Jun 2026 | [S], beta only, **unknown for stable** |

Conclusion: an ordinary Saakshi cannot do this on Samsung (Knox is enterprise, licensed, and moving to Device Owner only). Whether a Samsung phone can be set up to ask for the PIN to power off is **unconfirmed**; [T] on a Samsung phone running stable One UI.

## Other makers

| Maker | Setting and path | Source | Grade | Open points |
|---|---|---|---|---|
| **Realme** | "Require password to power off". realme UI 4.0 to 6.0: Settings > Security & privacy > More security & privacy. realme UI 3.0: Settings > Password & security > System security | [realme.com/in/support/kw/doc/2088486](https://www.realme.com/in/support/kw/doc/2088486) | [P] | A mirror site gives a newer realme UI 7.0 path "Anti-theft features > Verify for power-off", says fingerprint or face is accepted, and says older UI R/Go/T/S/U editions are not supported [S]. [T] |
| **OPPO / OnePlus** | Same setting in ColorOS and OxygenOS (Android 13+); on OxygenOS 14 reported off by default | India TV (Aug 2025), TechBone, a Samsung community post | [S] | No OPPO or OnePlus page found. [T] |
| **Vivo / iQOO** | "Unlock to Power Off", Settings > Privacy (Funtouch OS) | gadgetstouse.com (Nov 2023) | [S] | OriginOS 6 is replacing Funtouch in India, so the path may differ. [T] |
| **Xiaomi / Redmi / POCO** | "Shutdown confirmation" in the Security app, Toolbox (Security app V12.7.2, HyperOS Global) | comss.ru, ximitime (Jul 2026) | [S] | A community post says it is not available in India. [T] |
| **Nothing** | Settings > Security and privacy > More security and privacy > "Power off verify" | support.nothing.tech | [P] | Exact page not re-opened in this session; confirm the link before quoting. [T] |
| **Motorola** | A community post mentions Moto Secure > Lock network and security | community post | [S] | Unverified for power-off. [T] |
| **Google Pixel** | None found. Pixel has Theft Detection Lock, Offline Device Lock, Failed Authentication Lock, Remote Lock, Identity Check, and authentication to turn off Find Hub. Android 17 "Mark as lost" hides Quick Settings | [Android Help](https://support.google.com/android/answer/15146908), blog.google | [P] | **Absence is not proven.** [T] on a Pixel |

## iPhone

| Finding | Source | Grade |
|---|---|---|
| No power-off lock or passcode-to-power-off setting found. Holding the side and a volume button for 2 seconds brings up the power-off / Emergency SOS screen, and after using it a passcode is needed to unlock | [support.apple.com/en-us/102381](https://support.apple.com/en-us/102381) (cited in `licences-and-feasibility.md`) | [P] |
| With Find My iPhone on, the phone may be found through the Find My network for up to **24 hours** after it is powered off or offline | [Apple Platform Security: Find My and location sharing](https://support.apple.com/en-ca/guide/personal-safety/ips05ede4573/web) | [P] |
| The same page says that, if someone wants to power off to get to safety and worries about being located, "iPhone Findable After Power Off" under Slide to Power Off lets them turn the Find My network off for that power-off | [Apple Personal Safety guide](https://support.apple.com/guide/personal-safety/find-my-and-location-sharing-ips05ede4573/web) | [P] |
| Which iPhones support it (iPhone 11 or later, iOS 15 or later, UWB chip, excluding SE), and the "up to 5 hours in power reserve" figure | Macworld, Engadget, Apple community | [S]. **Apple's own pages I found do not state these.** Confirm on an Apple page before the walkthrough says it |

Conclusion for iPhone: the walkthrough can say what Find My does after power-off (24 hours, Apple's page) and that Saakshi cannot stop power-off. It cannot promise a power-off lock because Apple does not offer one as far as I found.

## What this means for the build

1. **SPEC G5 stands.** Saakshi never claims it can stop power-off. Wording stays "only in Saakshi with the code" for what the code does.
2. **Part 4 walkthrough.** A phone-setup page that tells the user where their maker's setting is, only for makers marked [P] and tested, and a general line for the rest ("look in Settings for a setting that asks for your PIN to power off; not every phone has one"). Do not ship [S]-only paths as facts.
3. **Test list (owner's phones or borrowed).** Samsung (stable One UI), Pixel, Realme, OnePlus, Vivo, Xiaomi, Nothing, Motorola. For each: does the setting exist, where, what does it accept (PIN only, or fingerprint or face), and does it also apply from the lock screen power menu and the hardware button hold.
4. **No device admin, accessibility or Knox request in Saakshi for this.** Revisit only if the owner decides to ship a managed-device variant.
5. **Release.** The release notes and requests to Apple, Google and makers are on the release checklist (BUILD_HANDOFF.md). Which makers "offer it" in those notes must come only from the tested rows above.

## Not verified in this research

- Whether Knox's restricted-methods list covers power-off.
- Knox licence terms for a free, open-source, non-enterprise app.
- Any OPPO, OnePlus, Vivo or Xiaomi primary support page.
- Whether Samsung's "Lock network and security" asks for the PIN to power off on stable software.
- Whether any maker's setting works from the power button hold as well as the on-screen menu.
- Everything marked [T].

## Sources

- Android Developers: [Device administration overview](https://developer.android.com/work/device-admin); [DevicePolicyManager](https://developer.android.com/reference/android/app/admin/DevicePolicyManager)
- Google Play: [Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en)
- Android Help: [theft protection features](https://support.google.com/android/answer/15146908)
- Realme India: [Require password to power off](https://www.realme.com/in/support/kw/doc/2088486)
- Apple: [Find My and location sharing (Personal Safety guide)](https://support.apple.com/en-ca/guide/personal-safety/ips05ede4573/web); [iPhone passcode-required states](https://support.apple.com/en-us/102381)
- Samsung Knox documentation (docs.samsungknox.com): Knox SDK permissions and API restrictions FAQ
- Secondary leads: IntoMobile (One UI 9 beta, 2 Jun 2026); India TV (Aug 2025); TechBone; gadgetstouse.com (Nov 2023); comss.ru and ximitime (Jul 2026); Macworld and Engadget (Find My after power-off models)

const { AndroidConfig, createRunOncePlugin } = require('expo/config-plugins');

const SEND_SMS = 'android.permission.SEND_SMS';

/** True when prebuild runs with SAAKSHI_SMS_AUTOSEND set to 1 or true (the Android APK profile). */
function autoSendEnabled(env = process.env) {
  return ['1', 'true'].includes(String(env.SAAKSHI_SMS_AUTOSEND ?? '').trim().toLowerCase());
}

/**
 * Spec S2: in the Android APK, SOS texts trusted contacts with no tap, which needs SEND_SMS. Every
 * other build (Google Play, development) removes SEND_SMS from the merged manifest, even if a
 * library adds it, so the Play build never asks for it. iPhone is unaffected.
 */
function withSaakshiSos(config) {
  return autoSendEnabled()
    ? AndroidConfig.Permissions.withPermissions(config, [SEND_SMS])
    : AndroidConfig.Permissions.withBlockedPermissions(config, [SEND_SMS]);
}

module.exports = createRunOncePlugin(withSaakshiSos, 'saakshi-sos', '0.1.0');
module.exports.autoSendEnabled = autoSendEnabled;

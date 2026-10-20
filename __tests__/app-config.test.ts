import type { ExpoConfig } from 'expo/config';

import { ALWAYS_BLOCKED, SEND_SMS, buildFlags, withBuildFlags } from '../app.config';
import appJson from '../app.json';
import easJson from '../eas.json';

const base = appJson.expo as unknown as ExpoConfig;

function profileEnv(name: keyof typeof easJson.build) {
  return easJson.build[name].env;
}

describe('build flags', () => {
  it('defaults to a dev build with SMS auto-send off', () => {
    expect(buildFlags({})).toEqual({ channel: 'dev', smsAutoSend: false });
  });

  it('turns SMS auto-send on only in the apk profile', () => {
    expect(buildFlags(profileEnv('apk'))).toEqual({ channel: 'github', smsAutoSend: true });
    expect(buildFlags(profileEnv('play'))).toEqual({ channel: 'play', smsAutoSend: false });
    expect(buildFlags(profileEnv('ios'))).toEqual({ channel: 'appstore', smsAutoSend: false });
  });

  it('refuses SMS auto-send in a store build', () => {
    expect(() => buildFlags({ SAAKSHI_CHANNEL: 'play', SAAKSHI_SMS_AUTOSEND: '1' })).toThrow();
    expect(() => buildFlags({ SAAKSHI_CHANNEL: 'appstore', SAAKSHI_SMS_AUTOSEND: '1' })).toThrow();
  });

  it('refuses unknown values', () => {
    expect(() => buildFlags({ SAAKSHI_CHANNEL: 'githb' })).toThrow();
    expect(() => buildFlags({ SAAKSHI_SMS_AUTOSEND: 'true' })).toThrow();
  });
});

describe('Android permissions', () => {
  it('blocks SEND_SMS everywhere but the APK', () => {
    const apk = withBuildFlags(base, profileEnv('apk'));
    const play = withBuildFlags(base, profileEnv('play'));
    const dev = withBuildFlags(base, {});
    expect(apk.android?.blockedPermissions).not.toContain(SEND_SMS);
    expect(play.android?.blockedPermissions).toContain(SEND_SMS);
    expect(dev.android?.blockedPermissions).toContain(SEND_SMS);
  });

  it('always blocks the SMS-reading permissions Play Protect refuses in India', () => {
    for (const env of [profileEnv('apk'), profileEnv('play'), {}]) {
      const blocked = withBuildFlags(base, env).android?.blockedPermissions;
      expect(blocked).toEqual(expect.arrayContaining(ALWAYS_BLOCKED));
      expect(blocked).toContain('android.permission.READ_SMS');
      expect(blocked).toContain('android.permission.RECEIVE_SMS');
    }
  });

  it('blocks the template permissions no feature uses, and keeps the ones body-cam needs', () => {
    for (const env of [profileEnv('apk'), profileEnv('play'), {}]) {
      const blocked = withBuildFlags(base, env).android?.blockedPermissions ?? [];
      for (const p of ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'SYSTEM_ALERT_WINDOW', 'VIBRATE']) {
        expect(blocked).toContain(`android.permission.${p}`);
      }
      // Body-cam's foreground-service notice (Android 13+) and its camera and microphone.
      for (const p of ['POST_NOTIFICATIONS', 'CAMERA', 'RECORD_AUDIO', 'FOREGROUND_SERVICE_CAMERA', 'FOREGROUND_SERVICE_MICROPHONE']) {
        expect(blocked).not.toContain(`android.permission.${p}`);
      }
    }
  });

  it('never asks for a blocked permission in app.json', () => {
    const asked = (base.android?.permissions ?? []).map((p) =>
      p.startsWith('android.permission.') ? p : `android.permission.${p}`,
    );
    for (const p of ALWAYS_BLOCKED) expect(asked).not.toContain(p);
  });

  it('passes the flags to the app and keeps the rest of the config', () => {
    const apk = withBuildFlags(base, profileEnv('apk'));
    expect(apk.extra).toMatchObject({ channel: 'github', smsAutoSend: true, eas: base.extra?.eas });
    expect(apk.android?.package).toBe('in.aayushtainwala.saakshi');
    expect(apk.ios?.bundleIdentifier).toBe('in.aayushtainwala.saakshi');
  });
});

describe('eas.json', () => {
  it('has the three release profiles with the right artefacts', () => {
    expect(easJson.build.apk.android.buildType).toBe('apk');
    expect(easJson.build.play.android.buildType).toBe('app-bundle');
    for (const p of [easJson.build.apk, easJson.build.play, easJson.build.ios]) {
      expect(p.distribution).toBe('store');
      expect(p.autoIncrement).toBe(true);
    }
  });
});

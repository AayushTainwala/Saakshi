import type { ConfigContext, ExpoConfig } from 'expo/config';

// Build-time flags, set per EAS build profile in eas.json. app.json stays the base config.
//   SAAKSHI_CHANNEL       where the build is published: github, play, appstore (unset for local builds)
//   SAAKSHI_SMS_AUTOSEND  "1" lets SOS send its SMS without a tap (S2). Only the GitHub APK may set it.
// The app reads both from Constants.expoConfig.extra.

export const CHANNELS = ['github', 'play', 'appstore', 'dev'] as const;
export type Channel = (typeof CHANNELS)[number];

// Never in any Android build. Play Protect in India blocks sideloaded apps that ask for READ_SMS or
// RECEIVE_SMS (docs/research/distribution-and-accounts.md, A.2 section 1). The rest are added by
// Expo's template or libraries and no feature needs them: the app keeps its files in its own storage.
export const ALWAYS_BLOCKED = [
  'android.permission.READ_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

export const SEND_SMS = 'android.permission.SEND_SMS';

type Env = Record<string, string | undefined>;

export function buildFlags(env: Env): { channel: Channel; smsAutoSend: boolean } {
  const channel = (env.SAAKSHI_CHANNEL || 'dev') as Channel;
  if (!CHANNELS.includes(channel)) {
    throw new Error(`SAAKSHI_CHANNEL must be one of ${CHANNELS.join(', ')}; got "${channel}".`);
  }
  const sms = env.SAAKSHI_SMS_AUTOSEND ?? '0';
  if (sms !== '0' && sms !== '1') {
    throw new Error(`SAAKSHI_SMS_AUTOSEND must be "0" or "1"; got "${sms}".`);
  }
  const smsAutoSend = sms === '1';
  if (smsAutoSend && (channel === 'play' || channel === 'appstore')) {
    throw new Error(`SMS auto-send is for the GitHub APK only, not the ${channel} build.`);
  }
  return { channel, smsAutoSend };
}

export function withBuildFlags(config: ExpoConfig, env: Env): ExpoConfig {
  const { channel, smsAutoSend } = buildFlags(env);
  const inherited = config.android?.blockedPermissions ?? [];
  const blocked = [...ALWAYS_BLOCKED, ...(smsAutoSend ? [] : [SEND_SMS])];
  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [...new Set([...inherited, ...blocked])],
    },
    extra: { ...config.extra, channel, smsAutoSend },
  };
}

export default ({ config }: ConfigContext): ExpoConfig =>
  withBuildFlags(config as ExpoConfig, process.env);

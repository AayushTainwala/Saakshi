import { File, Paths } from 'expo-file-system';

export type BodyCamSettings = {
  /**
   * The user has unlocked with volume-up twice in the practice step, which Start waits for (fix
   * round 1, group 2). The old `taught` tick was for volume-down, so it doesn't count.
   */
  practised: boolean;
  quality: 720 | 1080;
  /** Android 13+: the notification permission has been asked for once (spec: first start only). */
  notificationsAsked: boolean;
};

export const defaultBodyCamSettings: BodyCamSettings = { practised: false, quality: 720, notificationsAsked: false };

function file(): File {
  return new File(Paths.document, 'evidence', 'bodycam.json');
}

export function loadBodyCamSettings(): BodyCamSettings {
  try {
    const f = file();
    if (!f.exists) return defaultBodyCamSettings;
    const raw = JSON.parse(f.textSync()) as Partial<BodyCamSettings>;
    return {
      practised: raw.practised === true,
      quality: raw.quality === 1080 ? 1080 : 720,
      notificationsAsked: raw.notificationsAsked === true,
    };
  } catch {
    return defaultBodyCamSettings;
  }
}

export function saveBodyCamSettings(settings: BodyCamSettings): void {
  const f = file();
  if (!f.exists) f.create({ intermediates: true });
  f.writeSync(JSON.stringify(settings));
}

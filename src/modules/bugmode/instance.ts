import SaakshiSos from '@native/saakshi-sos';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import type { UploadPart } from '@/modules/evidence';
import { canTextWithoutTap, getTrustedContacts, textTrustedContacts } from '@/modules/sos';

import { BugModeController, type BugState } from './controller';
import { startBugEngine } from './engines';

let partListener: ((part: UploadPart) => void) | null = null;

/**
 * E7 (copies to the user's cloud) plugs in here: each upload part of a bug-mode recording, a byte
 * range of its one file ending on a signed checkpoint, is handed over as soon as it exists (about
 * every minute, a setting shared with body-cam). Until it is set, everything stays on the phone.
 */
export function setBugModePartListener(next: ((part: UploadPart) => void) | null): void {
  partListener = next;
}

function formatTimeIST(iso: string): string {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
}

const liveActivity = SaakshiSos && Platform.OS === 'ios' ? SaakshiSos : null;

export const bugMode = new BugModeController({
  startEngine: (onProblem) =>
    startBugEngine(
      { title: i18n.t('sos:bug.noticeTitle'), text: i18n.t('sos:bug.noticeText') },
      (part) => partListener?.(part),
      onProblem,
    ),
  witnessCost: async () => ((await canTextWithoutTap()) ? (await getTrustedContacts()).length : 0),
  witness: async (message) => {
    const outcome = await textTrustedContacts(message, { directOnly: true });
    return outcome.channel === 'direct' ? outcome.results.filter((r) => r.status !== 'failed').length : 0;
  },
  witnessText: (latest, startedAt) =>
    i18n.t('sos:bug.witness', { from: formatTimeIST(startedAt), to: formatTimeIST(latest.at), hash: latest.recordSha256 }),
  liveActivity: {
    start: async () => {
      await liveActivity?.liveActivityStart(i18n.t('sos:bug.activityTitle'), i18n.t('sos:bug.activityStarting'));
    },
    update: async (signedAt) => {
      await liveActivity?.liveActivityUpdate(i18n.t('sos:bug.activitySigned', { time: formatTimeIST(signedAt) }));
    },
    end: async () => {
      await liveActivity?.liveActivityEnd();
    },
  },
  now: () => new Date(),
});

export function useBugMode(): BugState {
  return useSyncExternalStore(bugMode.subscribe, bugMode.getState);
}

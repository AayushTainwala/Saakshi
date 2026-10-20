import SaakshiSos from '@native/saakshi-sos';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import { canTextWithoutTap, getTrustedContacts, textTrustedContacts } from '@/modules/sos';

import { BugModeController, type BugState, type PieceUploader } from './controller';
import { startBugEngine } from './engines';

let uploader: PieceUploader | null = null;

/**
 * E7 (copies to the user's cloud) plugs in here: each sealed piece is handed to the uploader as
 * soon as it is saved. Until it is set, pieces stay on the phone.
 */
export function setPieceUploader(next: PieceUploader | null): void {
  uploader = next;
}

function formatTimeIST(iso: string): string {
  const d = new Date(Date.parse(iso) + 330 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
}

const liveActivity = SaakshiSos && Platform.OS === 'ios' ? SaakshiSos : null;

export const bugMode = new BugModeController({
  startEngine: () =>
    startBugEngine({ title: i18n.t('sos:bug.noticeTitle'), text: i18n.t('sos:bug.noticeText') }),
  witnessCost: async () => ((await canTextWithoutTap()) ? (await getTrustedContacts()).length : 0),
  witness: async (message) => {
    const outcome = await textTrustedContacts(message, { directOnly: true });
    return outcome.channel === 'direct' ? outcome.results.filter((r) => r.status !== 'failed').length : 0;
  },
  witnessText: (item, pieces) =>
    i18n.t('sos:bug.witness', {
      n: pieces,
      from: formatTimeIST(item.startedAt),
      to: formatTimeIST(item.endedAt),
      hash: item.recordSha256 ?? '',
    }),
  liveActivity: {
    start: async () => {
      await liveActivity?.liveActivityStart(i18n.t('sos:bug.activityTitle'), i18n.t('sos:bug.activityStarting'));
    },
    update: async (pieces) => {
      await liveActivity?.liveActivityUpdate(i18n.t('sos:bug.activityPieces', { count: pieces }));
    },
    end: async () => {
      await liveActivity?.liveActivityEnd();
    },
  },
  uploader: () => uploader,
  now: () => new Date(),
});

export function useBugMode(): BugState {
  return useSyncExternalStore(bugMode.subscribe, bugMode.getState);
}

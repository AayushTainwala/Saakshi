import SaakshiEvidence from '@native/saakshi-evidence';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { deviceSigner } from '../integrity/deviceKey';
import { appInfo, deviceInfo } from '../integrity/environment';
import { hashFile } from '../integrity/hash';
import { sha256Hex } from '../integrity/sha256';
import { fileLocker } from '../locker/store';
import type { EvidenceItem } from '../types';
import { type CopyDeps, makePlayableCopy } from './playableCopy';

const copyDeps: CopyDeps = {
  store: fileLocker,
  remux: async (input, output, rotation) => {
    if (!SaakshiEvidence) throw new Error('The SaakshiEvidence native module is not available in this build.');
    return SaakshiEvidence.remuxToMp4(input, output, rotation);
  },
  hash: hashFile,
  signer: deviceSigner(fileLocker),
  sha256Hex,
  newId: randomUUID,
  device: deviceInfo,
  app: appInfo,
  now: () => new Date(),
};

/** Android .ts videos are the originals; they are played and shared through an MP4 copy. */
export function needsCopy(item: EvidenceItem): boolean {
  return item.mediaType === 'video/mp2t';
}

async function playableUri(sessionId: string, item: EvidenceItem): Promise<{ uri: string; mimeType: string }> {
  if (needsCopy(item)) return { uri: await makePlayableCopy(copyDeps, sessionId, item.sequence), mimeType: 'video/mp4' };
  return { uri: fileLocker.mediaUri(sessionId, item.media), mimeType: item.mediaType };
}

/** Opens the video in the phone's player (Quick Look on iPhone; a player app on Android). */
export async function playVideo(sessionId: string, item: EvidenceItem, title: string): Promise<void> {
  const { uri, mimeType } = await playableUri(sessionId, item);
  const file = new File(uri);
  if (await file.canPreview({ mimeType })) await file.preview({ title, mimeType });
  else await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
}

/** Shares the original file, or (Android .ts videos) its MP4 copy. */
export async function shareVideo(
  sessionId: string,
  item: EvidenceItem,
  which: 'original' | 'copy',
  dialogTitle: string,
): Promise<void> {
  if (which === 'copy') {
    const { uri } = await playableUri(sessionId, item);
    await Sharing.shareAsync(uri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle });
    return;
  }
  await Sharing.shareAsync(fileLocker.mediaUri(sessionId, item.media), { mimeType: item.mediaType, dialogTitle });
}

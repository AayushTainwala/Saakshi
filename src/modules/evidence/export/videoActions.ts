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
import { type JoinDeps, makeJoinedCopy } from './joinedCopy';
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

/** The file to play: the original, or (Android .ts videos) its MP4 copy, made the first time. */
export async function playableUri(sessionId: string, item: EvidenceItem): Promise<{ uri: string; mimeType: string }> {
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

const UTI: Record<string, string> = {
  'video/mp4': 'public.mpeg-4',
  'video/quicktime': 'com.apple.quicktime-movie',
  'image/jpeg': 'public.jpeg',
  'image/heic': 'public.heic',
  'audio/aac': 'public.aac-audio',
  'audio/mp4': 'public.mpeg-4-audio',
};

/**
 * Shares a file through the phone's share sheet, to WhatsApp, Mail and so on (fix round 1, group 9):
 * the original, or for an Android MPEG-TS video its MP4 copy, which plays everywhere. The original
 * stays in the locker and goes in the bundle.
 */
export async function shareFile(sessionId: string, item: EvidenceItem, dialogTitle: string): Promise<void> {
  const { uri, mimeType } = await playableUri(sessionId, item);
  await Sharing.shareAsync(uri, { mimeType, ...(UTI[mimeType] ? { UTI: UTI[mimeType] } : {}), dialogTitle });
}

/**
 * Shares a file from a session's folder as it is, for a file with no signed record of its own
 * (repair round A, group 1): one found when a recording's index was made again, or in a recording
 * whose index is damaged. No copy is made, and nothing is written.
 */
export async function shareOriginal(uri: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(uri, { dialogTitle });
}

const joinDeps: JoinDeps = {
  store: fileLocker,
  join: async (request) => {
    if (!SaakshiEvidence) throw new Error('The SaakshiEvidence native module is not available in this build.');
    return SaakshiEvidence.joinToMp4(request);
  },
  hash: hashFile,
  signer: deviceSigner(fileLocker),
  sha256Hex,
  newId: randomUUID,
  device: deviceInfo,
  app: appInfo,
  now: () => new Date(),
};

/** Shares a record's files joined into one MP4 copy (made the first time; fix round 1, group 3). */
export async function shareJoinedCopy(sessionId: string, dialogTitle: string): Promise<void> {
  const uri = await makeJoinedCopy(joinDeps, sessionId);
  await Sharing.shareAsync(uri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle });
}

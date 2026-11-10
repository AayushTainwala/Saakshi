import * as SMS from 'expo-sms';

import { lastLink } from '../capture/pipeline';
import type { EvidenceRecord } from '../integrity/record';
import { fileLocker } from '../locker/store';
import { summarize } from '../locker/summary';
import { fileLabels, recordName } from '../naming';
import type { EvidenceItem, MediaKind, SessionState, WitnessEntry } from '../types';
import { type WitnessLabels, witnessMessage } from './message';

export class SmsUnavailableError extends Error {}

/**
 * Opens the phone's SMS app with the witness message for a session (format v1), with the given
 * recipients filled in. The user taps Send. The attempt is noted in the session, with what the
 * phone reported.
 */
export async function sendWitnessMessage(
  sessionId: string,
  labels: WitnessLabels & { kindWord: (kind: MediaKind) => string },
  recipients: string[] = [],
): Promise<WitnessEntry> {
  if (!(await SMS.isAvailableAsync())) throw new SmsUnavailableError('SMS is not available on this device');
  const session = fileLocker.readSession(sessionId);
  if (!session) throw new Error('No such session');
  const message = buildWitnessMessage(session, labels, (item) => {
    return JSON.parse(fileLocker.readRecordText(sessionId, item.record!.file)) as EvidenceRecord;
  });

  const { result } = await SMS.sendSMSAsync(recipients, message.text);
  const entry: WitnessEntry = {
    sentAt: new Date().toISOString(),
    chainHead: message.chainHead,
    recipients: recipients.length,
    result,
  };
  const latest = fileLocker.readSession(sessionId) ?? session;
  fileLocker.writeSession({ ...latest, witness: [...latest.witness, entry] });
  return entry;
}

/** The message for a session: its sealed files, named and fingerprinted, under the chain head. */
export function buildWitnessMessage(
  session: SessionState,
  labels: WitnessLabels & { kindWord: (kind: MediaKind) => string },
  readRecord: (item: EvidenceItem) => EvidenceRecord,
): { text: string; chainHead: string } {
  const sealed = session.items
    .filter((item) => item.status === 'sealed' && item.record && item.recordSha256 && item.digests)
    .sort((a, b) => a.sequence - b.sequence);
  if (!sealed.length) throw new Error('Nothing in this session has been sealed yet');
  const records = sealed.map((item) => ({ item, record: readRecord(item) }));
  // The head of the whole chain, which may be a checkpoint signed after the last file (format 0.5).
  const chainHead = lastLink(session)?.recordSha256 ?? sealed[sealed.length - 1].recordSha256!;
  const names = fileLabels(sealed, labels.kindWord);
  const summary = summarize(session, (item) => records.find((r) => r.item.sequence === item.sequence)?.record.capture.mode ?? null);
  const text = witnessMessage(
    {
      recordName: recordName(summary),
      sessionId: session.id,
      startedAt: records.reduce((a, r) => (Date.parse(r.record.capture.startedAt) < Date.parse(a) ? r.record.capture.startedAt : a), records[0].record.capture.startedAt),
      endedAt: records.reduce((a, r) => (Date.parse(r.record.capture.endedAt) > Date.parse(a) ? r.record.capture.endedAt : a), records[0].record.capture.endedAt),
      files: records.map(({ item, record }) => ({ label: names.get(item.sequence)!, sha256: record.file.sha256 })),
      chainHead,
      place: records.map((r) => r.record).find((r) => r.location) ?? null,
      app: records[records.length - 1].record.app,
    },
    labels,
  );
  return { text, chainHead };
}

import * as SMS from 'expo-sms';

import { lastLink } from '../capture/pipeline';
import type { EvidenceRecord } from '../integrity/record';
import { fileLocker } from '../locker/store';
import type { WitnessEntry } from '../types';
import { type WitnessLabels, witnessMessage } from './message';

export class SmsUnavailableError extends Error {}

/**
 * Opens the phone's SMS app with the witness message for a session. The user chooses or confirms
 * the recipients and taps Send. The attempt is noted in the session, with what the phone reported.
 */
export async function sendWitnessMessage(
  sessionId: string,
  labels: WitnessLabels,
  recipients: string[] = [],
): Promise<WitnessEntry> {
  if (!(await SMS.isAvailableAsync())) throw new SmsUnavailableError('SMS is not available on this device');
  const session = fileLocker.readSession(sessionId);
  if (!session) throw new Error('No such session');

  const sealed = session.items.filter((item) => item.status === 'sealed' && item.record && item.recordSha256);
  const last = sealed[sealed.length - 1];
  if (!last) throw new Error('Nothing in this session has been sealed yet');
  const record = JSON.parse(fileLocker.readRecordText(sessionId, last.record!.file)) as EvidenceRecord;
  // The head of the whole chain, which may be a checkpoint signed after the last file (format 0.5).
  const head = lastLink(session)?.recordSha256 ?? last.recordSha256!;

  const { result } = await SMS.sendSMSAsync(recipients, witnessMessage(head, record, labels));
  const entry: WitnessEntry = {
    sentAt: new Date().toISOString(),
    chainHead: head,
    recipients: recipients.length,
    result,
  };
  const latest = fileLocker.readSession(sessionId) ?? session;
  fileLocker.writeSession({ ...latest, witness: [...latest.witness, entry] });
  return entry;
}

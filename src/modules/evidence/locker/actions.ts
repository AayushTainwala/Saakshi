import { File } from 'expo-file-system';

import { hashFile } from '../integrity/hash';
import { sha256Hex } from '../integrity/sha256';
import type { SessionState } from '../types';
import { checkSession, type CheckInput } from './check';
import { fileLocker } from './store';

/** Re-hashes every sealed file in a session and checks it against its record and the chain. */
export async function runCheck(id: string): Promise<NonNullable<SessionState['lastCheck']>> {
  const session = fileLocker.readSession(id);
  if (!session) throw new Error('No such session');

  const inputs: CheckInput[] = [];
  for (const item of session.items) {
    if (item.status !== 'sealed' || !item.record) continue;
    const body = fileLocker.readRecordText(id, item.record.file);
    const media = new File(fileLocker.mediaUri(id, item.media));
    const file = media.exists ? await hashFile(media.uri) : null;
    inputs.push({
      sequence: item.sequence,
      body,
      bodySha256: await sha256Hex(body),
      sealedRecordSha256: item.recordSha256,
      file,
    });
  }

  const problems = checkSession(inputs);
  const lastCheck = { at: new Date().toISOString(), ok: problems.length === 0, problems };
  const latest = fileLocker.readSession(id) ?? session;
  fileLocker.writeSession({ ...latest, lastCheck });
  return lastCheck;
}

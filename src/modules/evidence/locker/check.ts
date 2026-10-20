import type { EvidenceRecord } from '../integrity/record';

export type CheckInput = {
  sequence: number;
  /** The record file's text, exactly as stored. */
  body: string;
  /** SHA-256 of `body`, computed now. */
  bodySha256: string;
  /** SHA-256 of the record as noted by the locker when it was sealed. */
  sealedRecordSha256: string | undefined;
  /** The media file as hashed now, or null if it is missing. */
  file: { size: number; sha256: string } | null;
};

export type CheckProblem = {
  sequence: number;
  problem: 'file-missing' | 'file-changed' | 'record-changed' | 'record-unreadable' | 'chain-broken' | 'sequence-gap';
};

/**
 * Checks a session's files and records on the phone: each file still matches its record, each
 * record is the one sealed, and the chain is unbroken (docs/spec/evidence-bundle.md, section 10,
 * steps 4 and 5). Signatures are checked off the phone, with openssl or tools/verify-bundle.mjs.
 */
export function checkSession(inputs: readonly CheckInput[]): CheckProblem[] {
  const problems: CheckProblem[] = [];
  const sorted = [...inputs].sort((a, b) => a.sequence - b.sequence);
  let previous: { record: EvidenceRecord; bodySha256: string } | null = null;

  sorted.forEach((input, index) => {
    const { sequence } = input;
    let record: EvidenceRecord;
    try {
      record = JSON.parse(input.body) as EvidenceRecord;
    } catch {
      problems.push({ sequence, problem: 'record-unreadable' });
      previous = null;
      return;
    }

    if (record.sequence !== index) problems.push({ sequence, problem: 'sequence-gap' });
    if (input.sealedRecordSha256 && input.sealedRecordSha256 !== input.bodySha256) {
      problems.push({ sequence, problem: 'record-changed' });
    }
    if (!input.file) {
      problems.push({ sequence, problem: 'file-missing' });
    } else if (input.file.sha256 !== record.file.sha256 || input.file.size !== record.file.size) {
      problems.push({ sequence, problem: 'file-changed' });
    }

    const expected = previous
      ? { id: previous.record.id, recordSha256: previous.bodySha256, fileSha256: previous.record.file.sha256 }
      : null;
    const actual = record.previous;
    const linked =
      expected === null
        ? actual === null
        : actual !== null &&
          actual.id === expected.id &&
          actual.recordSha256 === expected.recordSha256 &&
          actual.fileSha256 === expected.fileSha256;
    if (!linked) problems.push({ sequence, problem: 'chain-broken' });

    previous = { record, bodySha256: input.bodySha256 };
  });

  return problems;
}

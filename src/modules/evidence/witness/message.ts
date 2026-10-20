import { formatPlace } from '../export/contents';
import type { EvidenceRecord } from '../integrity/record';
import { formatIST } from '../ui/format';

export type WitnessLabels = {
  title: string;
  time: string;
  place: string;
  noPlace: string;
};

/**
 * The witness SMS (docs/spec/evidence-bundle.md, section 9): the chain head, and the time and place
 * of the last file. Labels follow the app's language; the hash and numbers never change.
 */
export function witnessMessage(chainHead: string, last: EvidenceRecord, labels: WitnessLabels): string {
  const place = last.location ? formatPlace(last) : labels.noPlace;
  return [
    labels.title,
    `SHA-256: ${chainHead}`,
    `${labels.time}: ${formatIST(last.capture.endedAt)}`,
    `${labels.place}: ${place}`,
  ].join('\n');
}

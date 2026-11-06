import { fileLabels, stampIST } from '../naming';
import type { CheckpointItem, EvidenceItem } from '../types';

/**
 * Names inside a bundle (format 0.8, fix round 1, group 9): folders and files a person can read.
 * Before 0.8 the originals were in `media/` and the records in `records/`, under the app's own
 * file names; those names are still in each signed record (`file.name`) and in the manifest.
 */
export const MEDIA_FOLDER = 'Original files';
export const RECORDS_FOLDER = 'Signed records';
export const HASH_REPORT_NAME = 'Hash report.txt';
export const CERTIFICATE_NAME = 'Certificate Part A.pdf';
export const README_NAME = 'README.txt';

const extension = (name: string) => /\.[^./]+$/.exec(name)?.[0] ?? '';
const number = (sequence: number) => String(sequence).padStart(4, '0');

export type BundlePaths = {
  /** Each sealed file's original, by sequence: "Original files/2026-11-05 10-40-12 IST video 1.mp4". */
  media: Map<number, string>;
  /**
   * Each record, files' and checkpoints', by sequence: "Signed records/0003 video 1.json",
   * "Signed records/0001 video 1 checkpoint 0.json". Its signature is the same name plus ".sig".
   * The number is the record's place in the chain, so the folder lists them in chain order.
   */
  records: Map<number, string>;
};

/**
 * Where a session's sealed files and records go in its bundle. A file is named by when it started
 * (IST) and which of its kind it is, as the witness message names it ("video 1"); a checkpoint, by
 * the file it belongs to and its number in that file.
 */
export function bundlePaths(
  files: readonly Pick<EvidenceItem, 'sequence' | 'kind' | 'media' | 'startedAt' | 'recording'>[],
  checkpoints: readonly Pick<CheckpointItem, 'sequence' | 'recording' | 'index'>[],
): BundlePaths {
  const labels = fileLabels(files);
  const media = new Map<number, string>();
  const records = new Map<number, string>();
  const labelOfRecording = new Map<string, string>();
  for (const file of files) {
    const label = labels.get(file.sequence)!;
    media.set(file.sequence, `${MEDIA_FOLDER}/${stampIST(file.startedAt, true)} IST ${label}${extension(file.media)}`);
    records.set(file.sequence, `${RECORDS_FOLDER}/${number(file.sequence)} ${label}.json`);
    if (file.recording) labelOfRecording.set(file.recording, label);
  }
  for (const checkpoint of checkpoints) {
    const label = labelOfRecording.get(checkpoint.recording);
    records.set(
      checkpoint.sequence,
      `${RECORDS_FOLDER}/${number(checkpoint.sequence)} ${label ? `${label} ` : ''}checkpoint ${checkpoint.index}.json`,
    );
  }
  return { media, records };
}

import type { DeviceKeyFile } from '../integrity/deviceKey';
import type { AppInfo } from '../integrity/record';
import { loadCheckpoints, loadSealed } from '../locker/records';
import type { LockerStore } from '../locker/store';
import { buildManifest, bundleFileName, bundleRecordName, hashReport } from './contents';
import { CERTIFICATE_NAME, HASH_REPORT_NAME, README_NAME } from './layout';
import { readme } from './readme';

/** One file of a bundle: its path in the bundle, and its bytes or the original it is copied from. */
export type PlannedEntry =
  | { name: string; bytes: Uint8Array }
  | { name: string; media: { file: string; size: number; crc32: number; modified: Date } };

/**
 * What a session's bundle holds, and under which names (docs/spec/evidence-bundle.md, section 7):
 * README.txt, the hash report and the certificate first, then the original files and the signed
 * records in chain order, then the manifest and the device key.
 */
export function planBundle(input: {
  store: LockerStore;
  id: string;
  key: DeviceKeyFile;
  now: Date;
  app: AppInfo;
  /** The certificate PDF, if the user has made one. */
  certificate: Uint8Array | null;
}): { fileName: string; name: string; entries: PlannedEntry[] } {
  const { store, id, key, now, app, certificate } = input;
  const session = store.readSession(id);
  if (!session) throw new Error('No such session');
  const encode = (text: string) => new TextEncoder().encode(text);

  const sealed = loadSealed(store, id);
  if (!sealed.length) throw new Error('Nothing in this session has been sealed yet');
  const records = sealed.map((entry) => entry.bundled);
  const checkpointEntries = loadCheckpoints(store, id);
  const checkpoints = checkpointEntries.map((entry) => entry.bundled);
  const modeOf = new Map(records.map((r) => [r.record.sequence, r.record.capture.mode]));
  const recordMode = (item: { sequence: number }) => modeOf.get(item.sequence) ?? null;
  const name = bundleRecordName(session, recordMode);
  const fileName = bundleFileName(session, recordMode);

  const body: PlannedEntry[] = [];
  for (const { item, body: text, bundled } of sealed) {
    const { record, recordPath, mediaPath } = bundled;
    body.push(
      { name: mediaPath, media: { file: item.media, size: record.file.size, crc32: item.digests!.crc32, modified: new Date(record.capture.endedAt) } },
      { name: recordPath, bytes: encode(text) },
      { name: `${recordPath}.sig`, bytes: store.readRecordBytes(id, `${bundled.recordFile}.sig`) },
    );
  }
  // Checkpoints signed while body-cam and bug-mode files were being written (format 0.5).
  for (const { body: text, bundled } of checkpointEntries) {
    body.push(
      { name: bundled.recordPath, bytes: encode(text) },
      { name: `${bundled.recordPath}.sig`, bytes: store.readRecordBytes(id, `${bundled.recordFile}.sig`) },
    );
  }
  // In chain order, as a folder lists them.
  body.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const manifest = buildManifest(session, records, now, app, !!certificate, checkpoints, name);
  const report = hashReport(session, records, key, now, session.items.length - sealed.length, checkpoints, name);
  const guide = readme({ name, fileName, exampleRecord: records[0].recordPath, exampleMedia: records[0].mediaPath });

  return {
    fileName,
    name,
    entries: [
      { name: README_NAME, bytes: encode(guide) },
      { name: HASH_REPORT_NAME, bytes: encode(report) },
      ...(certificate ? [{ name: CERTIFICATE_NAME, bytes: certificate }] : []),
      ...body,
      { name: 'manifest.json', bytes: encode(JSON.stringify(manifest, null, 2)) },
      { name: 'device-key.json', bytes: encode(JSON.stringify(key, null, 2)) },
    ],
  };
}

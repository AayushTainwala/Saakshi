import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { attestIfNeeded } from '../integrity/deviceKey';
import { appInfo } from '../integrity/environment';
import { loadSealed } from '../locker/records';
import { fileLocker } from '../locker/store';
import {
  type BundledRecord,
  buildManifest,
  bundleFileName,
  CERTIFICATE_FILE,
  hashReport,
  README,
} from './contents';
import { bytesEntry, type ZipEntry, writeZip } from './zip';

const CHUNK = 1 << 20;

function fileEntry(name: string, file: File, size: number, crc32: number, modified: Date): ZipEntry {
  return {
    name,
    size,
    crc32,
    modified,
    writeTo: async (sink) => {
      const handle = file.open(FileMode.ReadOnly);
      try {
        for (;;) {
          const chunk = await handle.readBytes(CHUNK);
          if (chunk.length === 0) break;
          await sink.write(chunk);
        }
      } finally {
        handle.close();
      }
    },
  };
}

/**
 * Writes a session's bundle (docs/spec/evidence-bundle.md, section 7) to the cache and returns its
 * URI. Media files are copied through in chunks with the CRC-32 computed when they were captured.
 */
export async function writeBundle(id: string): Promise<string> {
  const session = fileLocker.readSession(id);
  if (!session) throw new Error('No such session');
  const key = await attestIfNeeded(fileLocker);
  const now = new Date();
  const encode = (text: string) => new TextEncoder().encode(text);

  const sealed = loadSealed(fileLocker, id);
  const records: BundledRecord[] = sealed.map((entry) => entry.bundled);
  const entries: ZipEntry[] = [];

  for (const { item, body, bundled } of sealed) {
    const { record, recordFile } = bundled;
    const media = new File(fileLocker.mediaUri(id, item.media));
    if (!media.exists || media.size !== record.file.size) {
      throw new Error(`${item.media} is missing or has changed size; run Check files.`);
    }
    entries.push(
      fileEntry(`media/${item.media}`, media, record.file.size, item.digests!.crc32, new Date(record.capture.endedAt)),
      bytesEntry(`records/${recordFile}`, encode(body), now),
      bytesEntry(`records/${recordFile}.sig`, fileLocker.readRecordBytes(id, `${recordFile}.sig`), now),
    );
  }

  const certificate = new File(fileLocker.sessionFileUri(id, CERTIFICATE_FILE));
  const hasCertificate = !!session.certificate && certificate.exists;
  const manifest = buildManifest(session, records, now, appInfo(), hasCertificate);
  const report = hashReport(session, records, key, now, session.items.length - sealed.length);

  const head: ZipEntry[] = [
    bytesEntry('manifest.json', encode(JSON.stringify(manifest, null, 2)), now),
    bytesEntry('device-key.json', encode(JSON.stringify(key, null, 2)), now),
  ];
  const tail: ZipEntry[] = [
    bytesEntry('hash-report.txt', encode(report), now),
    bytesEntry('README.txt', encode(README), now),
  ];
  if (hasCertificate) tail.push(bytesEntry(CERTIFICATE_FILE, certificate.bytesSync(), now));

  const exports = new Directory(Paths.cache, 'exports');
  if (exports.exists) exports.delete();
  exports.create({ intermediates: true });
  const output = new File(exports, bundleFileName(session));
  output.create();
  const handle = output.open(FileMode.ReadWrite);
  try {
    await writeZip({ write: (bytes) => handle.writeBytes(bytes) }, [...head, ...entries, ...tail]);
  } finally {
    handle.close();
  }
  return output.uri;
}

/** Builds the bundle and opens the share sheet with it. */
export async function shareBundle(id: string, dialogTitle: string): Promise<void> {
  const uri = await writeBundle(id);
  await Sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle });
}

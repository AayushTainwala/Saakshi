import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { attestIfNeeded } from '../integrity/deviceKey';
import { appInfo } from '../integrity/environment';
import { hashFile } from '../integrity/hash';
import { isActive, whileBusy } from '../locker/active';
import { fileLocker } from '../locker/store';
import { CERTIFICATE_FILE } from './contents';
import { fillMissingCrc } from './crc';
import { planBundle } from './plan';
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

/** Where a bundle is written: bytes in order, then closed. */
export type BundleOutput = { write: (bytes: Uint8Array) => Promise<void>; close: () => void };

/**
 * Writes a session's bundle (docs/spec/evidence-bundle.md, section 7) to the output `open` gives
 * for its file name, and returns that name. Media files are copied through in chunks with the
 * CRC-32 computed when they were captured.
 */
export async function writeBundleTo(id: string, open: (fileName: string) => BundleOutput | Promise<BundleOutput>): Promise<string> {
  // A record still being recorded or sealed would give a bundle without its last file.
  if (isActive(id)) throw new BundleBusyError('This record is still being recorded or sealed.');
  // It can't be deleted while its files are read.
  return whileBusy(id, () => write(id, open));
}

/** The record is still being recorded or sealed. */
export class BundleBusyError extends Error {}

async function write(id: string, open: (fileName: string) => BundleOutput | Promise<BundleOutput>): Promise<string> {
  // Bookkeeping made again from the signed records has no CRC-32s for the ZIP (crc.ts).
  await fillMissingCrc(fileLocker, hashFile, id);
  const session = fileLocker.readSession(id);
  if (!session) throw new Error('No such session');
  // On iPhone, the present key's App Attest binding is tried again before a bundle is made. The
  // bundle carries the key that signed this recording, which the plan takes from the records.
  await attestIfNeeded(fileLocker);
  const now = new Date();
  const certificate = new File(fileLocker.sessionFileUri(id, CERTIFICATE_FILE));
  const plan = planBundle({
    store: fileLocker,
    id,
    now,
    app: appInfo(),
    certificate: session.certificate && certificate.exists ? certificate.bytesSync() : null,
  });

  const entries: ZipEntry[] = plan.entries.map((entry) => {
    if ('bytes' in entry) return bytesEntry(entry.name, entry.bytes, now);
    const media = new File(fileLocker.mediaUri(id, entry.media.file));
    if (!media.exists || media.size !== entry.media.size) {
      throw new Error(`${entry.media.file} is missing or has changed size; run Check files.`);
    }
    return fileEntry(entry.name, media, entry.media.size, entry.media.crc32, entry.media.modified);
  });

  const output = await open(plan.fileName);
  try {
    await writeZip(output, entries);
  } finally {
    output.close();
  }
  return plan.fileName;
}

/** Where a session's bundle is made in the cache: its own folder, so one export never removes another's. */
export function exportCacheFor(id: string): Directory {
  return new Directory(Paths.cache, 'exports', id);
}

/** Writes a session's bundle to the cache; returns its URI and its file name. */
export async function writeBundle(id: string): Promise<{ uri: string; fileName: string }> {
  const exports = exportCacheFor(id);
  if (exports.exists) exports.delete();
  exports.create({ intermediates: true });
  let uri = '';
  const fileName = await writeBundleTo(id, (name) => {
    const file = new File(exports, name);
    file.create();
    uri = file.uri;
    const handle = file.open(FileMode.ReadWrite);
    return { write: (bytes) => handle.writeBytes(bytes), close: () => handle.close() };
  });
  return { uri, fileName };
}

/** Builds the bundle and opens the share sheet with it. */
export async function shareBundle(id: string, dialogTitle: string): Promise<void> {
  const { uri } = await writeBundle(id);
  await Sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle });
}

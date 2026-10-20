/**
 * A streaming ZIP writer for evidence bundles. Entries are stored without compression (method 0)
 * with their CRC-32 and size known up front, so a large video is copied through in chunks and never
 * read twice. ZIP64 records are added when an entry, an offset or the entry count passes the
 * classic ZIP limits (APPNOTE.TXT 6.3.x, sections 4.3 and 4.5.3).
 */

export interface ByteSink {
  write(bytes: Uint8Array): Promise<void>;
}

export type ZipEntry = {
  /** Path inside the archive, with forward slashes. */
  name: string;
  size: number;
  crc32: number;
  modified: Date;
  /** Writes exactly `size` bytes of the entry's content to the sink. */
  writeTo: (sink: ByteSink) => Promise<void>;
};

const MAX16 = 0xffff;
const MAX32 = 0xffffffff;
const UTF8_NAMES = 0x0800;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE), as ZIP uses. Pass the previous result to continue over several chunks. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  let c = (previous ^ MAX32) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ MAX32) >>> 0;
}

/** An entry whose content is already in memory. */
export function bytesEntry(name: string, bytes: Uint8Array, modified: Date): ZipEntry {
  return { name, size: bytes.length, crc32: crc32(bytes), modified, writeTo: (sink) => sink.write(bytes) };
}

class Writer {
  private bytes: Uint8Array;
  private view: DataView;
  private at = 0;

  constructor(size: number) {
    this.bytes = new Uint8Array(size);
    this.view = new DataView(this.bytes.buffer);
  }

  u16(value: number) {
    this.view.setUint16(this.at, value, true);
    this.at += 2;
    return this;
  }

  u32(value: number) {
    this.view.setUint32(this.at, value >>> 0, true);
    this.at += 4;
    return this;
  }

  u64(value: number) {
    this.view.setUint32(this.at, value % 0x100000000, true);
    this.view.setUint32(this.at + 4, Math.floor(value / 0x100000000), true);
    this.at += 8;
    return this;
  }

  raw(bytes: Uint8Array) {
    this.bytes.set(bytes, this.at);
    this.at += bytes.length;
    return this;
  }

  done(): Uint8Array {
    if (this.at !== this.bytes.length) throw new Error('ZIP header size mismatch');
    return this.bytes;
  }
}

/** MS-DOS date and time fields, in the phone's local time as ZIP has no time zone. */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

type Written = { entry: ZipEntry; name: Uint8Array; offset: number; zip64: boolean };

export async function writeZip(
  sink: ByteSink,
  entries: readonly ZipEntry[],
  options: { forceZip64?: boolean } = {},
): Promise<{ size: number }> {
  const encoder = new TextEncoder();
  const written: Written[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const zip64 = !!options.forceZip64 || entry.size >= MAX32 || offset >= MAX32;
    const { time, date } = dosDateTime(entry.modified);
    const extra = zip64 ? 20 : 0;
    const header = new Writer(30 + name.length + extra)
      .u32(0x04034b50)
      .u16(zip64 ? 45 : 20)
      .u16(UTF8_NAMES)
      .u16(0)
      .u16(time)
      .u16(date)
      .u32(entry.crc32)
      .u32(zip64 ? MAX32 : entry.size)
      .u32(zip64 ? MAX32 : entry.size)
      .u16(name.length)
      .u16(extra)
      .raw(name);
    if (zip64) header.u16(0x0001).u16(16).u64(entry.size).u64(entry.size);
    await sink.write(header.done());

    let copied = 0;
    await entry.writeTo({
      write: async (chunk) => {
        copied += chunk.length;
        await sink.write(chunk);
      },
    });
    if (copied !== entry.size) {
      throw new Error(`${entry.name}: wrote ${copied} bytes, expected ${entry.size}`);
    }

    written.push({ entry, name, offset, zip64 });
    offset += 30 + name.length + extra + entry.size;
  }

  const directoryOffset = offset;
  let directorySize = 0;
  for (const { entry, name, offset: localOffset, zip64 } of written) {
    const bigOffset = !!options.forceZip64 || localOffset >= MAX32;
    const fields = (zip64 ? 2 : 0) + (bigOffset ? 1 : 0);
    const extra = fields ? 4 + fields * 8 : 0;
    const { time, date } = dosDateTime(entry.modified);
    const header = new Writer(46 + name.length + extra)
      .u32(0x02014b50)
      .u16(45)
      .u16(zip64 || bigOffset ? 45 : 20)
      .u16(UTF8_NAMES)
      .u16(0)
      .u16(time)
      .u16(date)
      .u32(entry.crc32)
      .u32(zip64 ? MAX32 : entry.size)
      .u32(zip64 ? MAX32 : entry.size)
      .u16(name.length)
      .u16(extra)
      .u16(0)
      .u16(0)
      .u16(0)
      .u32(0)
      .u32(bigOffset ? MAX32 : localOffset)
      .raw(name);
    if (fields) {
      header.u16(0x0001).u16(fields * 8);
      if (zip64) header.u64(entry.size).u64(entry.size);
      if (bigOffset) header.u64(localOffset);
    }
    const bytes = header.done();
    await sink.write(bytes);
    directorySize += bytes.length;
  }

  const count = written.length;
  const needZip64 =
    !!options.forceZip64 || count >= MAX16 || directoryOffset >= MAX32 || directorySize >= MAX32;
  let end = directoryOffset + directorySize;

  if (needZip64) {
    const record = new Writer(56)
      .u32(0x06064b50)
      .u64(44)
      .u16(45)
      .u16(45)
      .u32(0)
      .u32(0)
      .u64(count)
      .u64(count)
      .u64(directorySize)
      .u64(directoryOffset)
      .done();
    const locator = new Writer(20).u32(0x07064b50).u32(0).u64(end).u32(1).done();
    await sink.write(record);
    await sink.write(locator);
    end += record.length + locator.length;
  }

  const eocd = new Writer(22)
    .u32(0x06054b50)
    .u16(0)
    .u16(0)
    .u16(needZip64 ? MAX16 : count)
    .u16(needZip64 ? MAX16 : count)
    .u32(needZip64 ? MAX32 : directorySize)
    .u32(needZip64 ? MAX32 : directoryOffset)
    .u16(0)
    .done();
  await sink.write(eocd);
  return { size: end + eocd.length };
}

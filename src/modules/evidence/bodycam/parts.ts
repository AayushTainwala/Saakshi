/**
 * Upload parts (fix round 1, group 2a; the upload itself is E7's). Parts exist only to get footage
 * off the phone while it is being recorded. Each is a byte range of the one continuous file,
 * starting where the last ended and ending on a signed checkpoint, about `partSeconds` long. So:
 * - joined in order, the parts are the file byte for byte;
 * - the bytes up to the end of any part have the SHA-256 its checkpoint signed (the last part ends
 *   at the file's own end, which its record signs).
 * No bytes are copied: a part names a range of the original, which the uploader reads.
 */
export type UploadPart = {
  recording: string;
  /** The part's number in its file, from 0. */
  index: number;
  /** Where the file is being written. It moves into the session's locker when it closes. */
  uri: string;
  offset: number;
  length: number;
  /** Where the part ends: on a checkpoint (its number), or at the file's end (null). */
  endsAt: { checkpoint: number | null; bytes: number; sha256: string };
  /** The file's last part. */
  final: boolean;
};

export type PartCheckpoint = {
  recording: string;
  uri: string;
  checkpoint: number;
  bytes: number;
  sha256: string;
  at: Date;
  startedAt: Date;
};

type Open = { uri: string; index: number; offset: number; since: number };

let listener: ((part: UploadPart) => void) | null = null;

/** For E7: called with every part as soon as it can be uploaded. Null to stop. */
export function setBodyCamPartListener(next: ((part: UploadPart) => void) | null): void {
  listener = next;
}

/** Cuts each file being recorded into parts as its checkpoints arrive. */
export class PartPlanner {
  private files = new Map<string, Open>();

  constructor(
    /** About how long a part is (a setting, decided with E7). */
    private readonly partSeconds: () => number,
    private readonly onPart: (part: UploadPart) => void = (part) => listener?.(part),
  ) {}

  checkpoint(c: PartCheckpoint): void {
    const open = this.files.get(c.recording) ?? { uri: c.uri, index: 0, offset: 0, since: c.startedAt.getTime() };
    this.files.set(c.recording, open);
    if (c.bytes <= open.offset) return;
    if (c.at.getTime() - open.since < this.partSeconds() * 1000) return;
    this.onPart({
      recording: c.recording,
      index: open.index,
      uri: open.uri,
      offset: open.offset,
      length: c.bytes - open.offset,
      endsAt: { checkpoint: c.checkpoint, bytes: c.bytes, sha256: c.sha256 },
      final: false,
    });
    open.index++;
    open.offset = c.bytes;
    open.since = c.at.getTime();
  }

  /** The file has closed: what is left after the last part is the final part. */
  closed(c: { recording: string; uri: string; size: number; sha256: string }): void {
    const open = this.files.get(c.recording) ?? { uri: c.uri, index: 0, offset: 0, since: 0 };
    this.files.delete(c.recording);
    if (c.size <= open.offset) return;
    this.onPart({
      recording: c.recording,
      index: open.index,
      uri: c.uri,
      offset: open.offset,
      length: c.size - open.offset,
      endsAt: { checkpoint: null, bytes: c.size, sha256: c.sha256 },
      final: true,
    });
  }
}

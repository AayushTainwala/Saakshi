import type { LockerStore } from '../locker/store';
import { extensionOf, mediaFileName, mediaTypeFor } from '../locker/media';
import type { ClosedFile, EvidenceItem, FileDigests, SessionState } from '../types';

/** What the sealing step needs to write and sign a record for one file. */
export type SealInput = {
  session: SessionState;
  item: EvidenceItem;
  file: ClosedFile;
  digests: FileDigests;
  hashedAt: Date;
  /** The sealed item before this one in the session, or null for the first. */
  previous: EvidenceItem | null;
};

export type SealResult = { record: { file: string; recordId: string }; recordSha256: string };

export type PipelineDeps = {
  store: LockerStore;
  now: () => Date;
  newId: () => string;
  /** Streams the file once and returns its size and fingerprints. */
  hash?: (uri: string) => Promise<FileDigests>;
  /** Writes and signs the record. Needs `hash`. */
  seal?: (input: SealInput) => Promise<SealResult>;
};

/**
 * Takes each file as the camera closes it, in order, through: hash → move into the locker →
 * write and sign the record. Files are processed one at a time so that each record can chain
 * to the one before it, while the camera carries on recording the next segment.
 */
export class CaptureSession {
  private state: SessionState | null = null;
  private queue: Promise<void> = Promise.resolve();
  private waiting = 0;
  private clips = 0;
  private sequence = 0;
  private lastSealed: EvidenceItem | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly deps: PipelineDeps) {}

  get id(): string | null {
    return this.state?.id ?? null;
  }

  get pending(): number {
    return this.waiting;
  }

  get items(): readonly EvidenceItem[] {
    return this.state?.items ?? [];
  }

  /** Reserves the number of the next video in this session. */
  nextClip(): number {
    return this.clips++;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Queues a closed file. Resolves when it has been hashed, moved and sealed (or has failed). */
  add(file: ClosedFile): Promise<EvidenceItem> {
    const sequence = this.sequence++;
    this.waiting++;
    this.emit();
    const result = this.queue.then(() => this.process(file, sequence));
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result.finally(() => {
      this.waiting--;
      this.emit();
    });
  }

  /** Resolves once every queued file is done. */
  async drain(): Promise<void> {
    await this.queue;
  }

  private session(): SessionState {
    if (!this.state) {
      this.state = this.deps.store.createSession(this.deps.newId(), this.deps.now().toISOString());
    }
    return this.state;
  }

  private async process(file: ClosedFile, sequence: number): Promise<EvidenceItem> {
    const session = this.session();
    const extension = extensionOf(file.uri);
    const item: EvidenceItem = {
      sequence,
      kind: file.kind,
      segment: file.segment,
      media: mediaFileName(sequence, file.kind, file.segment, extension),
      mediaType: mediaTypeFor(extension, file.kind),
      startedAt: file.startedAt.toISOString(),
      endedAt: file.endedAt.toISOString(),
      status: 'saved',
    };

    try {
      if (!this.deps.hash) {
        this.deps.store.moveMedia(session.id, file.uri, item.media);
        this.commit(item);
        return item;
      }

      // Hash first, at the camera's own path, before anything else touches the file.
      const digests = await this.deps.hash(file.uri);
      const hashedAt = this.deps.now();
      item.digests = digests;
      item.status = 'hashed';
      const movedUri = this.deps.store.moveMedia(session.id, file.uri, item.media);
      this.commit(item);

      if (this.deps.seal) {
        const sealed = await this.deps.seal({
          session,
          item,
          file: { ...file, uri: movedUri },
          digests,
          hashedAt,
          previous: this.lastSealed,
        });
        item.record = sealed.record;
        item.recordSha256 = sealed.recordSha256;
        item.status = 'sealed';
        this.lastSealed = item;
      }
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
    }

    this.commit(item);
    return item;
  }

  /** Saves the item into session.json, replacing an earlier save of the same sequence number. */
  private commit(item: EvidenceItem): void {
    const session = this.session();
    const items = session.items.filter((existing) => existing.sequence !== item.sequence);
    items.push({ ...item });
    items.sort((a, b) => a.sequence - b.sequence);
    this.state = { ...session, items, updatedAt: this.deps.now().toISOString() };
    this.deps.store.writeSession(this.state);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

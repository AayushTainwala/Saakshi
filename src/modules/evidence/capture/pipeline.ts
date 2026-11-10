import type { ChainLink } from '../integrity/record';
import { markActive, markInactive } from '../locker/active';
import type { LockerStore } from '../locker/store';
import { extensionOf, mediaFileName, mediaTypeFor } from '../locker/media';
import type { CheckpointInput, CheckpointItem, ClosedFile, EvidenceItem, FileDigests, SessionState } from '../types';

/** What the sealing step needs to write and sign a record for one file. */
export type SealInput = {
  session: SessionState;
  item: EvidenceItem;
  file: ClosedFile;
  digests: FileDigests;
  hashedAt: Date;
  /** The record before this one in the session's chain, or null for the first. */
  previous: ChainLink | null;
};

/** What the sealing step needs for a checkpoint of a file still being written (format 0.5). */
export type CheckpointSealInput = {
  session: SessionState;
  sequence: number;
  checkpoint: CheckpointInput;
  previous: ChainLink | null;
};

export type SealResult = { record: { file: string; recordId: string }; recordSha256: string };

/** The session's last sealed record, file or checkpoint, as the next record's `previous`. */
export function lastLink(state: SessionState): ChainLink | null {
  let best: { sequence: number; link: ChainLink } | null = null;
  for (const item of state.items) {
    if (item.status !== 'sealed' || !item.record || !item.recordSha256 || !item.digests) continue;
    if (best && best.sequence > item.sequence) continue;
    best = { sequence: item.sequence, link: { id: item.record.recordId, recordSha256: item.recordSha256, fileSha256: item.digests.sha256 } };
  }
  for (const checkpoint of state.checkpoints ?? []) {
    if (checkpoint.status !== 'sealed' || !checkpoint.record || !checkpoint.recordSha256) continue;
    if (best && best.sequence > checkpoint.sequence) continue;
    best = {
      sequence: checkpoint.sequence,
      link: { id: checkpoint.record.recordId, recordSha256: checkpoint.recordSha256, fileSha256: checkpoint.sha256 },
    };
  }
  return best?.link ?? null;
}

/** The next free position in the session's chain. */
function nextSequence(state: SessionState): number {
  const all = [...state.items.map((i) => i.sequence), ...(state.checkpoints ?? []).map((c) => c.sequence)];
  return all.reduce((max, n) => Math.max(max, n + 1), 0);
}

export type PipelineDeps = {
  store: LockerStore;
  now: () => Date;
  newId: () => string;
  /** Streams the file once and returns its size and fingerprints. */
  hash?: (uri: string) => Promise<FileDigests>;
  /** Writes and signs the record. Needs `hash`. */
  seal?: (input: SealInput) => Promise<SealResult>;
  /** Writes and signs a checkpoint record (format 0.5). */
  sealCheckpoint?: (input: CheckpointSealInput) => Promise<SealResult>;
};

/**
 * Takes each file as the camera closes it, in order, through: hash → move into the locker →
 * write and sign the record. Files are processed one at a time so that each record can chain
 * to the one before it, while the camera carries on recording (body-cam and bug mode). Checkpoints
 * of files still being written (body-cam, format 0.5) go through the same queue, so the chain
 * holds files and checkpoints in the order they came.
 */
export class CaptureSession {
  private state: SessionState | null = null;
  private queue: Promise<void> = Promise.resolve();
  private waiting = 0;
  private clips = 0;
  private sequence = 0;
  private last: ChainLink | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly deps: PipelineDeps) {}

  /**
   * Picks up an existing session, for example to seal a file cut off by a crash: numbering and
   * the chain continue from its last sealed file.
   */
  static resume(deps: PipelineDeps, sessionId: string): CaptureSession {
    const state = deps.store.readSession(sessionId);
    if (!state) throw new Error('No such session');
    const session = new CaptureSession(deps);
    session.state = state;
    session.sequence = nextSequence(state);
    session.clips = state.items.reduce((max, item) => Math.max(max, (item.segment?.clip ?? -1) + 1), 0);
    session.last = lastLink(state);
    markActive(state.id);
    return session;
  }

  /** The session's state, creating the session if nothing has been recorded yet. */
  ensureSession(): SessionState {
    return this.session();
  }

  get id(): string | null {
    return this.state?.id ?? null;
  }

  get pending(): number {
    return this.waiting;
  }

  get items(): readonly EvidenceItem[] {
    return this.state?.items ?? [];
  }

  get checkpoints(): readonly CheckpointItem[] {
    return this.state?.checkpoints ?? [];
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
    this.waiting++;
    this.emit();
    // The position in the chain is taken when the file's turn comes, so files and checkpoints are
    // numbered in the order they are chained.
    const result = this.queue.then(() => this.process(file, this.sequence++));
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result.finally(() => {
      this.waiting--;
      this.emit();
    });
  }

  /**
   * Queues a checkpoint of a file still being written: a signed record of its length so far and
   * the SHA-256 of those bytes, chained after whatever came before it.
   */
  addCheckpoint(checkpoint: CheckpointInput): Promise<CheckpointItem> {
    const result = this.queue.then(() => this.processCheckpoint(checkpoint));
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Resolves once every queued file is done. */
  async drain(): Promise<void> {
    await this.queue;
  }

  /** Call when recording is over: waits for the queue, then lets the session be deleted. */
  async finish(): Promise<void> {
    await this.drain();
    if (this.state) markInactive(this.state.id);
  }

  private session(): SessionState {
    if (!this.state) {
      this.state = this.deps.store.createSession(this.deps.newId(), this.deps.now().toISOString());
      markActive(this.state.id);
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
      ...(file.interrupted ? { interrupted: true } : {}),
      ...(file.endReason ? { endReason: file.endReason } : {}),
      ...(file.recording ? { recording: file.recording } : {}),
      ...(file.mode ? { mode: file.mode } : {}),
      ...(typeof file.rotationDegrees === 'number' ? { rotationDegrees: file.rotationDegrees } : {}),
    };
    const releaseMarker = () => {
      if (file.pendingMarker) this.deps.store.deletePending(session.id, file.pendingMarker);
    };

    try {
      if (!this.deps.hash) {
        this.deps.store.moveMedia(session.id, file.uri, item.media);
        releaseMarker();
        this.commit(item);
        return item;
      }

      // Hash first, at the camera's own path, before anything else touches the file.
      const digests = await this.deps.hash(file.uri);
      const hashedAt = this.deps.now();
      item.digests = digests;
      item.status = 'hashed';
      // The recorder fingerprinted every byte as it wrote them; the file must be exactly those bytes.
      if (file.written && (file.written.sha256 !== digests.sha256 || file.written.size !== digests.size)) {
        item.writtenMismatch = true;
      }
      const movedUri = this.deps.store.moveMedia(session.id, file.uri, item.media);
      this.commit(item);
      // From here the file is in the locker with its fingerprint noted; a crash now leaves a
      // hashed file that "Check files" and the next seal can account for.
      releaseMarker();

      if (this.deps.seal) {
        const sealed = await this.deps.seal({
          session,
          item,
          file: { ...file, uri: movedUri },
          digests,
          hashedAt,
          previous: this.last,
        });
        item.record = sealed.record;
        item.recordSha256 = sealed.recordSha256;
        item.status = 'sealed';
        this.last = { id: sealed.record.recordId, recordSha256: sealed.recordSha256, fileSha256: digests.sha256 };
      }
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
    }

    this.commit(item);
    return item;
  }

  private async processCheckpoint(checkpoint: CheckpointInput): Promise<CheckpointItem> {
    const session = this.session();
    const sequence = this.sequence++;
    const item: CheckpointItem = {
      sequence,
      recording: checkpoint.recording,
      index: checkpoint.index,
      bytes: checkpoint.bytes,
      sha256: checkpoint.sha256,
      at: checkpoint.at.toISOString(),
      status: 'failed',
      ...(checkpoint.mode ? { mode: checkpoint.mode } : {}),
    };
    try {
      if (!this.deps.sealCheckpoint) throw new Error('No checkpoint sealer');
      const sealed = await this.deps.sealCheckpoint({ session, sequence, checkpoint, previous: this.last });
      item.record = sealed.record;
      item.recordSha256 = sealed.recordSha256;
      item.status = 'sealed';
      this.last = { id: sealed.record.recordId, recordSha256: sealed.recordSha256, fileSha256: checkpoint.sha256 };
    } catch (error) {
      // An unsigned checkpoint is not kept, and gives its place in the chain back: the next one, a
      // few seconds later, vouches for these bytes too.
      this.sequence = sequence;
      item.error = error instanceof Error ? error.message : String(error);
      this.emit();
      return item;
    }
    const current = this.session();
    this.state = {
      ...current,
      checkpoints: [...(current.checkpoints ?? []).filter((c) => c.sequence !== sequence), item].sort(
        (a, b) => a.sequence - b.sequence,
      ),
      updatedAt: this.deps.now().toISOString(),
    };
    // One line added to the session's log, about every 10 seconds; session.json is rewritten only
    // when a file closes or something else changes (repair round A, group 1).
    this.deps.store.appendCheckpoint(current.id, item);
    this.emit();
    return item;
  }

  /**
   * Saves the item into session.json, replacing an earlier save of the same sequence number. The
   * whole of what this session holds in memory is written each time, so if session.json was lost
   * while recording, the next file to close puts it back.
   */
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

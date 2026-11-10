import type { CheckpointItem, SessionState, WitnessEntry } from '../types';
import { deviceFiles, join, type LockerFiles, TEMPORARY_SUFFIX } from './files';
import type { PendingMarker } from './pending';
import { INDEX_FILE, joinLog, LOG_FILE, logLine, parseIndex, parseLog, rebuildSession, unlistedRecords, withoutLogged } from './rebuild';

/**
 * The evidence locker on disk, inside the app's private documents directory:
 *
 *   evidence/keys/<key id>.json                   one file for each signing key this phone has had;
 *                                                  a key's file is never replaced by another key's
 *   evidence/key-change.json                      a new key waiting to be said in a signed record
 *   evidence/sessions/<session id>/session.json   the locker's bookkeeping (unsigned), replaced in
 *                                                  one step whenever it changes
 *   evidence/sessions/<session id>/session.log    the bookkeeping's checkpoints and witness
 *                                                  messages, one line each, only ever added to
 *   evidence/sessions/<session id>/media/…        original files, never modified
 *   evidence/sessions/<session id>/records/…      signed records (<n>.json and <n>.json.sig)
 *   evidence/sessions/<session id>/certificate-part-a.pdf
 *   evidence/sessions/<session id>/copies/…        playable MP4 copies of Android .ts videos, each
 *                                                  with its own signed record (<name>.json, .sig)
 */
export interface LockerStore {
  createSession(id: string, createdAt: string): SessionState;
  /**
   * A session's bookkeeping: session.json joined with its log. Null only if the session has no
   * folder. If session.json is missing or can't be read, the bookkeeping is made again from the
   * signed records (`rebuilt`), or, with none to go on, comes back as `damaged` (rebuild.ts).
   */
  readSession(id: string): SessionState | null;
  /** Replaces session.json in one step. What the log holds is left to the log. */
  writeSession(state: SessionState): void;
  /** Notes a signed checkpoint: one line added to the session's log, session.json untouched. */
  appendCheckpoint(sessionId: string, checkpoint: CheckpointItem): void;
  /** Notes a witness message, in the session's log. */
  appendWitness(sessionId: string, entry: WitnessEntry): void;
  /** Every session that has a folder, the rebuilt and the damaged included. */
  listSessions(): SessionState[];
  /**
   * Run when the app opens: removes what interrupted writes left behind, makes unreadable
   * bookkeeping again, and lists signed records the bookkeeping missed. Sessions `skip` names
   * (those being recorded) are left alone.
   */
  repair(options?: { skip?: (id: string) => boolean }): RepairReport;
  deleteSession(id: string): void;
  /** Moves a file the camera wrote into the session's media folder. Returns its new URI. */
  moveMedia(sessionId: string, sourceUri: string, name: string): string;
  mediaUri(sessionId: string, name: string): string;
  writeRecord(sessionId: string, name: string, body: string, signatureDer: Uint8Array): void;
  /** Reads a file in the session's records/ folder (a record or its .sig). */
  readRecordBytes(sessionId: string, name: string): Uint8Array;
  readRecordText(sessionId: string, name: string): string;
  recordUri(sessionId: string, name: string): string;
  sessionFileUri(sessionId: string, name: string): string;
  /** Where a playable copy lives (copies/<name>), as a file:// URI. */
  copyUri(sessionId: string, name: string): string;
  writeCopyRecord(sessionId: string, mediaName: string, body: string, signatureDer: Uint8Array): void;
  /** The session folder, as a file:// URI. */
  sessionDirUri(sessionId: string): string;
  listPending(sessionId: string): { name: string; marker: PendingMarker }[];
  writePending(sessionId: string, name: string, marker: PendingMarker): void;
  deletePending(sessionId: string, name: string): void;
  /**
   * A signing key's own file, `keys/<key id>.json` (repair round A, group 3), or null if this
   * phone has none for it. The old single `device-key.json` is moved there first, once.
   */
  readKeyJson(keyId: string): string | null;
  /** Writes one key's file, in one step. No other key's file is touched. */
  writeKeyJson(keyId: string, json: string): void;
  /** The ids of the keys that have a file. */
  listKeyIds(): string[];
  /** A new key waiting to be said in a signed record (integrity/deviceKey.ts), or null. */
  readKeyChange(): string | null;
  /** Notes it, or with null removes the note once it has been said. */
  writeKeyChange(json: string | null): void;
}

/** A key id: the SHA-256 of the public key, 64 lowercase hex characters. Also a safe file name. */
export const KEY_ID = /^[0-9a-f]{64}$/;

/** What `repair` did, by session id. */
export type RepairReport = { rebuilt: string[]; damaged: string[]; caughtUp: string[]; leftovers: number };

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

/** Increases whenever the locker changes; for `useSyncExternalStore`. */
export function lockerVersion(): number {
  return version;
}

/** Lets screens refresh when the locker changes. */
export function subscribeToLocker(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLockerChanged(): void {
  version++;
  for (const listener of listeners) listener();
}

/** The locker's logic over any set of files: the phone's (below), or the tests' in memory. */
export function createLocker(files: LockerFiles, now: () => Date = () => new Date()): LockerStore {
  const dirOf = (id: string) => files.sessionUri(id);

  function textOrNull(uri: string): string | null {
    try {
      return files.stat(uri) ? files.readText(uri) : null;
    } catch {
      return null;
    }
  }

  const logOf = (id: string) => parseLog(textOrNull(join(dirOf(id), LOG_FILE)));

  /** session.json for a state, in one step. Throws if it can't be written; the old file then stands. */
  function save(state: SessionState): void {
    if (state.damaged) throw new Error("This recording's index is damaged; it is not written back.");
    files.replaceText(join(dirOf(state.id), INDEX_FILE), JSON.stringify(withoutLogged(state, logOf(state.id))));
  }

  function rebuild(id: string): SessionState {
    const state = rebuildSession(files, id, now());
    if (!state.damaged) {
      try {
        save(state);
      } catch {
        // No room to save it, say. It is made again at the next read.
      }
    }
    return state;
  }

  function removeLeftovers(folderUri: string): number {
    let removed = 0;
    for (const entry of files.list(folderUri)) {
      if (entry.folder || !entry.name.endsWith(TEMPORARY_SUFFIX)) continue;
      try {
        files.remove(join(folderUri, entry.name));
        removed++;
      } catch {
        // It stays until the next time.
      }
    }
    return removed;
  }

  const keyUri = (keyId: string) => join(files.rootUri, 'keys', `${keyId}.json`);

  /**
   * Before repair round A, group 3, the phone kept one `device-key.json` and wrote each new key
   * over it. The first time anything asks for a key after the update, that file is moved to
   * `keys/<its key id>.json`. Nothing is deleted: if it can't be read, or a file for that key is
   * already there, it stays where it is.
   */
  function moveOldKeyFile(): void {
    const old = join(files.rootUri, 'device-key.json');
    try {
      if (!files.stat(old)) return;
      const keyId: unknown = (JSON.parse(files.readText(old)) as { keyId?: unknown }).keyId;
      if (typeof keyId !== 'string' || !KEY_ID.test(keyId) || files.stat(keyUri(keyId))) return;
      files.move(old, keyUri(keyId));
    } catch {
      // It stays where it is, and is tried again next time.
    }
  }

  const store: LockerStore = {
    createSession(id, createdAt) {
      const dir = dirOf(id);
      files.makeFolder(dir);
      files.makeFolder(join(dir, 'media'));
      files.makeFolder(join(dir, 'records'));
      const state: SessionState = {
        version: 1,
        id,
        createdAt,
        updatedAt: createdAt,
        items: [],
        witness: [],
        certificate: null,
      };
      store.writeSession(state);
      return state;
    },

    readSession(id) {
      if (!files.folderExists(dirOf(id))) return null;
      const base = parseIndex(textOrNull(join(dirOf(id), INDEX_FILE)), id);
      return base ? joinLog(base, logOf(id)) : rebuild(id);
    },

    writeSession(state) {
      save(state);
      notifyLockerChanged();
    },

    appendCheckpoint(sessionId, checkpoint) {
      files.appendText(join(dirOf(sessionId), LOG_FILE), logLine({ checkpoint }));
      notifyLockerChanged();
    },

    appendWitness(sessionId, entry) {
      files.appendText(join(dirOf(sessionId), LOG_FILE), logLine({ witness: entry }));
      notifyLockerChanged();
    },

    listSessions() {
      const sessions: SessionState[] = [];
      for (const id of files.sessionIds()) {
        const state = store.readSession(id);
        if (state) sessions.push(state);
      }
      return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    repair(options = {}) {
      moveOldKeyFile();
      const report: RepairReport = {
        rebuilt: [],
        damaged: [],
        caughtUp: [],
        leftovers: removeLeftovers(files.rootUri) + removeLeftovers(join(files.rootUri, 'keys')),
      };
      for (const id of files.sessionIds()) {
        if (options.skip?.(id)) continue;
        const dir = dirOf(id);
        report.leftovers += removeLeftovers(dir) + removeLeftovers(join(dir, 'pending'));
        const base = parseIndex(textOrNull(join(dir, INDEX_FILE)), id);
        if (!base) {
          (rebuild(id).damaged ? report.damaged : report.rebuilt).push(id);
          continue;
        }
        try {
          const state = joinLog(base, logOf(id));
          const missed = unlistedRecords(files, dir, state);
          if (missed.checkpoints.length) {
            files.appendText(join(dir, LOG_FILE), missed.checkpoints.map((checkpoint) => logLine({ checkpoint })).join(''));
          }
          if (missed.items.length) {
            const sequences = new Set(missed.items.map((item) => item.sequence));
            const items = [...state.items.filter((item) => !sequences.has(item.sequence)), ...missed.items].sort((a, b) => a.sequence - b.sequence);
            save({ ...state, items, updatedAt: now().toISOString() });
          }
          if (missed.checkpoints.length || missed.items.length) report.caughtUp.push(id);
        } catch {
          // It could not be written now; the records are still there for the next time.
        }
      }
      if (report.rebuilt.length || report.caughtUp.length || report.leftovers) notifyLockerChanged();
      return report;
    },

    deleteSession(id) {
      files.remove(dirOf(id));
      files.sessionDeleted?.(id);
      notifyLockerChanged();
    },

    moveMedia(sessionId, sourceUri, name) {
      const destination = join(dirOf(sessionId), 'media', name);
      files.move(sourceUri, destination);
      return destination;
    },

    mediaUri: (sessionId, name) => join(dirOf(sessionId), 'media', name),

    writeRecord(sessionId, name, body, signatureDer) {
      files.write(join(dirOf(sessionId), 'records', name), body);
      files.write(join(dirOf(sessionId), 'records', `${name}.sig`), signatureDer);
    },

    readRecordBytes: (sessionId, name) => files.readBytes(join(dirOf(sessionId), 'records', name)),

    readRecordText: (sessionId, name) => files.readText(join(dirOf(sessionId), 'records', name)),

    recordUri: (sessionId, name) => join(dirOf(sessionId), 'records', name),

    sessionFileUri: (sessionId, name) => join(dirOf(sessionId), name),

    copyUri(sessionId, name) {
      files.makeFolder(join(dirOf(sessionId), 'copies'));
      return join(dirOf(sessionId), 'copies', name);
    },

    writeCopyRecord(sessionId, mediaName, body, signatureDer) {
      files.write(join(dirOf(sessionId), 'copies', `${mediaName}.json`), body);
      files.write(join(dirOf(sessionId), 'copies', `${mediaName}.json.sig`), signatureDer);
    },

    sessionDirUri: (sessionId) => dirOf(sessionId),

    listPending(sessionId) {
      const folder = join(dirOf(sessionId), 'pending');
      const out: { name: string; marker: PendingMarker }[] = [];
      for (const entry of files.list(folder)) {
        if (entry.folder || !entry.name.endsWith('.json')) continue;
        try {
          out.push({ name: entry.name, marker: JSON.parse(files.readText(join(folder, entry.name))) as PendingMarker });
        } catch {
          // A marker that can't be read; its file, if any, stays in incoming/ for the next check.
        }
      }
      return out;
    },

    writePending(sessionId, name, marker) {
      files.replaceText(join(dirOf(sessionId), 'pending', name), JSON.stringify(marker));
    },

    deletePending(sessionId, name) {
      files.remove(join(dirOf(sessionId), 'pending', name));
    },

    readKeyJson(keyId) {
      if (!KEY_ID.test(keyId)) return null;
      moveOldKeyFile();
      return textOrNull(keyUri(keyId));
    },

    writeKeyJson(keyId, json) {
      if (!KEY_ID.test(keyId)) throw new Error('Not a key id');
      moveOldKeyFile();
      files.replaceText(keyUri(keyId), json);
    },

    listKeyIds() {
      moveOldKeyFile();
      return files
        .list(join(files.rootUri, 'keys'))
        .filter((entry) => !entry.folder && entry.name.endsWith('.json') && KEY_ID.test(entry.name.slice(0, -5)))
        .map((entry) => entry.name.slice(0, -5));
    },

    readKeyChange: () => textOrNull(join(files.rootUri, 'key-change.json')),

    writeKeyChange(json) {
      const uri = join(files.rootUri, 'key-change.json');
      if (json === null) files.remove(uri);
      else files.replaceText(uri, json);
    },
  };
  return store;
}

export const fileLocker: LockerStore = createLocker(deviceFiles);

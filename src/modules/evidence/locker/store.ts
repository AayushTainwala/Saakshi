import { Directory, File, Paths } from 'expo-file-system';

import type { SessionState } from '../types';

/**
 * The evidence locker on disk, inside the app's private documents directory:
 *
 *   evidence/device-key.json
 *   evidence/sessions/<session id>/session.json   the locker's bookkeeping (unsigned)
 *   evidence/sessions/<session id>/media/…        original files, never modified
 *   evidence/sessions/<session id>/records/…      signed records (<n>.json and <n>.json.sig)
 *   evidence/sessions/<session id>/certificate-part-a.pdf
 */
export interface LockerStore {
  createSession(id: string, createdAt: string): SessionState;
  readSession(id: string): SessionState | null;
  writeSession(state: SessionState): void;
  listSessions(): SessionState[];
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
  readDeviceKeyJson(): string | null;
  writeDeviceKeyJson(json: string): void;
}

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

function root(): Directory {
  return new Directory(Paths.document, 'evidence');
}

function sessionsDir(): Directory {
  return new Directory(root(), 'sessions');
}

function sessionDir(id: string): Directory {
  return new Directory(sessionsDir(), id);
}

function ensure(dir: Directory): Directory {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function writeText(file: File, text: string): void {
  if (!file.exists) file.create({ intermediates: true });
  file.writeSync(text);
}

export const fileLocker: LockerStore = {
  createSession(id, createdAt) {
    const dir = ensure(sessionDir(id));
    ensure(new Directory(dir, 'media'));
    ensure(new Directory(dir, 'records'));
    const state: SessionState = {
      version: 1,
      id,
      createdAt,
      updatedAt: createdAt,
      items: [],
      witness: [],
      certificate: null,
    };
    this.writeSession(state);
    return state;
  },

  readSession(id) {
    const file = new File(sessionDir(id), 'session.json');
    if (!file.exists) return null;
    try {
      return JSON.parse(file.textSync()) as SessionState;
    } catch {
      return null;
    }
  },

  writeSession(state) {
    writeText(new File(ensure(sessionDir(state.id)), 'session.json'), JSON.stringify(state));
    notifyLockerChanged();
  },

  listSessions() {
    const dir = sessionsDir();
    if (!dir.exists) return [];
    const sessions: SessionState[] = [];
    for (const entry of dir.list()) {
      if (entry instanceof Directory) {
        const state = this.readSession(entry.name);
        if (state) sessions.push(state);
      }
    }
    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  deleteSession(id) {
    const dir = sessionDir(id);
    if (dir.exists) dir.delete();
    // The last export may hold this session's files.
    const exports = new Directory(Paths.cache, 'exports');
    if (exports.exists) exports.delete();
    notifyLockerChanged();
  },

  moveMedia(sessionId, sourceUri, name) {
    const destination = new File(ensure(new Directory(sessionDir(sessionId), 'media')), name);
    const source = new File(sourceUri);
    source.moveSync(destination);
    return destination.uri;
  },

  mediaUri(sessionId, name) {
    return new File(sessionDir(sessionId), 'media', name).uri;
  },

  writeRecord(sessionId, name, body, signatureDer) {
    const dir = ensure(new Directory(sessionDir(sessionId), 'records'));
    writeText(new File(dir, name), body);
    const signature = new File(dir, `${name}.sig`);
    if (!signature.exists) signature.create();
    signature.writeSync(signatureDer);
  },

  readRecordBytes(sessionId, name) {
    return new File(sessionDir(sessionId), 'records', name).bytesSync();
  },

  readRecordText(sessionId, name) {
    return new File(sessionDir(sessionId), 'records', name).textSync();
  },

  recordUri(sessionId, name) {
    return new File(sessionDir(sessionId), 'records', name).uri;
  },

  sessionFileUri(sessionId, name) {
    return new File(sessionDir(sessionId), name).uri;
  },

  readDeviceKeyJson() {
    const file = new File(root(), 'device-key.json');
    return file.exists ? file.textSync() : null;
  },

  writeDeviceKeyJson(json) {
    writeText(new File(ensure(root()), 'device-key.json'), json);
  },
};

import type { LockerStore } from '../locker/store';
import type { PendingMarker } from '../locker/pending';
import type { SessionState } from '../types';

/** An in-memory LockerStore for tests. `files` maps URIs to contents. */
export function memoryLocker(files: Map<string, Uint8Array> = new Map()) {
  const sessions = new Map<string, SessionState>();
  const records = new Map<string, { body: string; signature: Uint8Array }>();
  let deviceKey: string | null = null;
  const sessionFiles = new Map<string, Uint8Array>();
  const pending = new Map<string, Map<string, PendingMarker>>();
  const copyRecords = new Map<string, { body: string; signature: Uint8Array }>();

  const store: LockerStore = {
    createSession(id, createdAt) {
      const state: SessionState = { version: 1, id, createdAt, updatedAt: createdAt, items: [], witness: [], certificate: null };
      sessions.set(id, structuredClone(state));
      return state;
    },
    readSession: (id) => (sessions.has(id) ? structuredClone(sessions.get(id)!) : null),
    writeSession: (state) => void sessions.set(state.id, structuredClone(state)),
    listSessions: () => [...sessions.values()].map((s) => structuredClone(s)),
    deleteSession: (id) => void sessions.delete(id),
    moveMedia(sessionId, sourceUri, name) {
      const bytes = files.get(sourceUri);
      if (!bytes) throw new Error(`no such file: ${sourceUri}`);
      files.delete(sourceUri);
      const uri = store.mediaUri(sessionId, name);
      files.set(uri, bytes);
      return uri;
    },
    mediaUri: (sessionId, name) => `mem://${sessionId}/media/${name}`,
    writeRecord(sessionId, name, body, signature) {
      records.set(`${sessionId}/${name}`, { body, signature });
    },
    readRecordBytes(sessionId, name) {
      const signature = name.endsWith('.sig');
      const record = records.get(`${sessionId}/${signature ? name.slice(0, -4) : name}`);
      if (!record) throw new Error(`no such record: ${name}`);
      return signature ? record.signature : new TextEncoder().encode(record.body);
    },
    readRecordText(sessionId, name) {
      const record = records.get(`${sessionId}/${name}`);
      if (!record) throw new Error(`no such record: ${name}`);
      return record.body;
    },
    recordUri: (sessionId, name) => `mem://${sessionId}/records/${name}`,
    sessionFileUri: (sessionId, name) => `mem://${sessionId}/${name}`,
    copyUri: (sessionId, name) => `mem://${sessionId}/copies/${name}`,
    writeCopyRecord(sessionId, mediaName, body, signature) {
      copyRecords.set(`${sessionId}/${mediaName}`, { body, signature });
    },
    sessionDirUri: (sessionId) => `mem://${sessionId}`,
    listPending: (sessionId) =>
      [...(pending.get(sessionId) ?? new Map()).entries()].map(([name, marker]) => ({ name, marker: structuredClone(marker) })),
    writePending(sessionId, name, marker) {
      if (!pending.has(sessionId)) pending.set(sessionId, new Map());
      pending.get(sessionId)!.set(name, structuredClone(marker));
    },
    deletePending: (sessionId, name) => void pending.get(sessionId)?.delete(name),
    readDeviceKeyJson: () => deviceKey,
    writeDeviceKeyJson: (json) => {
      deviceKey = json;
    },
  };

  return { store, files, sessions, records, sessionFiles, pending, copyRecords };
}

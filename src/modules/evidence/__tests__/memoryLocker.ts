import { join, type LockerFiles, TEMPORARY_SUFFIX } from '../locker/files';
import { createLocker, type LockerStore } from '../locker/store';

const ROOT = 'mem://locker';

/**
 * The locker over files held in memory, for tests: the same logic as on the phone (locker/store.ts,
 * createLocker), with `files` standing in for the phone's storage. `files` maps URIs to contents; a
 * session's folder is `mem://<session id>`.
 *
 * `failNextReplace()` makes the next one-step replace die as a kill or a full storage would: the
 * file beside the target is left half-written and the target is untouched.
 */
export function memoryLocker(files: Map<string, Uint8Array> = new Map(), now: () => Date = () => new Date('2026-11-10T06:00:00.000Z')) {
  const folders = new Set<string>();
  const modified = new Map<string, number>();
  let failReplace = false;
  let clock = Date.parse('2026-11-10T05:00:00.000Z');
  const encode = (text: string) => new TextEncoder().encode(text);
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  function put(uri: string, bytes: Uint8Array) {
    files.set(uri, bytes);
    modified.set(uri, (clock += 1000));
  }
  function get(uri: string): Uint8Array {
    const bytes = files.get(uri);
    if (!bytes) throw new Error(`no such file: ${uri}`);
    return bytes;
  }

  const memory: LockerFiles = {
    rootUri: ROOT,
    sessionUri: (id) => `mem://${id}`,
    sessionIds: () => [...folders].filter((uri) => /^mem:\/\/[^/]+$/.test(uri) && uri !== ROOT).map((uri) => uri.slice('mem://'.length)),
    folderExists: (uri) => folders.has(uri) || [...files.keys()].some((key) => key.startsWith(`${uri}/`)),
    makeFolder: (uri) => void folders.add(uri),
    list(uri) {
      const names = new Map<string, boolean>();
      for (const key of [...files.keys(), ...folders]) {
        if (!key.startsWith(`${uri}/`)) continue;
        const rest = key.slice(uri.length + 1).split('/');
        names.set(rest[0], rest.length > 1 || (folders.has(key) && !files.has(key)) || names.get(rest[0]) === true);
      }
      return [...names].map(([name, folder]) => ({ name, folder }));
    },
    stat: (uri) => (files.has(uri) ? { size: files.get(uri)!.length, modifiedAt: modified.get(uri) ?? 0 } : null),
    readText: (uri) => decode(get(uri)),
    readBytes: (uri) => get(uri),
    write: (uri, data) => put(uri, typeof data === 'string' ? encode(data) : data),
    replaceText(uri, text) {
      if (failReplace) {
        failReplace = false;
        put(uri + TEMPORARY_SUFFIX, encode(text.slice(0, Math.ceil(text.length / 2))));
        throw new Error('write interrupted');
      }
      put(uri + TEMPORARY_SUFFIX, encode(text));
      put(uri, get(uri + TEMPORARY_SUFFIX));
      files.delete(uri + TEMPORARY_SUFFIX);
    },
    appendText(uri, text) {
      const before = files.get(uri) ?? new Uint8Array();
      const added = encode(text);
      const joined = new Uint8Array(before.length + added.length);
      joined.set(before);
      joined.set(added, before.length);
      put(uri, joined);
    },
    move(fromUri, toUri) {
      const bytes = get(fromUri);
      const at = modified.get(fromUri);
      files.delete(fromUri);
      files.set(toUri, bytes);
      modified.set(toUri, at ?? (clock += 1000));
    },
    remove(uri) {
      files.delete(uri);
      folders.delete(uri);
      for (const key of [...files.keys()]) if (key.startsWith(`${uri}/`)) files.delete(key);
      for (const key of [...folders]) if (key.startsWith(`${uri}/`)) folders.delete(key);
    },
  };

  const store: LockerStore = createLocker(memory, now);

  /** A view of the stored records as the tests read them: `<session id>/<name>` to body and signature. */
  function recordsIn(folder: 'records' | 'copies', suffix = '') {
    const uriOf = (key: string) => {
      const [id, ...name] = key.split('/');
      return join(`mem://${id}`, folder, `${name.join('/')}${suffix}`);
    };
    return {
      get(key: string) {
        const body = files.get(uriOf(key));
        return body ? { body: decode(body), signature: files.get(`${uriOf(key)}.sig`) ?? new Uint8Array() } : undefined;
      },
      get size() {
        return [...files.keys()].filter((uri) => uri.includes(`/${folder}/`) && uri.endsWith('.json')).length;
      },
    };
  }

  return {
    store,
    files,
    memory,
    records: recordsIn('records'),
    copyRecords: recordsIn('copies', '.json'),
    /** A file's last-write time in this memory, for tests that set it. */
    modified,
    failNextReplace: () => void (failReplace = true),
    /** session.json's and the log's text as stored, or null. */
    indexText: (id: string) => (files.has(`mem://${id}/session.json`) ? decode(files.get(`mem://${id}/session.json`)!) : null),
    logText: (id: string) => (files.has(`mem://${id}/session.log`) ? decode(files.get(`mem://${id}/session.log`)!) : null),
  };
}

import { Platform } from 'react-native';

import { androidFolderName, exportToFolder, pickExportFolder, readExportFolder, saveExportFolder } from '../export/folder';

const mockLog: string[] = [];
const mockFiles = new Map<string, string>();
let mockFailWrite = false;

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get name() {
      return this.uri.split('/').at(-1)!;
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    delete() {
      mockLog.push(`delete ${this.uri}`);
      mockFiles.delete(this.uri);
    }
    textSync() {
      return mockFiles.get(this.uri)!;
    }
    writeSync(text: string) {
      mockFiles.set(this.uri, text);
    }
    open(mode: string) {
      mockLog.push(`open ${this.uri} ${mode}`);
      return {
        writeBytes: async (bytes: Uint8Array) => {
          if (mockFailWrite) throw new Error('disk full');
          mockFiles.set(this.uri, (mockFiles.get(this.uri) ?? '') + new TextDecoder().decode(bytes));
        },
        close: () => mockLog.push(`close ${this.uri}`),
      };
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return true;
    }
    create() {}
    createFile(name: string, mimeType: string) {
      mockLog.push(`create ${name} (${mimeType})`);
      const file = new File(`${this.uri}/doc-${name}`);
      file.create();
      return file;
    }
    static pickDirectoryAsync = async () => {
      if (mockLog.includes('cancel')) {
        throw Object.assign(new Error('The file picker was cancelled by the user'), { code: 'ERR_PICKER_CANCELLED' });
      }
      return new Directory('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSaakshi');
    };
  }
  return { File, Directory, FileMode: { WriteOnly: 'w', ReadWrite: 'rw' }, Paths: { document: 'doc:', cache: 'cache:' } };
});

jest.mock('@native/saakshi-evidence', () => ({
  __esModule: true,
  default: {
    pickExportFolder: async () => ({ bookmark: 'bm1', name: 'Saakshi' }),
    saveToExportFolder: async (bookmark: string, uri: string, name: string) => {
      mockLog.push(`native save ${bookmark} ${uri} ${name}`);
      return { name: 'Saakshi 2026-11-06 10-40 IST Body-cam (2).zip', folder: 'Saakshi', bookmark: 'bm2' };
    },
  },
}));

jest.mock('../export/bundle', () => ({
  writeBundle: async () => {
    mockFiles.set('cache:/exports/b.zip', 'zip');
    return { uri: 'cache:/exports/b.zip', fileName: 'Saakshi 2026-11-06 10-40 IST Body-cam.zip' };
  },
  writeBundleTo: async (_: string, open: (name: string) => { write: (b: Uint8Array) => Promise<void>; close: () => void }) => {
    const out = open('Saakshi 2026-11-06 10-40 IST Body-cam.zip');
    try {
      await out.write(new TextEncoder().encode('PK'));
    } finally {
      out.close();
    }
    return 'Saakshi 2026-11-06 10-40 IST Body-cam.zip';
  },
}));

beforeEach(() => {
  mockLog.length = 0;
  mockFiles.clear();
  mockFailWrite = false;
});

describe('the export folder (fix round 1, group 9)', () => {
  it('names an Android folder where the provider says it', () => {
    expect(androidFolderName('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSaakshi')).toBe('Documents/Saakshi');
    expect(androidFolderName('content://com.android.providers.downloads.documents/tree/raw%3A%2Fstorage%2Femulated%2F0%2FDownload')).toBe('Download');
    expect(androidFolderName('content://com.android.externalstorage.documents/tree/primary%3A')).toBeNull();
    expect(androidFolderName('content://com.google.android.apps.docs.storage/tree/acc%3D1%3Bdoc%3Dencoded%3Dabc')).toBeNull();
    expect(androidFolderName('file:///nowhere')).toBeNull();
  });

  it('keeps the folder on this phone, and only for this platform', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(readExportFolder()).toBeNull();
    saveExportFolder({ platform: 'android', uri: 'content://x', name: 'Documents' });
    expect(readExportFolder()).toEqual({ platform: 'android', uri: 'content://x', name: 'Documents' });
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(readExportFolder()).toBeNull();
  });

  it('Android: picks a folder, and treats a cancel as no choice', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(await pickExportFolder()).toEqual({
      platform: 'android',
      uri: 'content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSaakshi',
      name: 'Documents/Saakshi',
    });
    mockLog.push('cancel');
    expect(await pickExportFolder()).toBeNull();
  });

  it('Android: writes the bundle straight into the folder', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const folder = { platform: 'android' as const, uri: 'content://tree', name: 'Documents' };
    const saved = await exportToFolder('s1', folder);
    expect(saved).toEqual({ folder, fileName: null });
    expect(mockLog).toEqual([
      'create Saakshi 2026-11-06 10-40 IST Body-cam.zip (application/zip)',
      'open content://tree/doc-Saakshi 2026-11-06 10-40 IST Body-cam.zip w',
      'close content://tree/doc-Saakshi 2026-11-06 10-40 IST Body-cam.zip',
    ]);
    expect(mockFiles.get('content://tree/doc-Saakshi 2026-11-06 10-40 IST Body-cam.zip')).toBe('PK');
  });

  it('Android: leaves no half-written bundle behind', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockFailWrite = true;
    await expect(exportToFolder('s1', { platform: 'android', uri: 'content://tree', name: null })).rejects.toThrow('disk full');
    expect(mockLog.at(-1)).toBe('delete content://tree/doc-Saakshi 2026-11-06 10-40 IST Body-cam.zip');
    expect(mockFiles.size).toBe(0);
  });

  it('iPhone: copies the bundle in through the bookmark, keeps a refreshed one, and clears the cache', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(await pickExportFolder()).toEqual({ platform: 'ios', bookmark: 'bm1', name: 'Saakshi' });
    const saved = await exportToFolder('s1', { platform: 'ios', bookmark: 'bm1', name: 'Saakshi' });
    expect(saved).toEqual({
      folder: { platform: 'ios', bookmark: 'bm2', name: 'Saakshi' },
      fileName: 'Saakshi 2026-11-06 10-40 IST Body-cam (2).zip',
    });
    expect(mockLog).toEqual([
      'native save bm1 cache:/exports/b.zip Saakshi 2026-11-06 10-40 IST Body-cam.zip',
      'delete cache:/exports/b.zip',
    ]);
  });
});

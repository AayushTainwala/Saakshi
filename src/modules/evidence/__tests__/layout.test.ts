import { bundlePaths, kindOfMediaType } from '../export/layout';
import { mediaTypeFor } from '../locker/media';
import type { MediaKind } from '../types';

describe('bundle names (format 0.8)', () => {
  it('reads every kind the app records from its media type, as the checking tool does', () => {
    const made: [MediaKind, string][] = [
      ['photo', 'jpg'],
      ['photo', 'heic'],
      ['photo', 'png'],
      ['video', 'mp4'],
      ['video', 'mov'],
      ['video', 'ts'],
      ['audio', 'm4a'],
      ['audio', 'aac'],
      ['audio', 'wav'],
      ['photo', ''],
      ['video', ''],
      ['audio', ''],
    ];
    for (const [kind, extension] of made) expect(kindOfMediaType(mediaTypeFor(extension, kind))).toBe(kind);
  });

  it('names checkpoints after their file, and a file of an unknown type by the app\'s kind', () => {
    const at = '2026-11-06T05:10:12.000Z';
    const paths = bundlePaths(
      [
        { sequence: 2, kind: 'video', mediaType: 'video/mp4', media: '0002-clip0-seg0.mp4', startedAt: at, recording: 'r1' },
        { sequence: 3, kind: 'audio', mediaType: 'application/octet-stream', media: '0003-audio1-seg0.bin', startedAt: at },
      ],
      [
        { sequence: 0, recording: 'r1', index: 0 },
        { sequence: 1, recording: 'gone', index: 4 },
      ],
    );
    expect([...paths.records.values()]).toEqual([
      'Signed records/0002 video 1.json',
      'Signed records/0003 sound 1.json',
      'Signed records/0000 video 1 checkpoint 0.json',
      'Signed records/0001 checkpoint 4.json',
    ]);
    expect(paths.media.get(3)).toBe('Original files/2026-11-06 10-40-12 IST sound 1.bin');
  });
});

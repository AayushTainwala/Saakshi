import type { MediaKind, SegmentRef } from '../types';

const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  heic: 'image/heic',
  png: 'image/png',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
};

const DEFAULT_TYPE: Record<MediaKind, string> = { photo: 'image/jpeg', video: 'video/mp4', audio: 'audio/mp4' };
const DEFAULT_EXTENSION: Record<MediaKind, string> = { photo: 'jpg', video: 'mp4', audio: 'm4a' };

export function extensionOf(uri: string): string {
  const name = uri.split(/[?#]/)[0].split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function mediaTypeFor(extension: string, kind: MediaKind): string {
  return MEDIA_TYPES[extension] ?? DEFAULT_TYPE[kind];
}

/** `0000-photo.jpg`, `0003-clip1-seg2.mp4`, `0004-audio0-seg0.m4a`: sortable, and readable in a court bundle. */
export function mediaFileName(
  sequence: number,
  kind: MediaKind,
  segment: SegmentRef | null,
  extension: string,
): string {
  const prefix = String(sequence).padStart(4, '0');
  const clip = kind === 'audio' ? 'audio' : 'clip';
  const label = kind === 'photo' || !segment ? kind : `${clip}${segment.clip}-seg${segment.index}`;
  return `${prefix}-${label}.${extension || DEFAULT_EXTENSION[kind]}`;
}

export function recordFileName(sequence: number): string {
  return `${String(sequence).padStart(4, '0')}.json`;
}

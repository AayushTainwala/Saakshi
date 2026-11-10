/**
 * The evidence camera's zoom (fix round 1, group 4). The user's zoom is a factor of the camera's
 * normal view: 1 is the main lens as it is, 2 is twice as close, 0.5 is the ultra-wide lens.
 */

/** iPhone's ultra-wide lens, as expo-camera's `selectedLens` names it. */
export const ULTRA_WIDE_LENS = 'AVCaptureDeviceTypeBuiltInUltraWideCamera';

/** Never offer more than this: digital zoom beyond it shows little. */
export const ZOOM_LIMIT = 10;

/** How the camera in use zooms. */
export type ZoomEngine =
  /** iPhone, expo-camera: `zoom` 0..1 runs from 1x to the lens's `maxZoom`, exponentially; 0.5x is a lens of its own. */
  | { kind: 'ios'; maxZoom: number; ultraWide: boolean }
  /** Android photos, expo-camera (CameraX): `zoom` 0..1 is the ratio over `maxZoom`, never below 1x. */
  | { kind: 'android-photo'; maxZoom: number }
  /** Android video, the app's own recorder (Camera2): the ratio itself, from `minZoom` (below 1 on some phones). */
  | { kind: 'android-video'; minZoom: number; maxZoom: number };

export type ZoomRange = { min: number; max: number };

export function zoomRange(engine: ZoomEngine): ZoomRange {
  switch (engine.kind) {
    case 'ios':
      return { min: engine.ultraWide ? 0.5 : 1, max: Math.max(1, Math.min(engine.maxZoom, ZOOM_LIMIT)) };
    case 'android-photo':
      return { min: 1, max: Math.max(1, Math.min(engine.maxZoom, ZOOM_LIMIT)) };
    case 'android-video':
      return { min: Math.min(1, Math.max(0.5, engine.minZoom)), max: Math.max(1, Math.min(engine.maxZoom, ZOOM_LIMIT)) };
  }
}

/** The quick buttons: the widest view where it is wider than 1x, 1x, and 2x where the camera reaches it. */
export function zoomPresets(engine: ZoomEngine): number[] {
  const { min, max } = zoomRange(engine);
  return [...(min < 1 ? [min] : []), 1, ...(max >= 2 ? [2] : [])];
}

/**
 * Keeps a factor within what the camera can do. On iPhone, 0.5x is a different lens, which
 * expo-camera can only switch to between recordings: while recording, the zoom stays on whichever
 * side of 1x it was. Between 0.5x and 1x on iPhone there is nothing: it goes to the nearer.
 */
export function clampZoom(engine: ZoomEngine, factor: number, options: { recording: boolean; current: number }): number {
  const { min, max } = zoomRange(engine);
  let f = Math.min(max, Math.max(min, factor));
  if (engine.kind === 'ios') {
    if (f < 1) f = engine.ultraWide && f < 0.75 ? 0.5 : 1;
    if (options.recording && (f < 1) !== (options.current < 1)) f = options.current;
  }
  return Math.round(f * 100) / 100;
}

/** What to tell the camera for a factor. */
export function cameraZoom(engine: ZoomEngine, factor: number): { lens: string | undefined; zoom: number; ratio: number } {
  const { min, max } = zoomRange(engine);
  const f = Math.min(max, Math.max(min, factor));
  switch (engine.kind) {
    case 'ios':
      if (f < 1 && engine.ultraWide) return { lens: ULTRA_WIDE_LENS, zoom: 0, ratio: f };
      return { lens: undefined, zoom: engine.maxZoom > 1 ? Math.min(1, Math.log(f) / Math.log(engine.maxZoom)) : 0, ratio: f };
    case 'android-photo':
      return { lens: undefined, zoom: engine.maxZoom > 1 ? Math.min(1, f / engine.maxZoom) : 0, ratio: f };
    case 'android-video':
      return { lens: undefined, zoom: 0, ratio: f };
  }
}

/** "0.5", "1", "1.4", "2". */
export function zoomLabel(factor: number): string {
  const rounded = Math.round(factor * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Distance between two touches, for pinching. */
export function touchDistance(touches: readonly { pageX: number; pageY: number }[]): number | null {
  if (touches.length < 2) return null;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

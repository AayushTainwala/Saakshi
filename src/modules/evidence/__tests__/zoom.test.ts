import { cameraZoom, clampZoom, touchDistance, ULTRA_WIDE_LENS, zoomLabel, zoomPresets, zoomRange } from '../capture/zoom';

const iphone = { kind: 'ios' as const, maxZoom: 123.75, ultraWide: true };
const iphoneNoUltraWide = { kind: 'ios' as const, maxZoom: 16, ultraWide: false };
const androidPhoto = { kind: 'android-photo' as const, maxZoom: 8 };
const androidVideo = { kind: 'android-video' as const, minZoom: 0.6, maxZoom: 10 };

describe('evidence camera zoom (fix round 1, group 4)', () => {
  it('offers 0.5x only where there is a wider lens, and 2x where the camera reaches it', () => {
    expect(zoomPresets(iphone)).toEqual([0.5, 1, 2]);
    expect(zoomPresets(iphoneNoUltraWide)).toEqual([1, 2]);
    expect(zoomPresets(androidPhoto)).toEqual([1, 2]);
    expect(zoomPresets(androidVideo)).toEqual([0.6, 1, 2]);
    expect(zoomPresets({ kind: 'android-photo', maxZoom: 1 })).toEqual([1]);
    expect(zoomRange(iphone)).toEqual({ min: 0.5, max: 10 });
  });

  it('turns a factor into what each camera is told', () => {
    // iPhone: expo-camera's zoom rises exponentially from 1x at 0 to the lens maximum at 1.
    expect(cameraZoom(iphone, 1)).toEqual({ lens: undefined, zoom: 0, ratio: 1 });
    expect(Math.pow(iphone.maxZoom, cameraZoom(iphone, 2).zoom)).toBeCloseTo(2, 6);
    expect(cameraZoom(iphone, 0.5)).toEqual({ lens: ULTRA_WIDE_LENS, zoom: 0, ratio: 0.5 });
    // Android photos: expo-camera's zoom is the ratio over the maximum, in a straight line.
    expect(cameraZoom(androidPhoto, 2).zoom * androidPhoto.maxZoom).toBeCloseTo(2, 6);
    expect(cameraZoom(androidPhoto, 0.5).ratio).toBe(1);
    // Android video: the app's recorder takes the ratio itself.
    expect(cameraZoom(androidVideo, 0.6)).toEqual({ lens: undefined, zoom: 0, ratio: 0.6 });
  });

  it('keeps zoom within the camera, and on iPhone off the lens change while recording', () => {
    expect(clampZoom(iphone, 30, { recording: false, current: 1 })).toBe(10);
    expect(clampZoom(iphone, 0.6, { recording: false, current: 1 })).toBe(0.5);
    expect(clampZoom(iphone, 0.8, { recording: false, current: 1 })).toBe(1);
    expect(clampZoom(iphone, 0.5, { recording: true, current: 1.5 })).toBe(1.5);
    expect(clampZoom(iphone, 3, { recording: true, current: 0.5 })).toBe(0.5);
    expect(clampZoom(iphone, 2.345, { recording: true, current: 1 })).toBe(2.35);
    expect(clampZoom(iphoneNoUltraWide, 0.5, { recording: false, current: 1 })).toBe(1);
    // Android video zooms smoothly through 1x, recording or not.
    expect(clampZoom(androidVideo, 0.8, { recording: true, current: 2 })).toBe(0.8);
  });

  it('labels factors plainly, and measures a pinch', () => {
    expect([0.5, 1, 1.43, 2, 0.6].map(zoomLabel)).toEqual(['0.5', '1', '1.4', '2', '0.6']);
    expect(touchDistance([{ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 }])).toBe(5);
    expect(touchDistance([{ pageX: 0, pageY: 0 }])).toBeNull();
  });
});

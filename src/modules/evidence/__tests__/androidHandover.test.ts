import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import i18n, { initI18n } from '@/i18n';

import { handoverNoteKey } from '../bodycam/handover';

const ROOT = join(__dirname, '../../../..');
const recorder = readFileSync(
  join(ROOT, 'modules/saakshi-evidence/android/src/main/java/expo/modules/saakshievidence/CameraRecorder.kt'),
  'utf8',
);

/** The body of one Kotlin function, from its `fun name(` to the closing brace at its indent. */
function kotlinFunction(source: string, name: string): string {
  const start = source.indexOf(`fun ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const indent = source.slice(lineStart, start).match(/^\s*/)![0];
  const end = source.indexOf(`\n${indent}}`, start);
  return source.slice(start, end);
}

describe('body-cam at 5% on Android, without rebuilding the camera (round 2, group 1.6)', () => {
  it('keeps the picture size: no 480p choice and no size change in saving mode', () => {
    expect(recorder).not.toMatch(/480/);
    expect(recorder).not.toContain('ensureSizeForPower');
    expect(kotlinFunction(recorder, 'chooseSize')).not.toMatch(/saving|lowPower/);
  });

  it('keeps the persistent surface and the capture session at the handover', () => {
    const handOver = kotlinFunction(recorder, 'handOver');
    const startFile = kotlinFunction(recorder, 'startFile');
    for (const body of [handOver, startFile]) {
      expect(body).not.toMatch(/rebuildSession|preparePersistentSurface|createCaptureSession|persistentSurface\s*=|\.release\(\)\s*\n\s*persistentSurface/);
    }
    // The new file's recorder takes the same surface, and the request (not the session) is renewed.
    expect(startFile).toContain('persistentSurface ?: throw');
    expect(handOver).toContain('applyRepeatingRequest()');
  });

  it('gives the new file half the bit rate, and 15 frames a second only where the camera sends 15', () => {
    const bitRate = kotlinFunction(recorder, 'videoBitRate');
    expect(bitRate).toContain('6_000_000 else 3_000_000');
    expect(bitRate).toContain('if (lowPower) normal / 2 else normal');
    expect(kotlinFunction(recorder, 'videoFrameRate')).toContain('if (lowPower && savingFpsRange() != null) 15 else 30');
    const recorderSetup = kotlinFunction(recorder, 'newRecorder');
    expect(recorderSetup).toContain('setVideoEncodingBitRate(videoBitRate())');
    expect(recorderSetup).toContain('setVideoFrameRate(videoFrameRate())');
    // The camera's 15 frames a second follow the file being written, not the setting for the next one.
    expect(kotlinFunction(recorder, 'applyRepeatingRequest')).toContain('if (fileSaving && recorder != null) savingFpsRange()');
  });

  it('starts every new recording at the normal quality', () => {
    expect(kotlinFunction(recorder, 'startRecording')).toContain('lowPower = false');
  });
});

describe("what the body-cam screen says at the handover", () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('says 480p only on iPhone, in English and Hindi', async () => {
    expect(handoverNoteKey('ios')).toBe('battery.handedOverVideoIos');
    expect(handoverNoteKey('android')).toBe('battery.handedOverVideoAndroid');
    for (const language of ['en', 'hi']) {
      await i18n.changeLanguage(language);
      const t = i18n.getFixedT(language, 'record');
      expect(t(handoverNoteKey('ios'))).toContain('480p');
      expect(t(handoverNoteKey('ios'))).toContain('15');
      expect(t(handoverNoteKey('android'))).not.toContain('480');
      expect(t(handoverNoteKey('android'))).toContain('15');
    }
    await i18n.changeLanguage('en');
    expect(i18n.getFixedT('en', 'record')(handoverNoteKey('android'))).toBe(
      'Battery at 5%: recording carries on in a new file with less data, and 15 frames a second where the camera allows, to save power.',
    );
  });
});

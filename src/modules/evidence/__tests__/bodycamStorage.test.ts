import { GB, MB, SAFETY_FLOOR_BYTES, soundBytesPerSecond, storageMonitor, videoBytesPerSecond } from '@/platform/storage';

import { type BodyCamStorageStep, bodyCamStoragePlan } from '../bodycam/storage';

/** Repair round A, group 2: what body-cam does as the phone's room runs out. */

const KEEP = 5 * GB;
const video = videoBytesPerSecond(720);
const sound = soundBytesPerSecond('android');

/** Runs a plan over free-space readings, as the body-cam screen does, and returns what it did. */
function run(plan: ReturnType<typeof bodyCamStoragePlan>, readings: (number | null)[]) {
  const monitor = storageMonitor();
  const steps: BodyCamStorageStep[] = [];
  for (const freeBytes of readings) {
    for (const action of monitor({ ...plan.target(), freeBytes })) {
      const step = plan.step(action);
      if (!step) continue;
      steps.push(step);
      // The warnings start again for the sound that follows.
      if (step.do === 'sound-only') monitor.reset();
    }
  }
  return steps;
}

describe('body-cam and the phone\'s room', () => {
  it('watches for the keep-free amount at the video rate, then for the floor at the sound rate', () => {
    const plan = bodyCamStoragePlan({ keepFreeBytes: KEEP, soundOnly: true, quality: 1080, os: 'android' });
    expect(plan.target()).toEqual({ limitBytes: KEEP, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: videoBytesPerSecond(1080) });
    expect(plan.step({ type: 'limit' })).toEqual({ do: 'sound-only' });
    expect(plan.soundOnly).toBe(true);
    expect(plan.target()).toEqual({ limitBytes: SAFETY_FLOOR_BYTES, floorBytes: SAFETY_FLOOR_BYTES, bytesPerSecond: sound });
  });

  it('warns, drops to sound only at the keep-free amount, warns again, and stops at the floor, in that order', () => {
    const plan = bodyCamStoragePlan({ keepFreeBytes: KEEP, soundOnly: true, quality: 720, os: 'android' });
    const steps = run(plan, [
      KEEP + video * 60 * 90,
      KEEP + video * 60 * 25,
      KEEP + video * 60 * 8,
      KEEP,
      // Sound only: hours fit between the keep-free amount and the floor.
      KEEP - 10 * MB,
      3 * GB,
      SAFETY_FLOOR_BYTES + sound * 60 * 28,
      SAFETY_FLOOR_BYTES + sound * 60 * 6,
      SAFETY_FLOOR_BYTES,
      SAFETY_FLOOR_BYTES - MB,
    ]);
    expect(steps).toEqual([
      { do: 'warn', minutes: 30, of: 'video' },
      { do: 'warn', minutes: 10, of: 'video' },
      { do: 'sound-only' },
      { do: 'warn', minutes: 30, of: 'sound' },
      { do: 'warn', minutes: 10, of: 'sound' },
      { do: 'stop', at: 'floor' },
    ]);
  });

  it('stops at the keep-free amount when "sound only" is switched off', () => {
    const plan = bodyCamStoragePlan({ keepFreeBytes: KEEP, soundOnly: false, quality: 720 });
    expect(run(plan, [KEEP + video * 60 * 5, KEEP, KEEP - MB])).toEqual([
      { do: 'warn', minutes: 10, of: 'video' },
      { do: 'stop', at: 'keep-free' },
    ]);
    expect(plan.soundOnly).toBe(false);
  });

  it('stops at the floor even if the phone filled up between two readings', () => {
    const plan = bodyCamStoragePlan({ keepFreeBytes: KEEP, soundOnly: true, quality: 720 });
    expect(run(plan, [KEEP + GB, SAFETY_FLOOR_BYTES - MB])).toEqual([{ do: 'stop', at: 'floor' }]);
  });

  it('never stops because a reading failed', () => {
    const plan = bodyCamStoragePlan({ keepFreeBytes: KEEP, soundOnly: true, quality: 720 });
    expect(run(plan, [null, null, null, KEEP + 10 * GB, null])).toEqual([{ do: 'unknown' }, { do: 'known' }, { do: 'unknown' }]);
    expect(plan.soundOnly).toBe(false);
  });
});

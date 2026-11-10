import { randomUUID } from 'expo-crypto';

import { readBatteryPercent } from '@/platform/battery';

import { deviceSigner } from '../integrity/deviceKey';
import { appInfo, deviceInfo, timeZone } from '../integrity/environment';
import { hashFile } from '../integrity/hash';
import { createCheckpointSealer, createSealer, type SealerDeps } from '../integrity/seal';
import { sha256Hex } from '../integrity/sha256';
import { fileLocker } from '../locker/store';
import { CaptureSession, type PipelineDeps } from './pipeline';

export function createPipelineDeps(): PipelineDeps {
  const sealer: SealerDeps = {
    store: fileLocker,
    signer: deviceSigner(fileLocker),
    sha256Hex,
    newId: randomUUID,
    device: deviceInfo,
    app: appInfo,
    timeZone,
    // Format 0.9: each file's and checkpoint's record carries the battery level.
    battery: () => readBatteryPercent(),
  };
  return {
    store: fileLocker,
    now: () => new Date(),
    newId: randomUUID,
    hash: hashFile,
    seal: createSealer(sealer),
    sealCheckpoint: createCheckpointSealer(sealer),
  };
}

/**
 * Starts a new evidence session for files recorded outside the evidence camera: body-cam files,
 * and bug mode's sound files (E8). Hand each file to `add()` as soon as it closes: it is hashed,
 * moved into the locker, and a signed, chained record is written. Checkpoints of a file still being
 * written go to `addCheckpoint()`. The session appears in the Record tab. Call `finish()` when
 * recording is over.
 */
export function createEvidenceSession(): CaptureSession {
  return new CaptureSession(createPipelineDeps());
}

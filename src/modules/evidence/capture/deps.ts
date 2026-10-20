import { randomUUID } from 'expo-crypto';

import { deviceSigner } from '../integrity/deviceKey';
import { appInfo, deviceInfo, timeZone } from '../integrity/environment';
import { hashFile } from '../integrity/hash';
import { createSealer } from '../integrity/seal';
import { sha256Hex } from '../integrity/sha256';
import { fileLocker } from '../locker/store';
import { CaptureSession, type PipelineDeps } from './pipeline';

export function createPipelineDeps(): PipelineDeps {
  return {
    store: fileLocker,
    now: () => new Date(),
    newId: randomUUID,
    hash: hashFile,
    seal: createSealer({
      store: fileLocker,
      signer: deviceSigner(fileLocker),
      sha256Hex,
      newId: randomUUID,
      device: deviceInfo,
      app: appInfo,
      timeZone,
    }),
  };
}

/**
 * Starts a new evidence session for files recorded outside the evidence camera: body-cam pieces,
 * and bug mode's audio pieces (E8). Hand each file to `add()` as soon as it closes: it is hashed,
 * moved into the locker, and a signed, chained record is written. The session appears in the
 * Record tab. Call `finish()` when recording is over.
 */
export function createEvidenceSession(): CaptureSession {
  return new CaptureSession(createPipelineDeps());
}

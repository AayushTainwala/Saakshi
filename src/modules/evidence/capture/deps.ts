import { randomUUID } from 'expo-crypto';

import { deviceSigner } from '../integrity/deviceKey';
import { appInfo, deviceInfo, timeZone } from '../integrity/environment';
import { hashFile } from '../integrity/hash';
import { createSealer } from '../integrity/seal';
import { sha256Hex } from '../integrity/sha256';
import { fileLocker } from '../locker/store';
import type { PipelineDeps } from './pipeline';

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

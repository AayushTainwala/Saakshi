import { randomUUID } from 'expo-crypto';

import { hashFile } from '../integrity/hash';
import { fileLocker } from '../locker/store';
import type { PipelineDeps } from './pipeline';

export function createPipelineDeps(): PipelineDeps {
  return {
    store: fileLocker,
    now: () => new Date(),
    newId: randomUUID,
    hash: hashFile,
  };
}

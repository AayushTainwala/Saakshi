import type { DeviceKeyFile } from '../integrity/deviceKey';
import type { AppInfo } from '../integrity/record';
import { planBundle } from '../export/plan';
import type { memoryLocker } from './memoryLocker';

/** A session's bundle as the app lays it out (export/plan.ts), as files: path → bytes. */
export function bundleFilesOf(
  locker: ReturnType<typeof memoryLocker>,
  id: string,
  key: DeviceKeyFile,
  now: Date,
  app: AppInfo,
  certificate: Uint8Array | null = null,
) {
  const plan = planBundle({ store: locker.store, id, key, now, app, certificate });
  const files = new Map<string, Uint8Array>();
  for (const entry of plan.entries) {
    files.set(entry.name, 'bytes' in entry ? entry.bytes : locker.files.get(locker.store.mediaUri(id, entry.media.file))!);
  }
  return { plan, files };
}

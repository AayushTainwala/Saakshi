import { CaptureSession } from '../capture/pipeline';
import { deleteSession, SessionBusyError } from '../locker/delete';
import { memoryLocker } from './memoryLocker';

function setup() {
  const locker = memoryLocker(new Map([['cache://p.jpg', new Uint8Array([1])]]));
  let ids = 0;
  const session = new CaptureSession({ store: locker.store, now: () => new Date(), newId: () => `s${ids++}` });
  return { locker, session };
}

const photo = { uri: 'cache://p.jpg', kind: 'photo' as const, segment: null, startedAt: new Date(), endedAt: new Date(), location: { status: 'denied' as const, fix: null } };

describe('deleteSession', () => {
  it('refuses while the session is recording, and deletes it once finished', async () => {
    const { locker, session } = setup();
    await session.add(photo);
    const id = session.id!;
    expect(() => deleteSession(locker.store, id)).toThrow(SessionBusyError);
    expect(locker.store.readSession(id)).not.toBeNull();

    await session.finish();
    deleteSession(locker.store, id);
    expect(locker.store.readSession(id)).toBeNull();
  });
});

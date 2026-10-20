import { ContactsStore, MAX_CONTACTS, sanitizeContacts } from '../contacts/store';

function memoryStore(initial: string | null = null) {
  let text = initial;
  let n = 0;
  const storage = { read: () => text, write: (value: string) => void (text = value) };
  return { store: new ContactsStore(storage, () => `id-${++n}`), saved: () => text };
}

describe('trusted contacts', () => {
  it('adds, normalises and removes', () => {
    const { store, saved } = memoryStore();
    const added = store.add({ name: '  Asha   Rao ', phone: '98765 43210' });
    expect(added).toEqual({ ok: true, contact: { id: 'id-1', name: 'Asha Rao', phone: '+919876543210' } });
    expect(JSON.parse(saved()!)).toEqual({ version: 1, contacts: [{ id: 'id-1', name: 'Asha Rao', phone: '+919876543210' }] });

    store.remove('id-1');
    expect(store.list()).toEqual([]);
  });

  it('refuses invalid and duplicate numbers', () => {
    const { store } = memoryStore();
    expect(store.add({ phone: '12' })).toEqual({ ok: false, error: 'invalid' });
    store.add({ phone: '9876543210' });
    expect(store.add({ name: 'Again', phone: '+91 98765 43210' })).toEqual({ ok: false, error: 'duplicate' });
  });

  it(`holds at most ${MAX_CONTACTS}`, () => {
    const { store } = memoryStore();
    for (let i = 0; i < MAX_CONTACTS; i++) expect(store.add({ phone: `98765432${String(i).padStart(2, '0')}` }).ok).toBe(true);
    expect(store.add({ phone: '9123456789' })).toEqual({ ok: false, error: 'full' });
  });

  it('tells subscribers about changes', () => {
    const { store } = memoryStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.add({ phone: '9876543210' });
    unsubscribe();
    store.add({ phone: '9876543211' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reads back what it wrote, and survives a damaged file', () => {
    const first = memoryStore();
    first.store.add({ name: 'Asha', phone: '9876543210' });
    expect(memoryStore(first.saved()).store.list()).toEqual(first.store.list());
    expect(memoryStore('{not json').store.list()).toEqual([]);
  });
});

describe('sanitizeContacts', () => {
  it('keeps well-formed, unique entries only', () => {
    expect(
      sanitizeContacts({
        contacts: [
          { id: 'a', name: 'Asha', phone: '+919876543210' },
          { id: 'b', name: 'Dup', phone: '9876543210' },
          { id: 'c', name: 42, phone: '9123456789' },
          { id: 'd', phone: 'nope' },
          { name: 'No id', phone: '9000000000' },
          null,
        ],
      }),
    ).toEqual([
      { id: 'a', name: 'Asha', phone: '+919876543210' },
      { id: 'c', name: null, phone: '+919123456789' },
    ]);
    expect(sanitizeContacts(null)).toEqual([]);
    expect(sanitizeContacts({ contacts: 'x' })).toEqual([]);
  });
});

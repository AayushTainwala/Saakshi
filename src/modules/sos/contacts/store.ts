import { normalizePhone } from './phone';

/**
 * What a trusted contact gets (fix round 1, group 6; owner's decision of 5 Nov 2026): SOS alerts
 * (and the alert confiscation mode sends), the live-location link, and witness messages (the one
 * sent from a record, and bug mode's).
 */
export type ContactUse = 'sos' | 'live' | 'witness';
export const CONTACT_USES: readonly ContactUse[] = ['sos', 'live', 'witness'];

/** Someone the user trusts to receive their alerts. Kept only in a file on the phone. */
export type TrustedContact = {
  id: string;
  name: string | null;
  /** International form, such as +919876543210. */
  phone: string;
  /** What they get. All are ticked for someone new, and for anyone saved before the ticks existed. */
  uses: Record<ContactUse, boolean>;
};

const ALL_USES: Record<ContactUse, boolean> = { sos: true, live: true, witness: true };

/** The contacts ticked for one use. */
export function forUse(contacts: readonly TrustedContact[], use: ContactUse): TrustedContact[] {
  return contacts.filter((c) => c.uses[use]);
}

/** Enough for family and friends; Android also limits how many texts an app sends in a burst. */
export const MAX_CONTACTS = 10;
const MAX_NAME_LENGTH = 80;

export type AddError = 'invalid' | 'duplicate' | 'full';
export type AddResult = { ok: true; contact: TrustedContact } | { ok: false; error: AddError };

/** Reads anything parsed from the contacts file, keeping only well-formed, unique contacts. */
export function sanitizeContacts(raw: unknown): TrustedContact[] {
  const list = (raw as { contacts?: unknown } | null)?.contacts;
  if (!Array.isArray(list)) return [];
  const out: TrustedContact[] = [];
  for (const entry of list) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, name, phone, uses } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || typeof phone !== 'string') continue;
    const normalized = normalizePhone(phone);
    if (!normalized || out.some((c) => c.phone === normalized)) continue;
    out.push({ id, name: cleanName(name), phone: normalized, uses: cleanUses(uses) });
    if (out.length === MAX_CONTACTS) break;
  }
  return out;
}

/** Each use is ticked unless the file says it is not (lists saved before the ticks have none). */
function cleanUses(uses: unknown): Record<ContactUse, boolean> {
  const given = typeof uses === 'object' && uses !== null ? (uses as Record<string, unknown>) : {};
  return { sos: given.sos !== false, live: given.live !== false, witness: given.witness !== false };
}

function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/** Where the list is kept. The app uses a file; tests use memory. */
export type ContactsStorage = {
  read(): string | null;
  write(text: string): void;
};

/** The trusted-contacts list, read once and written on every change. */
export class ContactsStore {
  private contacts: TrustedContact[] | null = null;
  private listeners = new Set<() => void>();

  constructor(
    private readonly storage: ContactsStorage,
    private readonly newId: () => string,
  ) {}

  list = (): readonly TrustedContact[] => {
    if (!this.contacts) {
      try {
        const text = this.storage.read();
        this.contacts = text ? sanitizeContacts(JSON.parse(text)) : [];
      } catch {
        this.contacts = [];
      }
    }
    return this.contacts;
  };

  add(input: { name?: string | null; phone: string }): AddResult {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, error: 'invalid' };
    const current = this.list();
    if (current.some((c) => c.phone === phone)) return { ok: false, error: 'duplicate' };
    if (current.length >= MAX_CONTACTS) return { ok: false, error: 'full' };
    const contact: TrustedContact = { id: this.newId(), name: cleanName(input.name), phone, uses: { ...ALL_USES } };
    this.save([...current, contact]);
    return { ok: true, contact };
  }

  /** Ticks or unticks one use for one contact. */
  setUse(id: string, use: ContactUse, on: boolean): void {
    this.save(this.list().map((c) => (c.id === id ? { ...c, uses: { ...c.uses, [use]: on } } : c)));
  }

  remove(id: string): void {
    this.save(this.list().filter((c) => c.id !== id));
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private save(contacts: TrustedContact[]): void {
    this.storage.write(JSON.stringify({ version: 2, contacts }));
    this.contacts = contacts;
    for (const listener of this.listeners) listener();
  }
}

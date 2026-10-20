/** Sessions still being recorded or sealed. They can't be deleted until they finish. */
const active = new Set<string>();

export function markActive(id: string): void {
  active.add(id);
}

export function markInactive(id: string): void {
  active.delete(id);
}

export function isActive(id: string): boolean {
  return active.has(id);
}

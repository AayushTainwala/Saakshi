/** A day as Saakshi writes dates elsewhere: 09/11/2026, in Indian time. */
export function formatDayIST(ms: number): string {
  const ist = new Date(ms + 330 * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(ist.getUTCDate())}/${pad(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

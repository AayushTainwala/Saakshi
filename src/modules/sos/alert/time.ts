const IST_OFFSET_MS = 330 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

function ist(iso: string | Date): Date {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS);
}

/** "20/10/2026" in India Standard Time. */
export function formatDateIST(at: string | Date): string {
  const d = ist(at);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** "14:32 IST". */
export function formatTimeIST(at: string | Date): string {
  const d = ist(at);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

/** "20/10/2026 14:32 IST". */
export function formatIST(at: string | Date): string {
  return `${formatDateIST(at)} ${formatTimeIST(at)}`;
}

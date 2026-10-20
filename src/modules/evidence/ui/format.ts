/** Formats a time in India Standard Time, which is how certificates and witness messages state it. */
export function formatIST(iso: string, withSeconds = false): string {
  const date = new Date(new Date(iso).getTime() + 330 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}${
    withSeconds ? `:${pad(date.getUTCSeconds())}` : ''
  }`;
  return `${day} ${time} IST`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

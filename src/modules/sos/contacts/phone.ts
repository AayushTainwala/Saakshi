/**
 * Phone numbers as people type them or as contact cards hold them: "+91 98765 43210",
 * "098765-43210", "(022) 2345 6789". Indian numbers are stored in international form, +91 and ten
 * digits, so the same person isn't added twice and texts reach them from any SIM.
 */

const SEPARATORS = /[\s\-(). ‐-―]/g;

/** The number in a form SMS can be sent to, or null if it can't be a phone number. */
export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(SEPARATORS, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  const international = value.startsWith('+');
  const digits = international ? value.slice(1) : value;
  if (!/^\d+$/.test(digits)) return null;

  if (international) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  // Every Indian number is ten digits after the trunk 0 or the country code 91.
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

/** "+919876543210" as "+91 98765 43210"; other numbers as stored. */
export function formatPhone(phone: string): string {
  const indian = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return indian ? `+91 ${indian[1]} ${indian[2]}` : phone;
}

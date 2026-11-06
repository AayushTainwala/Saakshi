/**
 * How many SMS parts a text takes (round 2, group 1.4: every message is kept to a budget). Texts in
 * GSM 03.38's 7-bit alphabet take 160 characters in one part and 153 in each part of a longer one;
 * its extension characters (such as € and [) count twice. Anything else, Hindi included, is sent as
 * UCS-2: 70 characters in one part, 67 in each part of a longer one (UTF-16 code units).
 */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENSION = '\f^{}\\[~]|€';

const basic = new Set(Array.from(GSM_BASIC));
const extension = new Set(Array.from(GSM_EXTENSION));

export type SmsEncoding = 'gsm' | 'ucs2';

/** True if every character is in the GSM 7-bit alphabet (with its extension). */
export function isGsm(text: string): boolean {
  for (const ch of text) if (!basic.has(ch) && !extension.has(ch)) return false;
  return true;
}

export function smsEncoding(text: string): SmsEncoding {
  return isGsm(text) ? 'gsm' : 'ucs2';
}

/** The text's length in its encoding's units. */
export function smsLength(text: string): number {
  if (!isGsm(text)) return text.length;
  let length = 0;
  for (const ch of text) length += extension.has(ch) ? 2 : 1;
  return length;
}

export function smsParts(text: string): number {
  const length = smsLength(text);
  if (length === 0) return 1;
  const [single, multi] = isGsm(text) ? [160, 153] : [70, 67];
  return length <= single ? 1 : Math.ceil(length / multi);
}

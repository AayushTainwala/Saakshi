/**
 * What body-cam's screen says at the 5% handover (SPEC section 4, low battery; round 2, group 1.6).
 * The two phones save power differently, so each says what it really does: iPhone makes the new
 * file at 480p and 15 frames a second in its file writer; Android keeps the picture size (the
 * camera is never rebuilt mid-recording) and lowers the data rate, with 15 frames a second where
 * the camera offers it.
 */
export function handoverNoteKey(os: string): 'battery.handedOverVideoIos' | 'battery.handedOverVideoAndroid' {
  return os === 'ios' ? 'battery.handedOverVideoIos' : 'battery.handedOverVideoAndroid';
}

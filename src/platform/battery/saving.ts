/**
 * Saving mode (SPEC E1, "Low battery"; round 2, group 1.5): at 5% battery, body-cam and Pocket
 * recording tell this, and live location (if it runs) sends its positions every 5 minutes, and its
 * contacts are told once. The app's root layout connects the two, so the recordings need not know
 * about live location.
 */
let listener: ((on: boolean) => void) | null = null;

export function onSavingMode(next: ((on: boolean) => void) | null): void {
  listener = next;
}

export function setSavingMode(on: boolean): void {
  try {
    listener?.(on);
  } catch {
    // Saving mode is a saving; a recording never fails for it.
  }
}

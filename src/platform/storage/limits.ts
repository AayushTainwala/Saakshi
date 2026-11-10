/**
 * Free storage, stage one (SPEC section 4, "Storage"; repair round A, group 2).
 *
 * Two amounts, both in bytes of free space on the phone:
 * - the **safety floor**, fixed: Saakshi never records into it;
 * - the **keep-free amount**, a setting: how much of the phone to leave for everything else.
 */
export const MB = 1024 * 1024;
export const GB = 1024 * MB;

/**
 * The safety floor: 300 MB. At the floor every recorder stops cleanly, so that the closing file's
 * record, its signature and the locker's bookkeeping can always be written. Not a setting.
 *
 * What stopping and sealing the largest file needs, at worst:
 * - **The time it takes to notice and stop.** Free space is read every 10 seconds (POLL_MS). After
 *   a reading just above the floor, up to 10 seconds pass before the next; stopping takes up to
 *   about 5 seconds; and iPhone's writers hold up to one 10-second segment that is not on storage
 *   yet. That is about 25 seconds of writing: about 19 MB at body-cam's highest rate (1080p), and
 *   about 40 MB at the rate assumed for the iPhone evidence camera (rates.ts).
 * - **Closing the file.** MPEG-TS, fragmented MP4 and ADTS AAC need nothing written at the end.
 *   The iPhone evidence camera's `.mov` and Android's MP4 fallback write an index when they close,
 *   which grows with the recording's length: a few MB for each hour (not measured on a phone).
 *   Allow 30 MB.
 * - **Sealing.** A signed record is about 1.5 KB and its signature about 72 bytes. session.json is
 *   written beside itself and swapped, so for a moment there are two copies; with ten hours of
 *   checkpoints that is a few MB. Allow 5 MB.
 *
 * That is about 75 MB that can be counted. The rest is for what Saakshi can't measure: other apps
 * and the phone itself writing at the same moment, and the figure the phone reports being a little
 * more than this app can really use (read.ts). 300 MB is four times what can be counted.
 */
export const SAFETY_FLOOR_BYTES = 300 * MB;

/** The amounts the keep-free setting offers. */
export const KEEP_FREE_CHOICES_GB = [1, 2, 5, 10, 20] as const;
export type KeepFreeGb = (typeof KEEP_FREE_CHOICES_GB)[number];

/**
 * The keep-free amount a phone starts with: 5 GB (owner, 10 Nov 2026).
 *
 * The SPEC marks one refinement **Proposed**: 5 GB or a tenth of the phone's storage, whichever is
 * smaller, so that a small phone can still record. Until the owner decides, this returns the plain
 * 5 GB; the phone's total is passed in so that the refinement is a change to this function only.
 */
export function startingKeepFreeBytes(_totalBytes: number | null): number {
  return 5 * GB;
}

/** Free space is read this often while a recording runs, and while a Start screen shows. */
export const POLL_MS = 10_000;

/** Warnings come when about this many minutes of recording are left, in this order. */
export const WARN_MINUTES = [30, 10] as const;

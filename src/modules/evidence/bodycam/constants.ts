/**
 * Body-cam records one continuous file from Start to Stop (owner's decision of 5 Nov 2026), and
 * signs a checkpoint of it about this often while writing it: in step with the iPhone's 10-second
 * movie segments, and the same on Android.
 */
export const BODYCAM_CHECKPOINT_SECONDS = 10;

/** Upload parts are about this long until E7 decides (a setting: BodyCamSettings.uploadPartSeconds). */
export const DEFAULT_UPLOAD_PART_SECONDS = 60;

/** Two volume-up presses within this many milliseconds unlock the screen (owner, 5 Nov 2026). */
export const UNLOCK_WINDOW_MS = 1500;

/** How long the "Screen locked" message shows after a touch. */
export const LOCK_MESSAGE_MS = 3000;

/**
 * The swipe controls on the SOS page (SPEC 5.1; round 2, group 1.3): slide the handle all the way
 * to the end to confirm, like Apple's "slide to power off". Anything short of the end springs back,
 * so a brush in a pocket or a slip of the thumb does nothing.
 */

/** How close to the end the handle must be let go, in points, to count as a full swipe. */
export const SWIPE_END_TOLERANCE = 6;

/** How far the handle can travel along a track of this width. */
export function swipeTravel(trackWidth: number, thumbSize: number, padding: number): number {
  return Math.max(0, trackWidth - thumbSize - padding * 2);
}

/** Where the handle is drawn for a finger that has moved `dx` along the track. */
export function swipePosition(dx: number, travel: number): number {
  return Math.min(Math.max(dx, 0), travel);
}

/** True when the handle was let go at the end of the track: a full swipe. */
export function isFullSwipe(dx: number, travel: number): boolean {
  return travel > 0 && dx >= travel - SWIPE_END_TOLERANCE;
}

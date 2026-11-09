/**
 * The swipe controls on the SOS page (SPEC 5.1; round 2, groups 1.3 and 1.6). How far a swipe must
 * go (owner, 9 Nov 2026: natural to use, still deliberate): like Apple's slide-to-unlock, which
 * completes when the knob is dragged into an unlock region at the end of its channel and springs
 * back if let go short of it. Saakshi's region is the last 15% of the track, so a hurried thumb
 * can reach it:
 * - the swipe counts when the handle is let go past 85% of its track, or as soon as it reaches the
 *   end;
 * - let go short of that, it springs back and nothing happens;
 * - a quick flick that doesn't carry the handle there does nothing: only where the handle is
 *   counts, never how fast the finger moved;
 * - a light haptic tap marks the handle entering the region.
 */

/** Where the confirm region starts, as a fraction of the track. The one place this number lives. */
export const SWIPE_CONFIRM_FRACTION = 0.85;

/** How far the handle can travel along a track of this width. */
export function swipeTravel(trackWidth: number, thumbSize: number, padding: number): number {
  return Math.max(0, trackWidth - thumbSize - padding * 2);
}

/** Where the handle is drawn for a finger that has moved `dx` along the track. */
export function swipePosition(dx: number, travel: number): number {
  return Math.min(Math.max(dx, 0), travel);
}

/** True when the handle is in the confirm region (past 85% of the track). */
export function inConfirmRegion(dx: number, travel: number): boolean {
  return travel > 0 && swipePosition(dx, travel) >= travel * SWIPE_CONFIRM_FRACTION;
}

/** True when the handle has reached the end of the track: that counts at once. */
export function reachedEnd(dx: number, travel: number): boolean {
  return travel > 0 && dx >= travel;
}

/** True when the handle was let go in the confirm region: a full swipe. */
export function isFullSwipe(dx: number, travel: number): boolean {
  return inConfirmRegion(dx, travel);
}

import { createContext, type RefObject } from 'react';
import type { HostInstance } from 'react-native';

/**
 * Keeping text fields above the on-screen keyboard (round 2, group 1.1).
 *
 * Neither platform does this for us here. iOS's ScrollView can scroll the focused field itself into
 * view, but not the button under it. On Android, with edge-to-edge drawing, the window no longer
 * shrinks when the keyboard opens, so the keyboard simply covers the bottom of the page. So `Screen`
 * measures where the keyboard's top edge is, pads the page's end by as much as the keyboard covers
 * (so everything can still be scrolled to with the keyboard up), and scrolls the focused field, and
 * the rest of its group (such as an Add button), above the keyboard.
 *
 * The arithmetic is here, apart from the measuring, so that it can be tested.
 */

/** Space kept between a field and the keyboard, or the top of the page. */
export const KEYBOARD_MARGIN = 16;

/**
 * How much of the scroll view the keyboard covers: from the keyboard's top edge to the scroll
 * view's bottom edge, both in window coordinates. Zero when the window has already shrunk.
 */
export function keyboardOverlap(scrollView: { y: number; height: number }, keyboardTop: number | null): number {
  if (keyboardTop === null) return 0;
  return Math.max(0, Math.round(scrollView.y + scrollView.height - keyboardTop));
}

/** A box in the scroll view's content, measured from the content's top. */
export type ContentBox = { y: number; height: number };

export type RevealInput = {
  /** The scroll view's frame in the window. */
  scrollView: { y: number; height: number };
  /** The keyboard's top edge in the window. */
  keyboardTop: number;
  /** The focused field. */
  focused: ContentBox;
  /** The group the field belongs to (the field, its neighbours and their button), if any. */
  group: ContentBox | null;
  /** How far the content is scrolled now. */
  offset: number;
  margin?: number;
};

/**
 * Where to scroll so that the focused field, and as much of its group below it as fits, is between
 * the top of the page and the keyboard; null when it already is. The focused field always wins: if
 * the group is taller than the space left by the keyboard, the field goes to the top of that space
 * and the group's end is cut off, never the field.
 */
export function revealOffset({ scrollView, keyboardTop, focused, group, offset, margin = KEYBOARD_MARGIN }: RevealInput): number | null {
  const visible = Math.min(scrollView.y + scrollView.height, keyboardTop) - scrollView.y;
  if (visible <= 0) return null;
  const bottom = Math.max(focused.y + focused.height, group ? group.y + group.height : 0) + margin;
  // The lowest offset that shows the bottom, and the highest that keeps the field's top in view.
  const highest = focused.y - margin;
  const lowest = Math.min(bottom - visible, highest);
  if (offset < lowest) return Math.round(lowest);
  if (offset > highest) return Math.round(highest);
  return null;
}

/** Where a view is in the scroll view's content (`relativeTo` is the content's view), or null. */
export function measureInContent(node: HostInstance, relativeTo: HostInstance): Promise<ContentBox | null> {
  return new Promise((resolve) => {
    node.measureLayout(
      relativeTo,
      (_x, y, _width, height) => resolve({ y, height }),
      () => resolve(null),
    );
  });
}

/** What a text field tells the page it is on, when it is focused. */
export type KeyboardReveal = {
  /** A field was focused; `group` is the view to keep above the keyboard with it. */
  focused(group: RefObject<HostInstance | null> | null): void;
};

export const KeyboardRevealContext = createContext<KeyboardReveal | null>(null);

import { KEYBOARD_MARGIN, keyboardOverlap, revealOffset } from '../keyboard';

// Sizes in points, close to real phones. A small phone: iPhone SE (667 tall; the page starts under
// a 64-point header and ends at a 49-point tab bar). A large phone: 932 tall (iPhone 16 Pro Max).
const small = { y: 64, height: 667 - 64 - 49 };
const large = { y: 103, height: 932 - 103 - 83 };
// The keyboard's top edge: the number pad is 216 points tall on the small phone; the text keyboard
// with its suggestion bar is about 260, and taller again on the large phone.
const smallNumberPad = 667 - 216;
const smallText = 667 - 260;
const largeText = 932 - 336;

describe('keyboardOverlap', () => {
  it('is how much of the page the keyboard covers', () => {
    expect(keyboardOverlap(small, smallNumberPad)).toBe(64 + 554 - 451);
  });

  it('is nothing when the keyboard is down, or when the window has already shrunk above it', () => {
    expect(keyboardOverlap(small, null)).toBe(0);
    expect(keyboardOverlap({ y: 64, height: 300 }, smallNumberPad)).toBe(0);
  });
});

describe('revealOffset', () => {
  // The contacts form near the end of a page: a heading, the name field, the number field with its
  // hint, and Add. Hindi labels and hints are longer, so its group is taller.
  const english = { heading: 900, name: { y: 940, height: 86 }, phone: { y: 1042, height: 130 }, end: 1244 };
  const hindi = { heading: 900, name: { y: 940, height: 116 }, phone: { y: 1072, height: 190 }, end: 1334 };

  for (const [language, form] of [
    ['English', english],
    ['Hindi', hindi],
  ] as const) {
    const group = { y: form.heading, height: form.end - form.heading };

    it(`shows the number field and Add above the number pad on a small phone (${language})`, () => {
      const to = revealOffset({ scrollView: small, keyboardTop: smallNumberPad, focused: form.phone, group, offset: 0 });
      expect(to).not.toBeNull();
      const visibleTop = small.y;
      const visibleBottom = smallNumberPad;
      // Where things are on screen after scrolling to `to`.
      const onScreen = (contentY: number) => small.y + contentY - (to as number);
      expect(onScreen(form.phone.y)).toBeGreaterThanOrEqual(visibleTop);
      expect(onScreen(form.end)).toBeLessThanOrEqual(visibleBottom - KEYBOARD_MARGIN);
    });

    it(`shows the name field above the text keyboard on both phones (${language})`, () => {
      for (const [page, keyboardTop] of [
        [small, smallText],
        [large, largeText],
      ] as const) {
        const to = revealOffset({ scrollView: page, keyboardTop, focused: form.name, group, offset: 0 }) as number;
        const onScreen = (contentY: number) => page.y + contentY - to;
        expect(onScreen(form.name.y)).toBeGreaterThanOrEqual(page.y);
        expect(onScreen(form.name.y + form.name.height)).toBeLessThanOrEqual(keyboardTop);
      }
    });
  }

  it('puts the focused field first when the whole group does not fit', () => {
    // A group taller than the space left above the keyboard: the field stays in view, at the top.
    const focused = { y: 1000, height: 86 };
    const group = { y: 990, height: 600 };
    expect(revealOffset({ scrollView: small, keyboardTop: smallText, focused, group, offset: 0 })).toBe(1000 - KEYBOARD_MARGIN);
  });

  it('does not scroll when the field and its group are already in view', () => {
    const focused = { y: 100, height: 86 };
    const group = { y: 80, height: 200 };
    expect(revealOffset({ scrollView: small, keyboardTop: smallText, focused, group, offset: 0 })).toBeNull();
  });

  it('scrolls back up to a field that is above the page', () => {
    const focused = { y: 100, height: 86 };
    expect(revealOffset({ scrollView: small, keyboardTop: smallText, focused, group: null, offset: 400 })).toBe(100 - KEYBOARD_MARGIN);
  });

  it('does nothing when the keyboard covers the whole page', () => {
    expect(revealOffset({ scrollView: small, keyboardTop: 50, focused: { y: 0, height: 50 }, group: null, offset: 0 })).toBeNull();
  });
});

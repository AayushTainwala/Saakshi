import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type HostInstance,
  Keyboard,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
} from 'react-native';

import { spacing, useTheme } from '@/theme';

import { keyboardOverlap, type KeyboardReveal, KeyboardRevealContext, measureInContent, revealOffset } from './keyboard';

/**
 * A scrolling page with the app's background and gutters.
 *
 * It keeps text fields above the on-screen keyboard (round 2, group 1.1; the arithmetic is in
 * `keyboard.ts`): the page's end is padded by as much as the keyboard covers, so that everything on
 * it can still be scrolled to with the keyboard up, and the focused field, with the rest of its
 * `KeyboardGroup`, is scrolled above the keyboard. A tap on a button works while the keyboard is up
 * (`keyboardShouldPersistTaps`), instead of only closing the keyboard.
 */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const keyboardTop = useRef<number | null>(null);
  const offset = useRef(0);
  const group = useRef<RefObject<HostInstance | null> | null>(null);
  const [overlap, setOverlap] = useState(0);
  const [revealRequest, setRevealRequest] = useState(0);

  /** Measures how much the keyboard covers, and optionally asks for the focused field to be shown. */
  const measure = useCallback((andReveal: boolean) => {
    const native = scroll.current?.getNativeScrollRef();
    if (!native) return;
    native.measureInWindow((_x, y, _width, height) => {
      setOverlap(keyboardOverlap({ y, height }, keyboardTop.current));
      if (andReveal) setRevealRequest((n) => n + 1);
    });
  }, []);

  const reveal = useCallback(async () => {
    const view = scroll.current;
    const native = view?.getNativeScrollRef();
    const inner = view?.getInnerViewRef();
    const input = TextInput.State.currentlyFocusedInput();
    if (!view || !native || !inner || !input) return;
    const page = await new Promise<{ y: number; height: number }>((resolve) =>
      native.measureInWindow((_x, y, _width, height) => resolve({ y, height })),
    );
    const focused = await measureInContent(input, inner);
    const groupView = group.current?.current;
    const box = groupView ? await measureInContent(groupView, inner) : null;
    const top = keyboardTop.current;
    if (!focused || top === null) return;
    const to = revealOffset({ scrollView: page, keyboardTop: top, focused, group: box, offset: offset.current });
    if (to !== null) view.scrollTo({ y: to, animated: true });
  }, []);

  // Reveal once the padding for the keyboard has been laid out.
  useEffect(() => {
    if (revealRequest === 0) return;
    const frame = requestAnimationFrame(() => void reveal());
    return () => cancelAnimationFrame(frame);
  }, [revealRequest, reveal]);

  useEffect(() => {
    const moving = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure(false);
    };
    const shown = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure(true);
    };
    const hidden = () => {
      keyboardTop.current = null;
      setOverlap(0);
    };
    // iOS says where the keyboard will be before it moves; Android only once it is there.
    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillShow', moving),
            Keyboard.addListener('keyboardDidShow', shown),
            Keyboard.addListener('keyboardWillHide', hidden),
          ]
        : [Keyboard.addListener('keyboardDidShow', shown), Keyboard.addListener('keyboardDidHide', hidden)];
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [measure]);

  const context = useMemo<KeyboardReveal>(
    () => ({
      focused(target) {
        group.current = target;
        // With the keyboard already up (moving from one field to the next), no keyboard event comes.
        if (keyboardTop.current !== null) setRevealRequest((n) => n + 1);
      },
    }),
    [],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  // If the window did shrink for the keyboard after all, the padding comes off again.
  const onLayout = useCallback(() => {
    if (keyboardTop.current !== null) measure(false);
  }, [measure]);

  return (
    <KeyboardRevealContext.Provider value={context}>
      <ScrollView
        ref={scroll}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, overlap > 0 ? { paddingBottom: spacing.md + overlap } : null]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={onLayout}>
        {children}
      </ScrollView>
    </KeyboardRevealContext.Provider>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
});

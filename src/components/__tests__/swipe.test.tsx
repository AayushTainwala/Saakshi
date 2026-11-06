import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { isFullSwipe, SWIPE_END_TOLERANCE, swipePosition, swipeTravel } from '../swipe';
import { SwipeControl } from '../SwipeControl';

describe('the swipe rule', () => {
  it('measures how far the handle can go', () => {
    expect(swipeTravel(343, 64, 6)).toBe(267);
    expect(swipeTravel(50, 64, 6)).toBe(0);
  });

  it('keeps the handle on the track', () => {
    expect(swipePosition(-20, 267)).toBe(0);
    expect(swipePosition(100, 267)).toBe(100);
    expect(swipePosition(400, 267)).toBe(267);
  });

  it('needs the handle let go at the end', () => {
    expect(isFullSwipe(267, 267)).toBe(true);
    expect(isFullSwipe(300, 267)).toBe(true);
    expect(isFullSwipe(267 - SWIPE_END_TOLERANCE, 267)).toBe(true);
    expect(isFullSwipe(267 - SWIPE_END_TOLERANCE - 1, 267)).toBe(false);
    expect(isFullSwipe(200, 267)).toBe(false);
    // Before the track has been measured, nothing counts.
    expect(isFullSwipe(500, 0)).toBe(false);
  });
});

/** A finger on the handle, as React Native's responder system reports it. */
function finger(current: number, previous: number, time: number) {
  return {
    nativeEvent: { touches: [{ pageX: current, pageY: 0 }], changedTouches: [] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: time,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          startTimeStamp: 0,
          currentPageX: current,
          currentPageY: 0,
          currentTimeStamp: time,
          previousPageX: previous,
          previousPageY: 0,
          previousTimeStamp: Math.max(0, time - 1),
        },
      ],
    },
  };
}

/** Puts a finger on the handle, moves it `to` points in steps, and lets go. */
async function slide(to: number) {
  const handle = screen.getByTestId('swipe-handle');
  const call = (name: string, event: unknown) => (handle.props[name] as (e: unknown) => unknown)(event);
  await act(async () => {
    call('onStartShouldSetResponderCapture', finger(0, 0, 1));
    expect(call('onStartShouldSetResponder', finger(0, 0, 1))).toBe(true);
    call('onResponderGrant', finger(0, 0, 1));
    let at = 0;
    let time = 2;
    while (at < to) {
      const next = Math.min(to, at + 40);
      call('onResponderMove', finger(next, at, time++));
      at = next;
    }
    call('onResponderRelease', finger(at, at, time));
  });
}

describe('SwipeControl', () => {
  beforeAll(() => {
    initI18n('en');
  });

  async function renderSwipe(onConfirm: () => void) {
    await render(
      <PreferencesProvider initial={{ language: 'en', theme: 'light' }}>
        <SwipeControl
          testID="swipe"
          tone="danger"
          label="Call 112"
          detail="Calls India's emergency number"
          confirm={{ title: 'Call 112?', body: 'Your phone will call 112.', action: 'Call 112' }}
          onConfirm={onConfirm}
        />
      </PreferencesProvider>,
    );
    // The track is 343 points wide: the handle can travel 267.
    await fireEvent(screen.getByTestId('swipe'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 76 } } });
  }

  it('does nothing for a partial swipe', async () => {
    const onConfirm = jest.fn();
    await renderSwipe(onConfirm);
    await slide(200);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms on a full swipe, once', async () => {
    jest.useFakeTimers();
    try {
      const onConfirm = jest.fn();
      await renderSwipe(onConfirm);
      await slide(270);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      // A second swipe straight after, while it springs back, is not taken.
      const handle = screen.getByTestId('swipe-handle');
      expect((handle.props.onStartShouldSetResponder as (e: unknown) => boolean)(finger(0, 0, 100))).toBe(false);
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('with a screen reader: a double tap opens a plain confirmation, and only Confirm acts', async () => {
    const onConfirm = jest.fn();
    await renderSwipe(onConfirm);
    const control = screen.getByRole('button', { name: "Call 112. Calls India's emergency number" });
    expect(control.props.accessibilityHint).toBe('Double-tap, then confirm.');

    await fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByText('Call 112?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    await fireEvent.press(screen.getAllByRole('button', { name: 'Call 112' }).at(-1)!);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

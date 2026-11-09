import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { initI18n } from '@/i18n';
import { PreferencesProvider } from '@/preferences/PreferencesProvider';

import { inConfirmRegion, isFullSwipe, reachedEnd, SWIPE_CONFIRM_FRACTION, swipePosition, swipeTravel } from '../swipe';
import { SwipeControl } from '../SwipeControl';

const mockTap = jest.fn();
jest.mock('@/platform/haptics', () => ({ tapLight: () => mockTap() }));

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

  it('counts the handle let go past 85% of its track (round 2, group 1.6)', () => {
    expect(SWIPE_CONFIRM_FRACTION).toBe(0.85);
    // 85% of 267 points is 226.95.
    expect(isFullSwipe(227, 267)).toBe(true);
    expect(isFullSwipe(226, 267)).toBe(false);
    expect(isFullSwipe(267, 267)).toBe(true);
    expect(isFullSwipe(300, 267)).toBe(true);
    expect(isFullSwipe(200, 267)).toBe(false);
    expect(inConfirmRegion(227, 267)).toBe(true);
    expect(inConfirmRegion(-5, 267)).toBe(false);
    // Before the track has been measured, nothing counts.
    expect(isFullSwipe(500, 0)).toBe(false);
    expect(reachedEnd(500, 0)).toBe(false);
  });

  it('counts reaching the end at once', () => {
    expect(reachedEnd(267, 267)).toBe(true);
    expect(reachedEnd(266, 267)).toBe(false);
  });

  it('works the same on a small phone and a large one', () => {
    // An iPhone SE track (320 points wide, 16-point margins: 288) and a Pro Max one (440: 408).
    for (const width of [288, 408]) {
      const travel = swipeTravel(width, 64, 6);
      expect(isFullSwipe(Math.ceil(travel * 0.85), travel)).toBe(true);
      expect(isFullSwipe(Math.floor(travel * 0.85) - 1, travel)).toBe(false);
    }
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

/**
 * Puts a finger on the handle, moves it `to` points in steps of `step` (one big step is a quick
 * flick), and lets go unless `hold`.
 */
async function slide(to: number, { step = 40, hold = false }: { step?: number; hold?: boolean } = {}) {
  const handle = screen.getByTestId('swipe-handle');
  const call = (name: string, event: unknown) => (handle.props[name] as (e: unknown) => unknown)(event);
  await act(async () => {
    call('onStartShouldSetResponderCapture', finger(0, 0, 1));
    expect(call('onStartShouldSetResponder', finger(0, 0, 1))).toBe(true);
    call('onResponderGrant', finger(0, 0, 1));
    let at = 0;
    let time = 2;
    while (at < to) {
      const next = Math.min(to, at + step);
      call('onResponderMove', finger(next, at, time++));
      at = next;
    }
    if (!hold) call('onResponderRelease', finger(at, at, time));
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

  beforeEach(() => mockTap.mockClear());

  it('does nothing for a partial swipe, and gives no tap short of the region', async () => {
    const onConfirm = jest.fn();
    await renderSwipe(onConfirm);
    await slide(200);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(mockTap).not.toHaveBeenCalled();
  });

  it('does nothing for a quick flick that does not carry the handle into the region', async () => {
    const onConfirm = jest.fn();
    await renderSwipe(onConfirm);
    // One fast move of 220 points (short of 227), let go at once.
    await slide(220, { step: 220 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms when let go past 85%, with one light tap on entering the region', async () => {
    jest.useFakeTimers();
    try {
      const onConfirm = jest.fn();
      await renderSwipe(onConfirm);
      await slide(230, { step: 10 });
      expect(mockTap).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('confirms as soon as the handle reaches the end, before the finger is lifted, and only once', async () => {
    jest.useFakeTimers();
    try {
      const onConfirm = jest.fn();
      await renderSwipe(onConfirm);
      await slide(300, { hold: true });
      expect(onConfirm).toHaveBeenCalledTimes(1);
      // The finger keeps moving and then lifts: nothing more counts, even once the handle is back.
      const handle = screen.getByTestId('swipe-handle');
      const call = (name: string, event: unknown) => (handle.props[name] as (e: unknown) => unknown)(event);
      await act(async () => {
        jest.advanceTimersByTime(2000);
        call('onResponderMove', finger(310, 300, 50));
        call('onResponderRelease', finger(310, 310, 51));
      });
      expect(onConfirm).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('taps again if the handle leaves the region and comes back', async () => {
    const onConfirm = jest.fn();
    await renderSwipe(onConfirm);
    const handle = screen.getByTestId('swipe-handle');
    const call = (name: string, event: unknown) => (handle.props[name] as (e: unknown) => unknown)(event);
    await act(async () => {
      call('onStartShouldSetResponderCapture', finger(0, 0, 1));
      call('onStartShouldSetResponder', finger(0, 0, 1));
      call('onResponderGrant', finger(0, 0, 1));
      call('onResponderMove', finger(240, 0, 2));
      call('onResponderMove', finger(230, 240, 3));
      call('onResponderMove', finger(150, 230, 4));
      call('onResponderMove', finger(235, 150, 5));
      call('onResponderMove', finger(100, 235, 6));
      call('onResponderRelease', finger(100, 100, 7));
    });
    expect(mockTap).toHaveBeenCalledTimes(2);
    // Let go back at 100 points: it springs back.
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

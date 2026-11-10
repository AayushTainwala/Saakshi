import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type AccessibilityActionEvent, Animated, Modal, PanResponder, StyleSheet, View } from 'react-native';

import { tapLight } from '@/platform/haptics';
import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { inConfirmRegion, isFullSwipe, reachedEnd, swipePosition, swipeTravel } from './swipe';

export type SwipeTone = 'danger' | 'primary' | 'secondary';

const THUMB = 64;
const PAD = 6;

export type SwipeControlProps = {
  /** What the swipe does, on the track: "Call 112". */
  label: string;
  /** A line under it: "Alerts your trusted contacts". */
  detail?: string;
  tone: SwipeTone;
  /** The plain confirmation a screen-reader user gets in place of the swipe. */
  confirm: { title: string; body: string; action: string };
  onConfirm: () => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * One swipe's gesture: follows the finger along the track. It confirms when the handle is let go
 * past 85% of the track, or as soon as it reaches the end; anything less springs back (swipe.ts).
 * Only where the handle is counts, never how fast the finger moved, so a flick that doesn't carry
 * the handle there does nothing. A light tap marks the handle entering the confirm region. Made
 * once per control, so a re-render in the middle of a swipe can't hand the finger to a new
 * responder.
 */
class SwipeGesture {
  readonly position = new Animated.Value(0);
  private travel = 0;
  /** From a confirm until the handle is back at the start: no new swipe is taken. */
  private locked = false;
  /** This finger's swipe has confirmed: nothing more it does counts. */
  private done = false;
  /** Whether the handle is in the confirm region, to tap once as it enters. */
  private inRegion = false;
  private onConfirm: () => void = () => undefined;
  private disabled = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly haptic: () => void = tapLight) {}

  readonly responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !this.disabled && !this.locked,
    onMoveShouldSetPanResponder: () => !this.disabled && !this.locked,
    // Keep the swipe once it has started, even if the page would like to scroll.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      this.done = false;
      this.inRegion = false;
    },
    onPanResponderMove: (_event, move) => {
      if (this.done) return;
      this.position.setValue(swipePosition(move.dx, this.travel));
      const entered = inConfirmRegion(move.dx, this.travel);
      if (entered && !this.inRegion) this.haptic();
      this.inRegion = entered;
      if (reachedEnd(move.dx, this.travel)) this.confirm();
    },
    onPanResponderRelease: (_event, move) => {
      if (this.done) return;
      if (isFullSwipe(move.dx, this.travel)) this.confirm();
      else this.springBack();
    },
    onPanResponderTerminate: () => {
      if (!this.done) this.springBack();
    },
  });

  update(onConfirm: () => void, disabled: boolean): void {
    this.onConfirm = onConfirm;
    this.disabled = disabled;
  }

  measure(trackWidth: number): void {
    this.travel = swipeTravel(trackWidth, THUMB, PAD);
  }

  private confirm(): void {
    this.done = true;
    this.locked = true;
    this.position.setValue(this.travel);
    this.onConfirm();
    this.timer = setTimeout(() => this.springBack(), 700);
  }

  /** The control has gone: nothing may move it any more. */
  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.position.stopAnimation();
  }

  private springBack(): void {
    this.timer = null;
    Animated.spring(this.position, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start(() => {
      this.locked = false;
    });
  }
}

/**
 * Slide to confirm (SPEC 5.1). The handle must be let go past 85% of the track, or reach its end;
 * short of that it springs back. With a screen reader on, the control is one button: a double tap
 * opens a plain confirmation sheet, so a person who can't swipe isn't shut out.
 */
export function SwipeControl({ label, detail, tone, confirm, onConfirm, disabled = false, testID }: SwipeControlProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [gesture] = useState(() => new SwipeGesture());
  useEffect(() => {
    gesture.update(onConfirm, disabled);
  }, [gesture, onConfirm, disabled]);
  useEffect(() => () => gesture.dispose(), [gesture]);

  const background = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.surface;
  const foreground = tone === 'danger' ? colors.onDanger : tone === 'primary' ? colors.onPrimary : colors.text;
  const thumbColor = tone === 'secondary' ? colors.danger : foreground;
  const arrowColor = tone === 'secondary' ? colors.onDanger : background;

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate' && !disabled) setConfirming(true);
  };

  return (
    <>
      <View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={detail ? `${label}. ${detail}` : label}
        accessibilityHint={t('swipe.a11yHint')}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate', label }]}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={(event) => gesture.measure(event.nativeEvent.layout.width)}
        style={[
          styles.track,
          { backgroundColor: background, borderColor: tone === 'secondary' ? colors.border : background, opacity: disabled ? 0.5 : 1 },
        ]}>
        <View style={styles.text} pointerEvents="none">
          <AppText variant="label" style={{ color: foreground, textAlign: 'center' }}>
            {label}
          </AppText>
          <AppText variant="small" style={{ color: foreground, textAlign: 'center' }}>
            {detail ? `${detail} · ${t('swipe.hint')}` : t('swipe.hint')}
          </AppText>
        </View>
        <Animated.View
          testID={testID ? `${testID}-handle` : undefined}
          {...gesture.responder.panHandlers}
          style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX: gesture.position }] }]}>
          <AppText variant="title" style={{ color: arrowColor }}>
            →
          </AppText>
        </Animated.View>
      </View>

      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <View style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}>
          <Card>
            <AppText variant="heading" accessibilityRole="header">
              {confirm.title}
            </AppText>
            <AppText>{confirm.body}</AppText>
            <Button
              variant={tone === 'primary' ? 'primary' : 'danger'}
              label={confirm.action}
              onPress={() => {
                setConfirming(false);
                onConfirm();
              }}
            />
            <Button variant="secondary" label={t('actions.cancel')} onPress={() => setConfirming(false)} />
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: THUMB + PAD * 2,
    borderRadius: (THUMB + PAD * 2) / 2,
    borderWidth: 2,
    justifyContent: 'center',
    padding: PAD,
  },
  text: {
    paddingLeft: THUMB + spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  thumb: {
    position: 'absolute',
    left: PAD,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
});


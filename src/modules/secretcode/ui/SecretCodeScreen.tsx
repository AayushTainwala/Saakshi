import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { spacing, useTheme } from '@/theme';

import { checkNewCode, type CodeProblem } from '../code';
import { resetWithPhonePasscode, secretCode, useSecretCode } from '../instance';
import { type CodeScreenMode, settleCodeRequest } from '../request';
import { type Protected, whatIsRunning } from '../running';
import type { SecretCodeState, VerifyResult } from '../store';
import { CodeKeys } from './CodeKeys';

type Step = 'current' | 'new' | 'repeat';
type Message = { text: string; tone: 'danger' | 'success' | 'textMuted' };

/** A wait in plain words: "30 seconds", "2 minutes", "1 hour". */
export function waitInWords(ms: number, t: TFunction<'secretcode'>): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds < 60) return t('wait.seconds', { count: seconds });
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return t('wait.minutes', { count: minutes });
  return t('wait.hours', { count: Math.ceil(minutes / 60) });
}

function firstStep(mode: CodeScreenMode, state: SecretCodeState): Step {
  if (mode === 'set') return 'new';
  return state.set ? 'current' : 'new';
}

/** Ticks every second while a wait runs, so the screen counts down, on the store's clock. */
function useNow(until: number | null): number {
  const [now, setNow] = useState(() => secretCode.now());
  useEffect(() => {
    const tick = () => {
      const time = secretCode.now();
      setNow(time);
      if (until === null || time >= until) clearInterval(timer);
    };
    // At once (a new wait may start long after the screen opened), then every second.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [until]);
  return now;
}

/**
 * The one code screen (SPEC 5.3; round 2, group 1.2), used by every Stop and by Settings: enter the
 * code, set it, change it or remove it. What it shows follows the stored state at once.
 */
export function SecretCodeScreen({
  mode,
  reason,
  onDone,
}: {
  mode: CodeScreenMode;
  reason?: Protected;
  onDone: (ok: boolean) => void;
}) {
  const { t } = useTranslation('secretcode');
  const { colors } = useTheme();
  const state = useSecretCode();
  const [chosenStep, setStep] = useState<Step | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(state.waitUntil);

  if (!state.loaded) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <AppText>{t('loading')}</AppText>
      </SafeAreaView>
    );
  }

  const step = chosenStep ?? firstStep(mode, state);
  const waiting = step === 'current' && state.waitUntil !== null && now < state.waitUntil;
  // No reset while something runs: whoever holds the phone and its passcode could otherwise reset
  // the code and switch the protection off.
  const canReset = step === 'current' && whatIsRunning().length === 0;

  const refused = (problem: CodeProblem | 'already-set'): string =>
    problem === 'repeated' ? t('refused.repeated') : problem === 'run' ? t('refused.run') : problem === 'already-set' ? t('refused.alreadySet') : t('refused.format');

  const failed = (result: Exclude<VerifyResult, { ok: true }>): Message => {
    if (result.reason === 'none') return { text: t('none'), tone: 'danger' };
    if (result.reason === 'wait') return { text: t('waiting', { wait: waitInWords(result.waitUntil - secretCode.now(), t) }), tone: 'danger' };
    return {
      text: result.waitUntil ? t('wrongWait', { wait: waitInWords(result.waitUntil - secretCode.now(), t) }) : t('wrong'),
      tone: 'danger',
    };
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch {
      setMessage({ text: t('readFailed'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const complete = (code: string) =>
    run(async () => {
      if (step === 'current') {
        if (mode === 'remove') {
          const result = await secretCode.removeCode(code);
          return result.ok ? onDone(true) : setMessage(failed(result));
        }
        const result = await secretCode.verify(code);
        if (!result.ok) return setMessage(failed(result));
        if (mode === 'change') {
          setCurrent(code);
          setMessage(null);
          return setStep('new');
        }
        return onDone(true);
      }
      if (step === 'new') {
        const problem = checkNewCode(code);
        if (problem) return setMessage({ text: refused(problem), tone: 'danger' });
        setFirst(code);
        setMessage(null);
        return setStep('repeat');
      }
      // step === 'repeat'
      if (code !== first) {
        setFirst(null);
        setStep('new');
        return setMessage({ text: t('mismatch'), tone: 'danger' });
      }
      const result = mode === 'change' && current ? await secretCode.changeCode(current, code) : await secretCode.setCode(code);
      if (result.ok) return onDone(true);
      setFirst(null);
      if (result.reason === 'wrong' || result.reason === 'wait') {
        // The current code stopped matching meanwhile (changed elsewhere): start again from it.
        setCurrent(null);
        setStep('current');
        return setMessage(failed(result));
      }
      setStep('new');
      setMessage(result.reason === 'none' ? failed(result) : { text: refused(result.reason), tone: 'danger' });
    });

  const reset = () =>
    run(async () => {
      const outcome = await resetWithPhonePasscode();
      if (outcome === 'reset') {
        if (mode === 'remove') return onDone(true);
        setCurrent(null);
        setFirst(null);
        setStep('new');
        return setMessage({ text: t('reset.done'), tone: 'success' });
      }
      if (outcome === 'no-passcode') return setMessage({ text: t('reset.noPasscode'), tone: 'danger' });
      if (outcome === 'running') return setMessage({ text: t('reset.running'), tone: 'danger' });
      setMessage(null);
    });

  const heading =
    mode === 'confirm' ? (state.set ? t(`reason.${reason ?? 'any'}`) : t('setFirst.heading')) : t(`heading.${mode}`);
  const prompt = step === 'current' ? t('prompt.current') : step === 'new' ? t('prompt.new') : t('prompt.repeat');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Button variant="secondary" label={t('cancel')} onPress={() => onDone(false)} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <AppText variant="heading" accessibilityRole="header">
          {heading}
        </AppText>
        {mode === 'confirm' && !state.set ? <AppText>{t('setFirst.body')}</AppText> : null}
        {(mode === 'set' || (mode === 'confirm' && !state.set)) && step !== 'current' ? <AppText color="textMuted">{t('about')}</AppText> : null}
        <AppText variant="label">{prompt}</AppText>
        {waiting && state.waitUntil !== null ? (
          <AppText color="danger" accessibilityLiveRegion="polite">
            {t('waiting', { wait: waitInWords(state.waitUntil - now, t) })}
          </AppText>
        ) : message ? (
          <AppText color={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </AppText>
        ) : null}
        <CodeKeys onComplete={(code) => void complete(code)} disabled={busy || waiting} />
        {canReset ? <Button variant="secondary" label={t('reset.button')} disabled={busy} onPress={() => void reset()} /> : null}
        {canReset ? <AppText color="textMuted">{t('reset.explain')}</AppText> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The route's side: shows the screen for a request from `openCodeScreen`, and answers the request
 * when the screen is done or goes away (backing out answers false).
 */
export function SecretCodeRoute({ mode, reason, request, close }: { mode: CodeScreenMode; reason?: Protected; request?: string; close: () => void }) {
  useEffect(() => () => settleCodeRequest(request, false), [request]);
  return (
    <SecretCodeScreen
      mode={mode}
      reason={reason}
      onDone={(ok) => {
        settleCodeRequest(request, ok);
        close();
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.md, gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'flex-start' },
  body: { gap: spacing.md, paddingBottom: spacing.xl },
});

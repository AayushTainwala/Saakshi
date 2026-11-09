import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, TextField } from '@/components';
import { spacing, useTheme } from '@/theme';

import { checkNewCode, type CodeProblem } from '../code';
import { resetWithPhonePasscode, resetWithRecoveryCode, secretCode, useResetMethod, useSecretCode } from '../instance';
import { formatRecoveryCode, spellRecoveryCode } from '../recovery';
import type { ResetMethod } from '../reset';
import { type CodeScreenMode, settleCodeRequest } from '../request';
import { type Protected, whatIsRunning } from '../running';
import type { RecoveryResult, SecretCodeState, VerifyResult } from '../store';
import { CodeKeys } from './CodeKeys';

type Step = 'current' | 'new' | 'repeat' | 'recovery-entry' | 'recovery-show';
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
  if (mode === 'recovery') return 'current';
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

/** What the screen says a forgotten code can be reset with, on this phone. */
function aboutKey(method: ResetMethod): 'about.passcode' | 'about.recovery' | 'about.none' {
  return method === 'passcode' ? 'about.passcode' : method === 'recovery' ? 'about.recovery' : 'about.none';
}

/**
 * The one code screen (SPEC 5.3; round 2, groups 1.2 and 1.6), used by every Stop and by Settings:
 * enter the code, set it, change it, remove it, or make a new recovery code. What it shows follows
 * the stored state at once.
 *
 * On a phone with no screen lock, setting the code also makes a recovery code, shown here once
 * (except when the code is set to start "My phone is being taken": nobody should have to copy a
 * code down then; Saakshi asks for one later, `RecoveryCodeReminder`).
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
  const method = useResetMethod();
  const [chosenStep, setStep] = useState<Step | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  // Shown once: kept only in this screen's memory until "I have written it down".
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryInput, setRecoveryInput] = useState('');
  const now = useNow(state.waitUntil);

  if (!state.loaded) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <AppText>{t('loading')}</AppText>
      </SafeAreaView>
    );
  }

  const step = chosenStep ?? firstStep(mode, state);
  const waiting = (step === 'current' || step === 'recovery-entry') && state.waitUntil !== null && now < state.waitUntil;
  // No reset while something runs: whoever holds the phone and its passcode could otherwise reset
  // the code and switch the protection off.
  const canReset = step === 'current' && mode !== 'recovery' && whatIsRunning().length === 0;
  // A new code on a phone with no screen lock comes with a recovery code, except when it is set to
  // start "My phone is being taken" at once.
  const makesRecovery = method === 'recovery' && !(mode === 'set' && reason === 'phone-taken');

  const refused = (problem: CodeProblem | 'already-set'): string =>
    problem === 'repeated' ? t('refused.repeated') : problem === 'run' ? t('refused.run') : problem === 'already-set' ? t('refused.alreadySet') : t('refused.format');

  const failed = (result: Exclude<VerifyResult, { ok: true }>, words: 'code' | 'recovery' = 'code'): Message => {
    if (result.reason === 'none') return { text: t('none'), tone: 'danger' };
    if (result.reason === 'wait') return { text: t('waiting', { wait: waitInWords(result.waitUntil - secretCode.now(), t) }), tone: 'danger' };
    const wrong = words === 'code' ? 'wrong' : 'recovery.wrong';
    const wrongWait = words === 'code' ? 'wrongWait' : 'recovery.wrongWait';
    return {
      text: result.waitUntil ? t(wrongWait, { wait: waitInWords(result.waitUntil - secretCode.now(), t) }) : t(wrong),
      tone: 'danger',
    };
  };

  const recoveryRefused = (result: Exclude<RecoveryResult, { ok: true }>): Message => {
    if (result.reason === 'format') return { text: t('recovery.format'), tone: 'danger' };
    if (result.reason === 'no-recovery') return { text: t('reset.noRecovery'), tone: 'danger' };
    return failed(result, 'recovery');
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

  /** The code was reset (passcode or recovery code): choose a new one, or done if removing. */
  const afterReset = () => {
    if (mode === 'remove') return onDone(true);
    setCurrent(null);
    setFirst(null);
    setRecoveryInput('');
    setStep('new');
    setMessage({ text: t('reset.done'), tone: 'success' });
  };

  /** A code was set or changed: show a new recovery code first, if one was made. */
  const finished = (made?: string) => {
    if (!made) return onDone(true);
    setRecoveryCode(made);
    setMessage(null);
    setStep('recovery-show');
  };

  const complete = (code: string) =>
    run(async () => {
      if (step === 'current') {
        if (mode === 'remove') {
          const result = await secretCode.removeCode(code);
          return result.ok ? onDone(true) : setMessage(failed(result));
        }
        if (mode === 'recovery') {
          const result = await secretCode.newRecoveryCode(code);
          return result.ok ? finished(result.recoveryCode) : setMessage(failed(result));
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
      const result =
        mode === 'change' && current ? await secretCode.changeCode(current, code) : await secretCode.setCode(code, { recovery: makesRecovery });
      if (result.ok) return finished(result.recoveryCode);
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

  const forgot = () => {
    if (method === 'none') return setMessage({ text: t('reset.oldAndroid'), tone: 'danger' });
    if (method === 'recovery') {
      if (!state.recovery) return setMessage({ text: t('reset.noRecovery'), tone: 'danger' });
      setMessage(null);
      return setStep('recovery-entry');
    }
    void run(async () => {
      const outcome = await resetWithPhonePasscode();
      if (outcome === 'reset') return afterReset();
      if (outcome === 'no-passcode') return setMessage({ text: t('reset.noPasscode'), tone: 'danger' });
      if (outcome === 'running') return setMessage({ text: t('reset.running'), tone: 'danger' });
      if (outcome === 'failed') return setMessage({ text: t('reset.failed'), tone: 'danger' });
      if (outcome === 'unavailable') return setMessage({ text: t('reset.unavailable'), tone: 'danger' });
      setMessage(null);
    });
  };

  const submitRecovery = () =>
    run(async () => {
      const result = await resetWithRecoveryCode(recoveryInput);
      if (result.outcome === 'reset') return afterReset();
      if (result.outcome === 'running') return setMessage({ text: t('reset.running'), tone: 'danger' });
      setMessage(recoveryRefused(result.result));
    });

  const shownMessage =
    waiting && state.waitUntil !== null ? (
      <AppText color="danger" accessibilityLiveRegion="polite">
        {t('waiting', { wait: waitInWords(state.waitUntil - now, t) })}
      </AppText>
    ) : message ? (
      <AppText color={message.tone} accessibilityLiveRegion="polite">
        {message.text}
      </AppText>
    ) : null;

  if (step === 'recovery-show' && recoveryCode) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.body}>
          <AppText variant="heading" accessibilityRole="header">
            {t('recovery.show.heading')}
          </AppText>
          <Card>
            <AppText variant="title" style={styles.recoveryCode} accessibilityLabel={spellRecoveryCode(recoveryCode)} selectable={false}>
              {formatRecoveryCode(recoveryCode)}
            </AppText>
          </Card>
          <AppText>{t('recovery.show.body')}</AppText>
          <AppText color="textMuted">{t('recovery.show.once')}</AppText>
          <Button
            label={t('recovery.show.done')}
            onPress={() => {
              setRecoveryCode(null);
              onDone(true);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'recovery-entry') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.top}>
          <Button variant="secondary" label={t('cancel')} onPress={() => onDone(false)} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <AppText variant="heading" accessibilityRole="header">
            {t('recovery.enter.heading')}
          </AppText>
          <AppText color="textMuted">{t('reset.explain.recovery')}</AppText>
          <TextField
            label={t('recovery.enter.label')}
            hint={t('recovery.enter.hint')}
            value={recoveryInput}
            onChangeText={setRecoveryInput}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            editable={!busy && !waiting}
            onSubmitEditing={() => void submitRecovery()}
          />
          {shownMessage}
          <Button label={t('recovery.enter.submit')} disabled={busy || waiting} onPress={() => void submitRecovery()} />
          <Button
            variant="secondary"
            label={t('recovery.enter.back')}
            onPress={() => {
              setMessage(null);
              setStep('current');
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const heading =
    mode === 'confirm'
      ? state.set
        ? t(`reason.${reason ?? 'any'}`)
        : t('setFirst.heading')
      : mode === 'recovery'
        ? t(state.recovery ? 'heading.recoveryNew' : 'heading.recovery')
        : t(`heading.${mode}`);
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
        {mode === 'recovery' ? <AppText>{t('recovery.make.body')}</AppText> : null}
        {(mode === 'set' || (mode === 'confirm' && !state.set)) && step !== 'current' ? (
          <AppText color="textMuted">{t(aboutKey(method))}</AppText>
        ) : null}
        <AppText variant="label">{prompt}</AppText>
        {shownMessage}
        <CodeKeys onComplete={(code) => void complete(code)} disabled={busy || waiting} />
        {canReset ? <Button variant="secondary" label={t('reset.button')} disabled={busy} onPress={forgot} /> : null}
        {canReset ? <AppText color="textMuted">{t(`reset.explain.${method}`)}</AppText> : null}
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
  recoveryCode: { textAlign: 'center', letterSpacing: 2, fontVariant: ['tabular-nums'] },
});

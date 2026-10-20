import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { alertController } from '@/modules/sos';
import { radius, spacing, useTheme } from '@/theme';

import { CODE_LENGTH, type PadState, pressDelete, pressDigit } from '../code';
import { startConfiscationMode } from '../instance';
import { useTriggerSettings } from '../settings';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

/**
 * The code pad (spec S4), opened straight from a trigger. The alert goes out the moment the third
 * correct digit is typed, with no Send button; a wrong code clears the pad and does nothing else.
 */
export function CodePad() {
  const { t } = useTranslation('sos');
  const { colors } = useTheme();
  const settings = useTriggerSettings();
  const [state, setState] = useState<PadState>({ entered: '' });

  const press = (digit: string) => {
    if (!settings.code) return;
    const result = pressDigit(state, digit, settings.code);
    setState(result.state);
    if (!result.matched) return;
    if (settings.action === 'confiscation') void startConfiscationMode();
    else void alertController.start({ immediate: true });
    router.replace('/sos');
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/sos'));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Button variant="secondary" label={t('pad.close')} onPress={close} />
        <Button variant="danger" label={t('call112')} accessibilityHint={t('call112Hint')} onPress={() => Linking.openURL('tel:112')} />
      </View>

      {settings.code ? (
        <>
          <View style={styles.prompt}>
            <AppText variant="heading">{t('pad.prompt')}</AppText>
            <View
              style={styles.dots}
              accessible
              accessibilityLabel={t('pad.entered', { count: state.entered.length })}
              accessibilityLiveRegion="polite">
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { borderColor: colors.text, backgroundColor: i < state.entered.length ? colors.text : 'transparent' },
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.keys}>
            {KEYS.map((key, i) =>
              key === '' ? (
                <View key={i} style={styles.key} />
              ) : (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={key === 'delete' ? t('pad.delete') : key}
                  onPress={() => (key === 'delete' ? setState(pressDelete(state)) : press(key))}
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: pressed ? colors.surfaceRaised : colors.surface },
                  ]}>
                  <AppText variant="title">{key === 'delete' ? '⌫' : key}</AppText>
                </Pressable>
              ),
            )}
          </View>
        </>
      ) : (
        <View style={styles.prompt}>
          <AppText>{t('pad.noCode')}</AppText>
          <Button label={t('pad.setCode')} onPress={() => router.replace('/sos/trigger')} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.md, gap: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  prompt: { alignItems: 'center', gap: spacing.md },
  dots: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.md },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, maxWidth: 360, alignSelf: 'center' },
  key: { width: 96, height: 80, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});

import SaakshiSos from '@native/saakshi-sos';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import i18n from '@/i18n';

/** The Android quick-alert notification's words, in the app's language. */
export function quickNotificationText(): { title: string; text: string; action: string } {
  return {
    title: i18n.t('sos:trigger.notificationTitle'),
    text: i18n.t('sos:trigger.notificationText'),
    action: i18n.t('sos:trigger.notificationAction'),
  };
}

/**
 * Opens the code pad when a trigger outside the app's screens asks for it. Android's widget and
 * notification open saakshi://codepad, which the router handles by itself; iPhone's controls,
 * Action Button and Shortcut run an App Intent, which the native module passes on here.
 * Also puts the Android notification back (in the current language) if the user had it on.
 */
export function useQuickTriggers(): void {
  useEffect(() => {
    const native = SaakshiSos;
    if (!native) return;

    if (Platform.OS === 'android') {
      if (native.quickNotificationEnabled()) {
        const text = quickNotificationText();
        native.quickNotificationShow(text.title, text.text, text.action);
      }
      return;
    }

    const open = () => router.push('/codepad');
    if (native.consumeCodePadRequest()) open();
    const event = native.addListener('onOpenCodePad', open);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && native.consumeCodePadRequest()) open();
    });
    return () => {
      event.remove();
      appState.remove();
    };
  }, []);
}

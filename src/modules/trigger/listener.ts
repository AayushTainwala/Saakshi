import SaakshiSos from '@native/saakshi-sos';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import i18n from '@/i18n';

/** Where every quick trigger lands: the SOS screen with its three swipes (SPEC 5.1). */
export const SOS_ROUTE = '/sos';

/** The Android quick notification's words, in the app's language. */
export function quickNotificationText(): { title: string; text: string; action: string } {
  return {
    title: i18n.t('sos:trigger.notificationTitle'),
    text: i18n.t('sos:trigger.notificationText'),
    action: i18n.t('sos:trigger.notificationAction'),
  };
}

/**
 * Opens the SOS screen when a trigger outside the app's screens asks for it (round 2: no code is
 * typed to trigger). Android's widget and notification open saakshi://sos, which the router handles
 * by itself; iPhone's controls, Action Button and Shortcut run an App Intent, which the native
 * module passes on here. Also puts the Android notification back (in the current language) if the
 * user had it on.
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

    const open = () => router.navigate(SOS_ROUTE);
    if (native.consumeSosRequest()) open();
    const event = native.addListener('onOpenSos', open);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && native.consumeSosRequest()) open();
    });
    return () => {
      event.remove();
      appState.remove();
    };
  }, []);
}

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';

import { alertController, useAlertState } from '../alert/instance';
import { useTrustedContacts } from '../contacts/fileStore';
import { AlertPanel } from './AlertPanel';
import { LiveLocationCard } from './LiveLocationCard';

/**
 * The SOS tab: 112 first, then the alert to trusted contacts, live location and who the contacts
 * are. `children` go at the end (the route adds confiscation mode, which builds on this module).
 */
export function SosHome({ children }: { children?: ReactNode }) {
  const { t } = useTranslation('sos');
  const contacts = useTrustedContacts();
  const state = useAlertState();

  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
      <Button
        variant="danger"
        label={t('call112')}
        accessibilityHint={t('call112Hint')}
        onPress={() => Linking.openURL('tel:112')}
      />

      {contacts.length === 0 && state.phase === 'idle' ? (
        <Card>
          <AppText variant="heading">{t('setup.heading')}</AppText>
          <AppText>{t('setup.body')}</AppText>
          <Button label={t('setup.add')} onPress={() => router.push('/sos/contacts')} />
        </Card>
      ) : (
        <AlertPanel controller={alertController} state={state} contacts={contacts} />
      )}

      {contacts.length > 0 ? <LiveLocationCard hasContacts /> : null}

      {contacts.length > 0 ? (
        <Card>
          <AppText variant="heading">{t('contacts.title')}</AppText>
          <AppText>
            {t('contacts.summary', {
              count: contacts.length,
              names: contacts.map((c) => c.name ?? c.phone).join(', '),
            })}
          </AppText>
          <Button variant="secondary" label={t('contacts.manage')} onPress={() => router.push('/sos/contacts')} />
        </Card>
      ) : null}

      {children}
    </Screen>
  );
}

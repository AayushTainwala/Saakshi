import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components';
import {
  getLocationPermission,
  type LocationPermission,
  requestLocationPermission,
} from '@/modules/location';
import { spacing } from '@/theme';

import { phoneChannels, pickPhoneNumber, requestDirectSms } from '../alert/channels';
import { contactsStore, useTrustedContacts } from '../contacts/fileStore';
import { formatPhone } from '../contacts/phone';
import { type AddError, MAX_CONTACTS } from '../contacts/store';

/** Adding and removing trusted contacts, and the permissions an alert works best with. */
export function ContactsEditor() {
  const { t } = useTranslation('sos');
  const contacts = useTrustedContacts();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const errorText = (error: AddError) =>
    error === 'invalid' ? t('contacts.invalid') : error === 'duplicate' ? t('contacts.duplicate') : t('contacts.full');

  const pick = async () => {
    setMessage(null);
    try {
      const picked = await pickPhoneNumber();
      if (!picked) return;
      const result = contactsStore.add(picked);
      if (!result.ok) setMessage(errorText(result.error));
    } catch (error) {
      setMessage(t('contacts.pickFailed', { detail: error instanceof Error ? error.message : String(error) }));
    }
  };

  const add = () => {
    const result = contactsStore.add({ name, phone });
    if (!result.ok) return setMessage(errorText(result.error));
    setMessage(null);
    setName('');
    setPhone('');
  };

  const full = contacts.length >= MAX_CONTACTS;

  return (
    <Screen>
      <AppText>{t('contacts.intro')}</AppText>
      <AppText color="textMuted">{t('contacts.count', { count: contacts.length, max: MAX_CONTACTS })}</AppText>

      {contacts.map((contact) => (
        <Card key={contact.id} style={styles.row}>
          <View style={styles.grow}>
            <AppText variant="label">{contact.name ?? t('contacts.noName')}</AppText>
            <AppText variant="mono">{formatPhone(contact.phone)}</AppText>
          </View>
          <Button
            variant="secondary"
            label={t('contacts.remove')}
            accessibilityLabel={t('contacts.removeLabel', { name: contact.name ?? formatPhone(contact.phone) })}
            onPress={() => contactsStore.remove(contact.id)}
          />
        </Card>
      ))}

      {message ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}

      <Button label={t('contacts.pick')} disabled={full} onPress={() => void pick()} />

      <AppText variant="heading">{t('contacts.typeHeading')}</AppText>
      <TextField
        label={t('contacts.name')}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
      />
      <TextField
        label={t('contacts.phone')}
        hint={t('contacts.phoneHint')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={24}
        onSubmitEditing={add}
      />
      <Button variant="secondary" label={t('contacts.add')} disabled={full || phone.trim() === ''} onPress={add} />

      <DirectSmsCard />
      <LocationCard />
    </Screen>
  );
}

/** Android APK only: the one-time permission that lets alerts go out with no tap (spec S2). */
function DirectSmsCard() {
  const { t } = useTranslation(['sos', 'common']);
  const [status, setStatus] = useState<'allowed' | 'ask' | 'denied'>('ask');

  useFocusEffect(
    useCallback(() => {
      let live = true;
      phoneChannels.direct
        .allowed()
        .then((allowed) => live && allowed && setStatus('allowed'))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  if (!phoneChannels.direct.supported()) return null;

  const allow = async () => {
    const granted = await requestDirectSms({
      title: t('direct.rationaleTitle'),
      message: t('direct.rationaleBody'),
      buttonPositive: t('actions.continue', { ns: 'common' }),
    });
    setStatus(granted ? 'allowed' : 'denied');
  };

  return (
    <Card>
      <AppText variant="heading">{t('direct.heading')}</AppText>
      {status === 'allowed' ? (
        <AppText>{t('direct.on')}</AppText>
      ) : (
        <>
          <AppText>{t('direct.body')}</AppText>
          {status === 'denied' ? <AppText color="textMuted">{t('direct.denied')}</AppText> : null}
          <Button label={t('direct.allow')} onPress={() => void allow()} />
        </>
      )}
    </Card>
  );
}

/** Asks for location ahead of time, so the moment of an alert isn't spent on a permission prompt. */
function LocationCard() {
  const { t } = useTranslation('sos');
  const [status, setStatus] = useState<LocationPermission | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getLocationPermission()
        .then((value) => live && setStatus(value))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  if (status === null || status === 'granted') return null;

  return (
    <Card>
      <AppText variant="heading">{t('location.heading')}</AppText>
      {status === 'undetermined' ? (
        <>
          <AppText>{t('location.body')}</AppText>
          <Button label={t('location.allow')} onPress={() => void requestLocationPermission().then(setStatus)} />
        </>
      ) : (
        <>
          <AppText>{t('location.denied')}</AppText>
          <Button variant="secondary" label={t('location.openSettings')} onPress={() => void Linking.openSettings()} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1, gap: spacing.xs },
});

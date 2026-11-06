import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';

import { loadDetails, makeCertificate, shareCertificate } from '../certificate/generate';
import { type CertificateDetails, detailsComplete, type Ownership } from '../certificate/html';

const ROLE_ORDER: readonly Ownership[] = ['owned', 'maintained', 'managed', 'operated'];

/**
 * Making a certificate (fix round 1, group 8): no form. Part A is made from "Your details for
 * certificates", the phone's one profile. If it is incomplete, the screen says so and opens it;
 * if it is complete, a short line says whom Part A is for, and one button makes it.
 */
export function CertificateForm({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('record');
  const [details, setDetails] = useState<CertificateDetails>(loadDetails);
  const [busy, setBusy] = useState(false);
  // The profile may have been changed meanwhile.
  useFocusEffect(useCallback(() => setDetails(loadDetails()), []));

  const make = async () => {
    setBusy(true);
    try {
      await makeCertificate(sessionId, details);
      Alert.alert(t('certificate.madeTitle'), t('certificate.madeBody'), [
        { text: t('certificate.share'), onPress: () => shareCertificate(sessionId, t('certificate.share')) },
        { text: t('certificate.done'), style: 'cancel', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('locker.errorTitle'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const complete = detailsComplete(details);
  const roles = ROLE_ORDER.filter((role) => details.ownership.includes(role)).map((role) => t(`profile.role.${role}`));
  const joined =
    roles.length <= 1 ? (roles[0] ?? '') : t('profile.and', { first: roles.slice(0, -1).join(', '), last: roles[roles.length - 1] });

  return (
    <Screen>
      <Card>
        <AppText>{t('certificate.intro')}</AppText>
        <AppText color="textMuted">{t('certificate.partB')}</AppText>
      </Card>

      {complete ? (
        <>
          <AppText variant="label">{t('profile.madeFor', { name: details.name.trim(), roles: joined, imei: details.imei.trim() })}</AppText>
          <AppText color="textMuted">{t('profile.someoneElse')}</AppText>
          <AppText color="textMuted">{t('certificate.signByHand')}</AppText>
          <Button label={t('certificate.make')} busy={busy} onPress={make} />
          <Button variant="secondary" label={t('profile.change')} onPress={() => router.push('/record/certificate-profile')} />
        </>
      ) : (
        <>
          <AppText>{t('profile.incomplete')}</AppText>
          <AppText color="textMuted">{t('certificate.required')}</AppText>
          <Button label={t('profile.open')} onPress={() => router.push('/record/certificate-profile')} />
        </>
      )}
    </Screen>
  );
}

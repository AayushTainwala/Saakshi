import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText, Button, Card, CheckboxGroup, OptionGroup, Screen, TextField } from '@/components';

import { loadDetails, makeCertificate, saveDetails, shareCertificate } from '../certificate/generate';
import { type CertificateDetails, type Connection, detailsComplete, type Ownership, type Relation } from '../certificate/html';

export function CertificateForm({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('record');
  const [details, setDetails] = useState<CertificateDetails>(loadDetails);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CertificateDetails>(key: K) => (value: CertificateDetails[K]) =>
    setDetails((current) => ({ ...current, [key]: value }));

  const relations: { value: Relation; label: string }[] = [
    { value: 'son', label: t('certificate.son') },
    { value: 'daughter', label: t('certificate.daughter') },
    { value: 'spouse', label: t('certificate.spouse') },
  ];
  const connections: { value: Connection; label: string }[] = [
    { value: 'residing', label: t('certificate.residing') },
    { value: 'employed', label: t('certificate.employed') },
  ];
  const ownership: { value: Ownership; label: string }[] = [
    { value: 'owned', label: t('certificate.owned') },
    { value: 'maintained', label: t('certificate.maintained') },
    { value: 'managed', label: t('certificate.managed') },
    { value: 'operated', label: t('certificate.operated') },
  ];

  const make = async () => {
    setBusy(true);
    try {
      saveDetails(details);
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

  return (
    <Screen>
      <Card>
        <AppText>{t('certificate.intro')}</AppText>
        <AppText color="textMuted">{t('certificate.partB')}</AppText>
      </Card>

      <TextField label={t('certificate.name')} value={details.name} onChangeText={set('name')} autoComplete="name" />
      <AppText variant="label">{t('certificate.relation')}</AppText>
      <OptionGroup label={t('certificate.relation')} options={relations} value={details.relation} onChange={set('relation')} />
      <TextField label={t('certificate.relativeName')} value={details.relativeName} onChangeText={set('relativeName')} />
      <OptionGroup label={t('certificate.connection')} options={connections} value={details.connection} onChange={set('connection')} />
      <TextField label={t('certificate.address')} value={details.address} onChangeText={set('address')} multiline />
      <TextField
        label={t('certificate.imei')}
        hint={t('certificate.imeiHint')}
        value={details.imei}
        onChangeText={set('imei')}
        keyboardType="numbers-and-punctuation"
      />
      <AppText variant="label">{t('certificate.ownership')}</AppText>
      <CheckboxGroup label={t('certificate.ownership')} options={ownership} values={details.ownership} onChange={set('ownership')} />
      <TextField label={t('certificate.color')} value={details.color} onChangeText={set('color')} />
      <TextField label={t('certificate.serialNumber')} hint={t('certificate.serialHint')} value={details.serialNumber} onChangeText={set('serialNumber')} />
      <TextField label={t('certificate.otherInfo')} value={details.otherInfo} onChangeText={set('otherInfo')} multiline />

      <AppText color="textMuted">{t('certificate.signByHand')}</AppText>
      <Button label={t('certificate.make')} busy={busy} disabled={!detailsComplete(details)} onPress={make} />
      {!detailsComplete(details) ? <AppText color="textMuted">{t('certificate.required')}</AppText> : null}
    </Screen>
  );
}

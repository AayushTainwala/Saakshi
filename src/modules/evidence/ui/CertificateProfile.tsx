import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card, CheckboxGroup, OptionGroup, Screen, TextField } from '@/components';

import { loadDetails, saveDetails } from '../certificate/generate';
import { type CertificateDetails, type Connection, detailsComplete, type Ownership, type Relation } from '../certificate/html';

/**
 * "Your details for certificates" (fix round 1, group 8; owner's decision of 5 Nov 2026): one
 * profile per phone, of the person who owns, maintains, manages or operates it. Every certificate
 * made on this phone uses it; anyone else changes it here first. Kept only on this phone, and
 * saved as it is typed.
 */
export function CertificateProfile() {
  const { t } = useTranslation('record');
  const [details, setDetails] = useState<CertificateDetails>(loadDetails);
  const set =
    <K extends keyof CertificateDetails>(key: K) =>
    (value: CertificateDetails[K]) => {
      const next = { ...details, [key]: value };
      setDetails(next);
      saveDetails(next);
    };

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

  return (
    <Screen>
      <Card>
        <AppText>{t('profile.intro')}</AppText>
        <AppText color="textMuted">{t('profile.onlyHere')}</AppText>
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

      <AppText color={detailsComplete(details) ? 'success' : 'textMuted'} accessibilityLiveRegion="polite">
        {detailsComplete(details) ? t('profile.complete') : t('certificate.required')}
      </AppText>
    </Screen>
  );
}

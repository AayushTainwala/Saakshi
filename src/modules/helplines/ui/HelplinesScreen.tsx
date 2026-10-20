import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen } from '@/components';
import { spacing } from '@/theme';

import { currentPeople, type HelplineList, type Localized } from '../schema';
import { type RefreshStatus, useHelplines } from '../useHelplines';

export function HelplinesScreen() {
  const { list, status } = useHelplines();
  return <HelplinesView list={list} status={status} today={new Date().toISOString().slice(0, 10)} />;
}

/** The Help tab's content for a given list; separate from the fetching so it can be tested. */
export function HelplinesView({ list, status, today }: { list: HelplineList; status: RefreshStatus; today: string }) {
  const { t, i18n } = useTranslation('help');
  const pick = (text: Localized) => (i18n.language === 'hi' ? text.hi : text.en);
  const people = currentPeople(list, today);

  return (
    <Screen>
      <AppText>{t('intro')}</AppText>

      <AppText variant="heading">{t('helplines.heading')}</AppText>
      {list.public.map((line) => (
        <Card key={line.id}>
          <AppText variant="label">{pick(line.name)}</AppText>
          <AppText>{pick(line.description)}</AppText>
          <Button
            variant={line.number === '112' ? 'danger' : 'primary'}
            label={t('helplines.call', { number: line.number })}
            accessibilityHint={t('helplines.callHint')}
            onPress={() => Linking.openURL(`tel:${line.number}`)}
          />
          <View style={styles.sources}>
            {line.sources.map((source, i) => (
              <Pressable
                key={source.url}
                accessibilityRole="link"
                accessibilityHint={t('helplines.sourceHint')}
                onPress={() => Linking.openURL(source.url)}
                hitSlop={spacing.sm}>
                <AppText variant="small" color="primary">
                  {t('helplines.source', { index: i + 1 })}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}

      <AppText variant="heading">{t('people.heading')}</AppText>
      <AppText color="textMuted">{t('people.intro')}</AppText>
      {people.length === 0 ? (
        <AppText>{t('people.empty')}</AppText>
      ) : (
        people.map((person) => (
          <Card key={person.id}>
            <AppText variant="label">{person.name}</AppText>
            <AppText color="textMuted">
              {t(person.kind === 'lawyer' ? 'people.lawyer' : 'people.medic')} · {person.city}, {person.state}
            </AppText>
            <AppText color="textMuted">{t('people.languages', { languages: person.languages.join(', ') })}</AppText>
            <Button
              variant="secondary"
              label={t('helplines.call', { number: person.phone })}
              accessibilityHint={t('helplines.callHint')}
              onPress={() => Linking.openURL(`tel:${person.phone}`)}
            />
          </Card>
        ))
      )}

      <AppText variant="small" color="textMuted">
        {status === 'checking'
          ? t('status.checking')
          : status === 'failed'
            ? t('status.failed', { date: list.updated })
            : t('status.updated', { date: list.updated })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});

import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components';

import { GUIDES, type GuideId } from '../content';
import { usePick } from './usePick';

/** The Guides tab: every guide with its summary. */
export function GuideList({ onOpen }: { onOpen: (id: GuideId) => void }) {
  const { t } = useTranslation('guides');
  const pick = usePick();
  return (
    <Screen>
      <AppText>{t('intro')}</AppText>
      {GUIDES.map((guide) => (
        <Pressable
          key={guide.id}
          accessibilityRole="button"
          accessibilityLabel={pick(guide.title)}
          accessibilityHint={pick(guide.summary)}
          onPress={() => onOpen(guide.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <Card>
            <AppText variant="heading">{pick(guide.title)}</AppText>
            <AppText color="textMuted">{pick(guide.summary)}</AppText>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

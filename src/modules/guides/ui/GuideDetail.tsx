import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components';
import { radius, spacing, useTheme } from '@/theme';

import { type Block, findGuide, visibleSections } from '../content';
import { usePick } from './usePick';

export function GuideDetail({ id }: { id: string }) {
  const { t } = useTranslation('guides');
  const pick = usePick();
  const guide = findGuide(id);

  if (!guide) {
    return (
      <Screen>
        <AppText>{t('notFound')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText color="textMuted">{pick(guide.summary)}</AppText>
      {visibleSections(guide).map((section) => (
        <View key={section.id} style={styles.section}>
          <AppText variant="heading">{pick(section.heading)}</AppText>
          {section.needsTesting ? <Warning text={t('untested')} /> : null}
          {section.blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </View>
      ))}
      {guide.attribution ? (
        <Card>
          <AppText variant="small">{pick(guide.attribution.text)}</AppText>
          <TextLink label={guide.attribution.url} url={guide.attribution.url} />
          <TextLink label={t('licenceLink')} url={guide.attribution.licenceUrl} />
        </Card>
      ) : null}
    </Screen>
  );
}

function BlockView({ block }: { block: Block }) {
  const { t } = useTranslation('guides');
  const pick = usePick();
  switch (block.kind) {
    case 'paragraph':
      return <AppText>{pick(block.text)}</AppText>;
    case 'steps':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.row}>
              <AppText variant="label" style={styles.marker}>
                {t('step', { number: i + 1 })}
              </AppText>
              <AppText style={styles.itemText}>{pick(item)}</AppText>
            </View>
          ))}
        </View>
      );
    case 'bullets':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.row}>
              <AppText style={styles.marker}>•</AppText>
              <AppText style={styles.itemText}>{pick(item)}</AppText>
            </View>
          ))}
        </View>
      );
    case 'warning':
      return <Warning text={pick(block.text)} />;
    case 'link':
      return (
        <Card>
          <TextLink label={pick(block.label)} url={block.url} />
          {block.note ? <AppText>{pick(block.note)}</AppText> : null}
          {block.licence ? (
            <AppText variant="small" color="textMuted">
              {t('licence', { licence: block.licence })}
            </AppText>
          ) : null}
        </Card>
      );
  }
}

function Warning({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.warning, { borderColor: colors.warning, backgroundColor: colors.surface }]}>
      <AppText>{text}</AppText>
    </View>
  );
}

function TextLink({ label, url }: { label: string; url: string }) {
  const { t } = useTranslation('guides');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint={t('openLinkHint')}
      onPress={() => Linking.openURL(url)}
      hitSlop={spacing.sm}>
      <AppText variant="label" color="primary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  marker: {
    minWidth: spacing.lg,
  },
  itemText: {
    flex: 1,
  },
  warning: {
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});

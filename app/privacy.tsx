import { StyleSheet, View } from 'react-native';
import { LAST_UPDATED, PRIVACY_POLICY } from '@/shared/privacy';
import { PRIVACY_POLICY_ML } from '@/shared/i18n/privacyMl';
import { useI18n } from '@/src/i18n';
import { palette, space } from '@/src/theme';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';

// Same text as the web page at /privacy (shared/privacy.ts). Malayalam readers
// get a translation (shared/i18n/privacyMl.ts); the English text is the one that applies.
export default function PrivacyPolicyScreen() {
  const { t, language } = useI18n();
  const malayalam = language === 'ml';
  const policy = malayalam ? PRIVACY_POLICY_ML : PRIVACY_POLICY;

  return (
    <Screen back title={t('privacy.title')} subtitle={t('privacy.lastUpdated', { date: LAST_UPDATED })}>
      {malayalam && (
        <Text variant="caption" color={palette.inkMuted}>{t('privacy.translationNote')}</Text>
      )}
      {policy.map(section => (
        <Section key={section.title} title={section.title}>
          <View style={styles.body}>
            {section.paragraphs?.map(paragraph => (
              <Text key={paragraph} variant="body">{paragraph}</Text>
            ))}
            {section.bullets && <Bullets items={section.bullets} />}
          </View>
        </Section>
      ))}
    </Screen>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bullets}>
      {items.map(item => (
        <View key={item} style={styles.bullet}>
          <View style={styles.dot} />
          <Text variant="body" style={styles.flex}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.sm,
  },
  bullets: {
    gap: space.sm,
  },
  bullet: {
    flexDirection: 'row',
    gap: space.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.blood,
    marginTop: 9,
  },
  flex: {
    flex: 1,
  },
});

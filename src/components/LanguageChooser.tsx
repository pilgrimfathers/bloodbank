import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Language, LANGUAGES, translate, useI18n } from '@/src/i18n';
import { palette, radius, space } from '@/src/theme';
import Button from './ui/Button';
import Text from './ui/Text';

// First thing anyone sees: pick English or Malayalam. The heading shows in
// the highlighted language so both readers can follow it.
export default function LanguageChooser() {
  const { setLanguage } = useI18n();
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState<Language>('ml');

  return (
    <View style={[styles.page, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.inner}>
        <MaterialCommunityIcons name="translate" size={48} color={palette.blood} />
        <Text variant="title" style={styles.title}>{translate('language.title', undefined, choice)}</Text>
        <Text variant="body" color={palette.inkMuted}>{translate('language.subtitle', undefined, choice)}</Text>

        <View style={styles.options}>
          {LANGUAGES.map(option => (
            <LanguageOption
              key={option.value}
              label={option.label}
              selected={choice === option.value}
              onPress={() => setChoice(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.inner}>
        <Button label={translate('language.continue', undefined, choice)} onPress={() => setLanguage(choice)} />
      </View>
    </View>
  );
}

export function LanguageOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text variant="heading" style={styles.flex}>{label}</Text>
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={24}
        color={selected ? palette.blood : palette.inkFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    backgroundColor: palette.paper,
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  options: {
    gap: space.md,
    marginTop: space.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  optionSelected: {
    borderColor: palette.blood,
    backgroundColor: palette.bloodTint,
  },
  flex: {
    flex: 1,
  },
});

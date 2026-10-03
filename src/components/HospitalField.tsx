import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HOSPITALS } from '@/shared/hospitals';
import { KERALA_DISTRICTS } from '@/shared/constants';
import { palette, radius, space } from '@/src/theme';
import Field from './Field';
import Text from './ui/Text';

type District = (typeof KERALA_DISTRICTS)[number];

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
  // Narrows suggestions to one district; without it every district is searched.
  district?: string;
};

const MAX_SUGGESTIONS = 5;

const simplify = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

// Hospital name input that suggests known hospitals as you type. Any typed
// name is accepted, so places missing from the list can still be entered.
export default function HospitalField({ label, hint, value, onChangeText, district }: Props) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const words = simplify(value).split(' ').filter(Boolean);
    if (!focused || words.join('').length < 2) return [];
    const pool = district && district in HOSPITALS
      ? HOSPITALS[district as District]
      : Object.values(HOSPITALS).flat();
    const matches: string[] = [];
    for (const name of pool) {
      if (name === value) return [];
      const haystack = simplify(name);
      if (words.every(word => haystack.includes(word)) && !matches.includes(name)) matches.push(name);
      if (matches.length === MAX_SUGGESTIONS) break;
    }
    return matches;
  }, [value, district, focused]);

  return (
    <View>
      <Field
        label={label}
        hint={suggestions.length ? undefined : hint}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
      />
      {suggestions.length > 0 && (
        <View style={styles.list}>
          {suggestions.map((name, index) => (
            <Pressable
              key={name}
              onPress={() => onChangeText(name)}
              style={({ pressed }) => [styles.item, index > 0 && styles.divider, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: -space.md,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  pressed: {
    backgroundColor: palette.bloodTint,
  },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HOSPITALS } from '@/shared/hospitals';
import { KERALA_DISTRICTS } from '@/shared/constants';
import { palette, radius, space } from '@/src/theme';
import Field from './Field';
import Text from './ui/Text';
import { useReveal } from './ui/Screen';

type District = (typeof KERALA_DISTRICTS)[number];

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
  // Lists that district's hospitals; without it, suggestions wait for typing.
  district?: string;
};

const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 5.5;

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

// Hospital name input with a dropdown of known hospitals that narrows as you
// type. Any typed name is accepted, so places missing from the list can
// still be entered.
export default function HospitalField({ label, hint, value, onChangeText, district }: Props) {
  const [focused, setFocused] = useState(false);
  const wrapper = useRef<View>(null);
  const reveal = useReveal();

  const options = useMemo(() => {
    if (!focused) return [];
    const inDistrict = district && district in HOSPITALS;
    const query = words(value);
    if (!inDistrict && query.join('').length < 2) return [];
    const pool = inDistrict
      ? HOSPITALS[district as District]
      : [...new Set(Object.values(HOSPITALS).flat())];
    if (pool.includes(value)) return [];
    // Each typed word must start a word of the name; names that start with
    // the first typed word come first.
    const ranked: { name: string; rank: number }[] = [];
    for (const name of pool) {
      const nameWords = words(name);
      if (!query.every(q => nameWords.some(w => w.startsWith(q)))) continue;
      ranked.push({ name, rank: query.length && nameWords[0].startsWith(query[0]) ? 0 : 1 });
    }
    return ranked.sort((a, b) => a.rank - b.rank).map(r => r.name);
  }, [value, district, focused]);

  // Keep the field and its list above the keyboard as the list changes size.
  useEffect(() => {
    if (options.length) requestAnimationFrame(() => reveal(wrapper.current));
  }, [options.length, reveal]);
  const open = options.length > 0;

  return (
    <View ref={wrapper} collapsable={false}>
      <Field
        label={label}
        hint={open ? undefined : hint}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
      />
      {open && (
        <ScrollView
          style={[styles.list, { maxHeight: ROW_HEIGHT * Math.min(options.length, VISIBLE_ROWS) }]}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {options.map((name, index) => (
            <Pressable
              key={name}
              onPress={() => onChangeText(name)}
              style={({ pressed }) => [styles.item, index > 0 && styles.divider, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text numberOfLines={1}>{name}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
  },
  item: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: space.md + 2,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  pressed: {
    backgroundColor: palette.bloodTint,
  },
});

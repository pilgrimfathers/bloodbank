import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { palette, radius, space } from '@/src/theme';
import Text from './ui/Text';

type Props = {
  options: readonly string[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  // Adds a leading chip that maps to null, e.g. "All districts".
  allLabel?: string;
  onClear?: () => void;
  // Single scrollable row instead of wrapping, for filter bars.
  horizontal?: boolean;
  // Optional display text per option, e.g. capitalised filter names.
  format?: (option: string) => string;
};

export default function ChipSelect({ options, value, onChange, label, allLabel, onClear, horizontal, format }: Props) {
  const chips = (
    <>
      {allLabel && (
        <Chip text={allLabel} selected={!value} onPress={() => onClear?.()} />
      )}
      {options.map(option => (
        <Chip
          key={option}
          text={format ? format(option) : option}
          selected={value === option}
          onPress={() => onChange(option)}
        />
      ))}
    </>
  );

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label" color={palette.inkMuted} style={styles.label}>{label}</Text>}
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.container}>{chips}</View>
      )}
    </View>
  );
}

function Chip({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text variant="label" color={selected ? '#fff' : palette.ink}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: space.lg,
  },
  label: {
    marginBottom: space.sm,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: palette.blood,
    borderColor: palette.blood,
  },
});

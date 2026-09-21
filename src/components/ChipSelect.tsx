import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants';

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
};

export default function ChipSelect({ options, value, onChange, label, allLabel, onClear, horizontal }: Props) {
  const chips = (
    <>
      {allLabel && (
        <Chip text={allLabel} selected={!value} onPress={() => onClear?.()} />
      )}
      {options.map(option => (
        <Chip key={option} text={option} selected={value === option} onPress={() => onChange(option)} />
      ))}
    </>
  );

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
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
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.primary,
  },
  chipTextSelected: {
    color: 'white',
  },
});

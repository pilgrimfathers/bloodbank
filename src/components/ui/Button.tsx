import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, space } from '@/src/theme';
import Text from './Text';

type Variant = 'primary' | 'secondary' | 'quiet';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  // Overrides the primary fill, e.g. green for WhatsApp.
  color?: string;
};

export default function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, style, color = palette.blood,
}: Props) {
  const filled = variant === 'primary';
  const fg = filled ? '#fff' : color;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        filled && { backgroundColor: color },
        variant === 'secondary' && { borderColor: color, borderWidth: 1.5 },
        variant === 'quiet' && styles.quiet,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={fg} />}
          <Text variant="bodyStrong" color={fg}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quiet: {
    minHeight: 40,
    paddingHorizontal: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});

import { Children, isValidElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, space } from '@/src/theme';
import Text from './Text';

// Grouped list: one surface with hairlines between rows, instead of a
// separate floating card per item.
export function List({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.list}>
      {items.map((child, index) => (
        <View key={child.key ?? index} style={index > 0 && styles.divider}>
          {child}
        </View>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
};

export function ListRow({ title, subtitle, leading, icon, trailing, onPress, chevron = !!onPress }: RowProps) {
  const content = (
    <View style={styles.row}>
      {leading}
      {icon && !leading && <MaterialCommunityIcons name={icon} size={22} color={palette.inkMuted} />}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={2}>{title}</Text>
        {subtitle && <Text variant="caption" color={palette.inkMuted} numberOfLines={3}>{subtitle}</Text>}
      </View>
      {trailing}
      {chevron && <MaterialCommunityIcons name="chevron-right" size={22} color={palette.inkFaint} />}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && { backgroundColor: palette.paper }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

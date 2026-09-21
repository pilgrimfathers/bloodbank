import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, space } from '@/src/theme';
import Text from './Text';

type Props = {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};

export default function Section({ title, action, children }: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Text variant="heading">{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            <Text variant="label" color={palette.blood}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
});

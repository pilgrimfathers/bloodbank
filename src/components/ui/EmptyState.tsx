import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, space } from '@/src/theme';
import Button from './Button';
import Text from './Text';

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
};

export default function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View style={styles.box}>
      <MaterialCommunityIcons name={icon} size={32} color={palette.inkFaint} />
      <Text variant="bodyStrong" style={styles.center}>{title}</Text>
      {message && <Text variant="caption" color={palette.inkMuted} style={styles.center}>{message}</Text>}
      {action && <Button variant="secondary" label={action.label} onPress={action.onPress} style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.line,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    marginTop: space.md,
  },
});

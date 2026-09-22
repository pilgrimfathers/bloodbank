import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '@/src/context/UserContext';
import { useAlertPermission } from '@/src/hooks/useAlertPermission';
import { palette, radius, space } from '@/src/theme';
import Button from './ui/Button';
import Text from './ui/Text';

// Shown while notifications are off, so donors know they'll miss requests.
export default function AlertsCard() {
  const { profile } = useCurrentUser();
  const { permission, enable } = useAlertPermission(profile?.id);

  if (!permission || permission.granted) return null;

  const who = profile?.bloodType ? `${profile.bloodType} blood` : 'your blood group';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="bell-off-outline" size={24} color={palette.info} />
        <View style={styles.text}>
          <Text variant="bodyStrong">Request alerts are off</Text>
          <Text variant="caption" color={palette.inkMuted}>
            {permission.canAskAgain
              ? `Turn them on to hear when someone needs ${who}.`
              : `Notifications are blocked for this app. Allow them in Settings to hear when someone needs ${who}.`}
          </Text>
        </View>
      </View>
      <Button
        icon={permission.canAskAgain ? 'bell-ring-outline' : 'cog-outline'}
        label={permission.canAskAgain ? 'Turn on alerts' : 'Open settings'}
        color={palette.info}
        onPress={enable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.infoTint,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

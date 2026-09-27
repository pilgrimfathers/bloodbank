import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '@/src/context/UserContext';
import { useAlertPermission } from '@/src/hooks/useAlertPermission';
import { palette, radius, space } from '@/src/theme';
import Button from './ui/Button';
import { useI18n } from '@/src/i18n';
import Text from './ui/Text';

// Shown while notifications are off, so donors know they'll miss requests.
export default function AlertsCard() {
  const { profile } = useCurrentUser();
  const { t } = useI18n();
  const { permission, enable } = useAlertPermission(profile?.id);

  if (!permission || permission.granted) return null;

  const who = profile?.bloodType ? t('alerts.groupBlood', { group: profile.bloodType }) : t('alerts.yourGroup');

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="bell-off-outline" size={24} color={palette.info} />
        <View style={styles.text}>
          <Text variant="bodyStrong">{t('alerts.title')}</Text>
          <Text variant="caption" color={palette.inkMuted}>
            {permission.canAskAgain
              ? t('alerts.turnOnMessage', { who })
              : t('alerts.blockedMessage', { who })}
          </Text>
        </View>
      </View>
      <Button
        icon={permission.canAskAgain ? 'bell-ring-outline' : 'cog-outline'}
        label={permission.canAskAgain ? t('alerts.turnOn') : t('alerts.openSettings')}
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

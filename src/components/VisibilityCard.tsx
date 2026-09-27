import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentUser } from '@/src/context/UserContext';
import { ProfileVisibility } from '@/shared/types';
import { showMessage } from '@/src/utils/dialog';
import { palette, radius, space } from '@/src/theme';
import { saveVisibility } from './VisibilityPicker';
import Button from './ui/Button';
import { useI18n } from '@/src/i18n';
import Text from './ui/Text';

// Asked once: donors who haven't chosen yet stay private until they opt in.
// Either answer is saved, so the card doesn't come back on other devices.
export default function VisibilityCard() {
  const { profile } = useCurrentUser();
  const { t } = useI18n();
  const [saving, setSaving] = useState<ProfileVisibility | null>(null);

  if (!profile || profile.visibility || !profile.isDonor) return null;

  const choose = async (visibility: ProfileVisibility) => {
    setSaving(visibility);
    try {
      await saveVisibility(profile.id, visibility);
    } catch (error) {
      console.error('Error saving visibility:', error);
      showMessage(t('common.couldNotSave'), t('common.checkConnection'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="account-eye-outline" size={24} color={palette.leaf} />
        <View style={styles.text}>
          <Text variant="bodyStrong">{t('visibilityCard.title')}</Text>
          <Text variant="caption" color={palette.inkMuted}>
            {t('visibilityCard.body')}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button
          label={t('visibilityCard.public')}
          color={palette.leaf}
          loading={saving === 'public'}
          disabled={!!saving}
          onPress={() => choose('public')}
          style={styles.flex}
        />
        <Button
          label={t('visibilityCard.private')}
          variant="secondary"
          color={palette.inkMuted}
          loading={saving === 'private'}
          disabled={!!saving}
          onPress={() => choose('private')}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.leafTint,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  flex: {
    flex: 1,
  },
});

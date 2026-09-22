import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { VISIBILITY_OPTIONS } from '@/shared/donors';
import { ProfileVisibility, UserProfile } from '@/shared/types';
import { showMessage } from '@/src/utils/dialog';
import { palette, radius, space } from '@/src/theme';
import Text from './ui/Text';

export async function saveVisibility(userId: string, visibility: ProfileVisibility) {
  await updateDoc(doc(firestore, 'users', userId), { visibility, updatedAt: new Date() });
}

// Lets donors choose who outside the volunteer team can find them. Saves on tap;
// the live profile in UserContext picks up the change.
export default function VisibilityPicker({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = useState<ProfileVisibility | null>(null);
  const current = profile.visibility ?? 'private';

  const choose = async (visibility: ProfileVisibility) => {
    if (visibility === current || saving) return;
    setSaving(visibility);
    try {
      await saveVisibility(profile.id, visibility);
    } catch (error) {
      console.error('Error saving visibility:', error);
      showMessage('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={styles.list}>
      {VISIBILITY_OPTIONS.map((option, index) => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            onPress={() => choose(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              pressed && { backgroundColor: palette.paper },
            ]}
          >
            {saving === option.value ? (
              <ActivityIndicator color={palette.blood} style={styles.icon} />
            ) : (
              <MaterialCommunityIcons
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={24}
                color={selected ? palette.blood : palette.inkFaint}
                style={styles.icon}
              />
            )}
            <View style={styles.text}>
              <Text variant="bodyStrong">{option.label}</Text>
              <Text variant="caption" color={palette.inkMuted}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  icon: {
    width: 24,
    marginTop: 2,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

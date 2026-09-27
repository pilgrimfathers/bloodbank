import { ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { showMessage } from '@/src/utils/dialog';
import { palette, space } from '@/src/theme';
import DonorForm, { DonorFormValues } from '@/src/components/DonorForm';
import Screen from '@/src/components/ui/Screen';
import { useI18n } from '@/src/i18n';

export default function EditProfileScreen() {
  const { profile } = useCurrentUser();
  const { t } = useI18n();

  if (!profile) {
    return (
      <Screen back title={t('profileEdit.title')}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const handleSubmit = async ({ lastDonation, notes, ...details }: DonorFormValues) => {
    try {
      await updateDoc(doc(firestore, 'users', profile.id), { ...details, updatedAt: new Date() });
      if (auth.currentUser && auth.currentUser.displayName !== details.name) {
        await updateProfile(auth.currentUser, { displayName: details.name });
      }
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage(t('profileEdit.couldNotSave'), t('common.checkConnection'));
    }
  };

  return (
    <Screen back title={t('profileEdit.title')} subtitle={t('profileEdit.subtitle')}>
      <DonorForm initial={profile} submitLabel={t('donorEdit.saveChanges')} onSubmit={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
});

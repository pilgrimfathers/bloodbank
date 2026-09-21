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

export default function EditProfileScreen() {
  const { profile } = useCurrentUser();

  if (!profile) {
    return (
      <Screen back title="Edit profile">
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
      showMessage('Could not save profile', 'Check your connection and try again.');
    }
  };

  return (
    <Screen back title="Edit profile" subtitle="Keep your details current so volunteers can reach you">
      <DonorForm initial={profile} submitLabel="Save changes" onSubmit={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
});

import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { COLORS } from '@/src/constants';
import { showMessage } from '@/src/utils/dialog';
import BackButton from '@/src/components/BackButton';
import DonorForm, { DonorFormValues } from '@/src/components/DonorForm';
import LoadingSpinner from '@/src/components/LoadingSpinner';
import PageContainer from '@/src/components/PageContainer';

export default function EditProfileScreen() {
  const { profile } = useCurrentUser();
  if (!profile) return <LoadingSpinner />;

  const handleSubmit = async ({ lastDonation, notes, ...details }: DonorFormValues) => {
    try {
      await updateDoc(doc(firestore, 'users', profile.id), { ...details, updatedAt: new Date() });
      if (auth.currentUser && auth.currentUser.displayName !== details.name) {
        await updateProfile(auth.currentUser, { displayName: details.name });
      }
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('Error', 'Failed to update profile');
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit profile</Text>
          <DonorForm initial={profile} submitLabel="Save changes" onSubmit={handleSubmit} />
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 80 : 100,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
});

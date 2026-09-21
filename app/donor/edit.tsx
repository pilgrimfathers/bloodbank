import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useCurrentUser } from '../context/UserContext';
import { COLORS } from '../constants';
import { UserProfile } from '../types';
import { coversDistrict, getUser, isVolunteer, logDonation } from '../utils/data';
import { confirmAction, showMessage } from '../utils/dialog';
import BackButton from '../components/BackButton';
import DonorForm, { DonorFormValues } from '../components/DonorForm';
import LoadingSpinner from '../components/LoadingSpinner';
import PageContainer from '../components/PageContainer';

// Volunteers add donors who don't use the app, or edit any donor they manage.
export default function EditDonorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile: me } = useCurrentUser();
  const [donor, setDonor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    getUser(id)
      .then(setDonor)
      .finally(() => setLoading(false));
  }, [id]);

  if (!me || loading) return <LoadingSpinner />;
  if (!isVolunteer(me)) {
    return (
      <PageContainer>
        <BackButton />
        <Text style={styles.empty}>Only volunteers can manage donors.</Text>
      </PageContainer>
    );
  }

  const findDuplicate = async (values: DonorFormValues) => {
    const snap = await getDocs(query(
      collection(firestore, 'users'),
      where('phoneNumber', '==', values.phoneNumber),
      where('district', '==', values.district),
    ));
    return snap.docs.find(d => d.id !== id)?.data();
  };

  const handleSubmit = async (values: DonorFormValues) => {
    if (!coversDistrict(me, values.district)) {
      showMessage('Not allowed', `You don't manage donors in ${values.district}.`);
      return;
    }
    try {
      const duplicate = await findDuplicate(values);
      if (duplicate) {
        const ok = await confirmAction(
          'Possible duplicate',
          `${duplicate.name} in ${values.district} already uses ${values.phoneNumber}. Save anyway?`,
          'Save',
        );
        if (!ok) return;
      }

      const { lastDonation, ...details } = values;
      if (donor) {
        await updateDoc(doc(firestore, 'users', donor.id), { ...details, updatedAt: new Date() });
        router.back();
        return;
      }

      const newDonor = {
        ...details,
        role: 'donor',
        verified: true,
        status: 'active',
        hasAccount: false,
        lastDonation: null,
        donationCount: 0,
        createdBy: me.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const ref = await addDoc(collection(firestore, 'users'), newDonor);
      if (lastDonation) {
        await logDonation(
          { ...newDonor, id: ref.id } as UserProfile,
          { date: lastDonation, hospital: 'Reported when added' },
          { id: me.id, name: me.name },
        );
      }
      router.replace({ pathname: '/donor/[id]', params: { id: ref.id } });
    } catch (error) {
      console.error('Error saving donor:', error);
      showMessage('Error', 'Failed to save donor');
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{donor ? `Edit ${donor.name}` : 'Add donor'}</Text>
          {!donor && (
            <Text style={styles.subtitle}>
              For donors who don't use the app. People who sign up themselves appear automatically.
            </Text>
          )}
          <DonorForm
            initial={donor ?? { district: me.volunteerDistricts?.[0] ?? me.district }}
            showLastDonation={!donor}
            showNotes
            submitLabel={donor ? 'Save changes' : 'Add donor'}
            onSubmit={handleSubmit}
          />
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
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 16,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 120,
  },
});

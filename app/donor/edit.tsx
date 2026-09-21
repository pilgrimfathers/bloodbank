import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { UserProfile } from '@/src/types';
import { coversDistrict, getUser, isVolunteer, logDonation } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { palette, radius, space } from '@/src/theme';
import DonorForm, { DonorFormValues } from '@/src/components/DonorForm';
import EmptyState from '@/src/components/ui/EmptyState';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';

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

  const title = id ? (donor ? `Edit ${donor.name}` : 'Edit donor') : 'Add donor';

  if (!me || loading) {
    return (
      <Screen back title={title}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }
  if (!isVolunteer(me)) {
    return (
      <Screen back title={title}>
        <EmptyState icon="account-lock-outline" title="Only volunteers can manage donors" />
      </Screen>
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
      showMessage('Could not save donor', 'Check your connection and try again.');
    }
  };

  return (
    <Screen back title={title}>
      {!donor && (
        <View style={styles.note}>
          <Text variant="body" color={palette.info}>
            For donors who don't use the app. People who sign up themselves appear automatically.
          </Text>
        </View>
      )}
      <DonorForm
        initial={donor ?? { district: me.volunteerDistricts?.[0] ?? me.district }}
        showLastDonation={!donor}
        showNotes
        submitLabel={donor ? 'Save changes' : 'Add donor'}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
  note: {
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.infoTint,
  },
});

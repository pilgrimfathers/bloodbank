import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { COLORS, COOLOFF_MONTHS } from '@/src/constants';
import { Donation, UserProfile } from '@/src/types';
import { coversDistrict, getDonations, getUser, logDonation } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { addMonths } from '@/src/utils/eligibility';
import { formatDate, parseDateInput, toDateInput } from '@/src/utils/format';
import BackButton from '@/src/components/BackButton';
import EligibilityBadge from '@/src/components/EligibilityBadge';
import Field from '@/src/components/Field';
import LoadingSpinner from '@/src/components/LoadingSpinner';
import PageContainer, { HEADER_OFFSET } from '@/src/components/PageContainer';

// Logs a donation for the current user, or for any donor a volunteer manages.
export default function NewDonationScreen() {
  const { donorId, requestId } = useLocalSearchParams<{ donorId?: string; requestId?: string }>();
  const { profile: me } = useCurrentUser();
  const [donor, setDonor] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<Donation[]>([]);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [hospital, setHospital] = useState('');
  const [saving, setSaving] = useState(false);

  const targetId = donorId ?? me?.id;

  useEffect(() => {
    if (!targetId) return;
    (async () => {
      const [user, donations] = await Promise.all([getUser(targetId), getDonations(targetId)]);
      setDonor(user);
      setHistory(donations);
      if (requestId) {
        const request = await getDoc(doc(firestore, 'bloodRequests', requestId));
        if (request.exists()) setHospital(request.data().hospital ?? '');
      }
    })().catch(error => {
      console.error('Error loading donor:', error);
      showMessage('Error', 'Failed to load donor');
    });
  }, [targetId, requestId]);

  if (!me || !donor) return <LoadingSpinner />;

  const isSelf = donor.id === me.id;
  if (!isSelf && !coversDistrict(me, donor.district)) {
    return (
      <PageContainer>
        <BackButton />
        <Text style={styles.empty}>You can't log donations for this donor.</Text>
      </PageContainer>
    );
  }

  const handleSave = async () => {
    const donationDate = parseDateInput(date);
    if (!donationDate) return showMessage('Invalid date', 'Enter the donation date as DD-MM-YYYY.');
    if (donationDate > new Date()) return showMessage('Invalid date', 'Donation date cannot be in the future.');

    // Two donations closer than the cool-off period usually means a mistake.
    const tooClose = history.find(d =>
      donationDate < addMonths(d.date, COOLOFF_MONTHS) && d.date < addMonths(donationDate, COOLOFF_MONTHS)
    );
    if (tooClose) {
      const ok = await confirmAction(
        'Inside cool-off period',
        `${donor.name} already has a donation on ${formatDate(tooClose.date)}, less than ${COOLOFF_MONTHS} months apart. Record anyway?`,
        'Record',
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await logDonation(donor, { date: donationDate, hospital, requestId }, { id: me.id, name: me.name });
      showMessage('Donation recorded', `Thank you! ${donor.name} can donate again from ${formatDate(addMonths(donationDate, COOLOFF_MONTHS))}.`);
      router.back();
    } catch (error) {
      console.error('Error logging donation:', error);
      showMessage('Error', 'Failed to record donation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{isSelf ? 'I donated blood' : `Log donation`}</Text>
          <Text style={styles.subtitle}>
            {donor.name} · {donor.bloodType}{donor.district ? ` · ${donor.district}` : ''}
          </Text>
          <View style={styles.eligibility}>
            <EligibilityBadge lastDonation={donor.lastDonation} variant="card" />
          </View>
          <Field label="Donation date *" value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" />
          <Field label="Hospital / blood bank" value={hospital} onChangeText={setHospital} />
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save donation</Text>}
          </TouchableOpacity>
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
    paddingTop: HEADER_OFFSET,
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
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 4,
  },
  eligibility: {
    marginVertical: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 120,
  },
});

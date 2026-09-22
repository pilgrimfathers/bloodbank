import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { COOLOFF_MONTHS } from '@/shared/constants';
import { Donation, UserProfile } from '@/shared/types';
import { coversDistrict, getDonations, getUser, logDonation } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { addMonths } from '@/shared/eligibility';
import { formatDate, parseDateInput, toDateInput } from '@/shared/format';
import { palette, space } from '@/src/theme';
import DonorCard from '@/src/components/DonorCard';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import EmptyState from '@/src/components/ui/EmptyState';
import Screen from '@/src/components/ui/Screen';

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
      showMessage('Could not load donor', 'Check your connection and try again.');
    });
  }, [targetId, requestId]);

  if (!me || !donor) {
    return (
      <Screen back title="Log donation">
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const isSelf = donor.id === me.id;
  if (!isSelf && !coversDistrict(me, donor.district)) {
    return (
      <Screen back title="Log donation">
        <EmptyState
          icon="lock-outline"
          title="You can't log donations for this donor"
          message="Only volunteers who manage this donor's district can do that."
        />
      </Screen>
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
      showMessage('Donation saved', `Thank you! ${isSelf ? 'You' : donor.name} can donate again from ${formatDate(addMonths(donationDate, COOLOFF_MONTHS))}.`);
      router.back();
    } catch (error) {
      console.error('Error logging donation:', error);
      showMessage('Could not save donation', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      back
      title={isSelf ? 'I donated blood' : 'Log donation'}
      subtitle={isSelf ? 'This starts your cool-off period' : `For ${donor.name}${donor.district ? `, ${donor.district}` : ''}`}
    >
      <DonorCard
        bloodType={donor.bloodType}
        lastDonation={donor.lastDonation}
        donationCount={donor.donationCount ?? history.length}
      />
      <View>
        <Field label="Donation date" value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" hint="Today by default" />
        <Field label="Hospital or blood bank" value={hospital} onChangeText={setHospital} placeholder="e.g. District Hospital, Kanhangad" />
        <Button icon="water-check" label="Save donation" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
});

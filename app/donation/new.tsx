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
import { palette, space } from '@/src/theme';
import DateField from '@/src/components/DateField';
import DonorCard from '@/src/components/DonorCard';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import EmptyState from '@/src/components/ui/EmptyState';
import Screen from '@/src/components/ui/Screen';
import { useI18n } from '@/src/i18n';

// Logs a donation for the current user, or for any donor a volunteer manages.
export default function NewDonationScreen() {
  const { donorId, requestId } = useLocalSearchParams<{ donorId?: string; requestId?: string }>();
  const { profile: me } = useCurrentUser();
  const { t, formatDate, districtName } = useI18n();
  const [donor, setDonor] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<Donation[]>([]);
  const [donationDate, setDonationDate] = useState(new Date());
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
      showMessage(t('donorDetail.couldNotLoad'), t('common.checkConnection'));
    });
  }, [targetId, requestId]);

  if (!me || !donor) {
    return (
      <Screen back title={t('donorDetail.logDonation')}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const isSelf = donor.id === me.id;
  if (!isSelf && !coversDistrict(me, donor.district)) {
    return (
      <Screen back title={t('donorDetail.logDonation')}>
        <EmptyState
          icon="lock-outline"
          title={t('donationNew.notAllowedTitle')}
          message={t('donationNew.notAllowedMessage')}
        />
      </Screen>
    );
  }

  const handleSave = async () => {
    if (donationDate > new Date()) return showMessage(t('donationNew.invalidDate'), t('donationNew.futureDate'));

    // Two donations closer than the cool-off period usually means a mistake.
    const tooClose = history.find(d =>
      donationDate < addMonths(d.date, COOLOFF_MONTHS) && d.date < addMonths(donationDate, COOLOFF_MONTHS)
    );
    if (tooClose) {
      const ok = await confirmAction(
        t('donationNew.coolOffTitle'),
        t('donationNew.coolOffMessage', { name: donor.name, date: formatDate(tooClose.date), months: COOLOFF_MONTHS }),
        t('donationNew.record'),
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await logDonation(donor, { date: donationDate, hospital, requestId }, { id: me.id, name: me.name });
      const nextDate = formatDate(addMonths(donationDate, COOLOFF_MONTHS));
      showMessage(
        t('donationNew.savedTitle'),
        isSelf
          ? t('donationNew.savedSelf', { date: nextDate })
          : t('donationNew.savedOther', { name: donor.name, date: nextDate }),
      );
      router.back();
    } catch (error) {
      console.error('Error logging donation:', error);
      showMessage(t('donationNew.couldNotSave'), t('common.checkConnection'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      back
      title={isSelf ? t('donationNew.titleSelf') : t('donorDetail.logDonation')}
      subtitle={isSelf
        ? t('donationNew.subtitleSelf')
        : donor.district
          ? t('donationNew.forDonorIn', { name: donor.name, district: districtName(donor.district) })
          : t('donationNew.forDonor', { name: donor.name })}
    >
      <DonorCard
        bloodType={donor.bloodType}
        lastDonation={donor.lastDonation}
        donationCount={donor.donationCount ?? history.length}
      />
      <View>
        <DateField
          label={t('donationNew.dateLabel')}
          value={donationDate}
          onChange={picked => picked && setDonationDate(picked)}
          maximumDate={new Date()}
          hint={t('donationNew.dateHint')}
        />
        <Field
          label={t('donationNew.hospitalLabel')}
          value={hospital}
          onChangeText={setHospital}
          placeholder={t('donationNew.hospitalPlaceholder')}
        />
        <Button icon="water-check" label={t('donationNew.save')} onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
});

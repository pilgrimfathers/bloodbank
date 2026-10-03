import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BLOOD_TYPES, KERALA_DISTRICTS } from '@/shared/constants';
import { BloodRequest } from '@/shared/types';
import { showMessage } from '@/src/utils/dialog';
import { callNotifyApi } from '@/src/utils/push';
import { NOTIFY_ENDPOINTS } from '@/shared/notifications';
import { normalizePhone } from '@/shared/format';
import { StringKey, useI18n } from '@/src/i18n';
import { space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import Field from '@/src/components/Field';
import HospitalField from '@/src/components/HospitalField';
import Button from '@/src/components/ui/Button';
import Screen from '@/src/components/ui/Screen';

type Urgency = BloodRequest['urgency'];

const URGENCY_LABELS: Record<Urgency, StringKey> = {
  high: 'urgency.high',
  medium: 'urgency.medium',
  low: 'urgency.low',
};

export default function NewRequestScreen() {
  const { profile } = useCurrentUser();
  const { t, districtName } = useI18n();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    district: profile?.district ?? '',
    bloodType: '',
    units: '1',
    urgency: '' as Urgency | '',
    hospital: '',
    location: '',
    contactNumber: profile?.phoneNumber ?? '',
    patientName: '',
  });
  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    const units = Number(formData.units);
    const contactNumber = normalizePhone(formData.contactNumber);

    if (!formData.patientName.trim()) return showMessage(t('requestNew.missingPatient.title'), t('requestNew.missingPatient.message'));
    if (!formData.bloodType) return showMessage(t('requestNew.missingBloodType.title'), t('requestNew.missingBloodType.message'));
    if (!/^\d+$/.test(formData.units.trim()) || units < 1) {
      return showMessage(t('requestNew.invalidUnits.title'), t('requestNew.invalidUnits.message'));
    }
    if (!formData.urgency) return showMessage(t('requestNew.missingUrgency.title'), t('requestNew.missingUrgency.message'));
    if (!formData.hospital.trim()) return showMessage(t('requestNew.missingHospital.title'), t('requestNew.missingHospital.message'));
    if (!formData.district) return showMessage(t('requestNew.missingDistrict.title'), t('requestNew.missingDistrict.message'));
    if (!formData.location.trim()) return showMessage(t('requestNew.missingArea.title'), t('requestNew.missingArea.message'));
    if (!contactNumber) return showMessage(t('requestNew.invalidPhone.title'), t('requestNew.invalidPhone.message'));

    const user = auth.currentUser;
    if (!user) return showMessage(t('requestNew.notSignedIn.title'), t('requestNew.notSignedIn.message'));

    setSaving(true);
    try {
      const request: Omit<BloodRequest, 'id'> = {
        requesterId: user.uid,
        requesterName: user.displayName || profile?.name || 'Anonymous',
        patientName: formData.patientName.trim(),
        bloodType: formData.bloodType,
        units,
        urgency: formData.urgency,
        hospital: formData.hospital.trim(),
        district: formData.district,
        location: formData.location.trim(),
        status: 'open',
        createdAt: new Date(),
        contactNumber,
      };

      const ref = await addDoc(collection(firestore, 'bloodRequests'), request);
      // Alert admins in the background; posting must not depend on it.
      callNotifyApi(NOTIFY_ENDPOINTS.requestCreated, { requestId: ref.id })
        .catch(error => console.warn('Could not alert admins:', error));
      showMessage(t('requestNew.posted.title'), t('requestNew.posted.message'));
      router.back();
    } catch (error) {
      console.error('Error creating request:', error);
      showMessage(t('requestNew.couldNotPost'), t('common.checkConnection'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen back title={t('requestNew.title')} subtitle={t('requestNew.subtitle')}>
      <Field
        label={t('requestNew.patientName')}
        value={formData.patientName}
        onChangeText={patientName => set({ patientName })}
      />
      <ChipSelect
        label={t('requestNew.bloodType')}
        options={BLOOD_TYPES}
        value={formData.bloodType || null}
        onChange={bloodType => set({ bloodType })}
      />
      <Field
        label={t('requestNew.units')}
        value={formData.units}
        onChangeText={units => set({ units })}
        keyboardType="number-pad"
      />
      <ChipSelect
        label={t('requestNew.urgency')}
        options={['high', 'medium', 'low']}
        value={formData.urgency || null}
        onChange={urgency => set({ urgency: urgency as Urgency })}
        format={value => t(URGENCY_LABELS[value as Urgency])}
      />
      <ChipSelect
        label={t('requestNew.district')}
        options={KERALA_DISTRICTS}
        value={formData.district || null}
        onChange={district => set({ district })}
        format={districtName}
      />
      <HospitalField
        label={t('requestNew.hospital')}
        hint={t('requestNew.hospitalHint')}
        value={formData.hospital}
        onChangeText={hospital => set({ hospital })}
        district={formData.district}
      />
      <Field
        label={t('requestNew.area')}
        value={formData.location}
        onChangeText={location => set({ location })}
        placeholder={t('requestNew.areaPlaceholder')}
      />
      <Field
        label={t('requestNew.contact')}
        value={formData.contactNumber}
        onChangeText={contactNumber => set({ contactNumber })}
        keyboardType="phone-pad"
        hint={t('requestNew.contactHint')}
      />
      <Button label={t('requestNew.submit')} icon="water-plus" loading={saving} onPress={handleSubmit} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: space.sm,
  },
});

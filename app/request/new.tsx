import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BLOOD_TYPES, KERALA_DISTRICTS } from '@/shared/constants';
import { BloodRequest } from '@/shared/types';
import { showMessage } from '@/src/utils/dialog';
import { normalizePhone } from '@/shared/format';
import { space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import Field from '@/src/components/Field';
import Button from '@/src/components/ui/Button';
import Screen from '@/src/components/ui/Screen';

type Urgency = BloodRequest['urgency'];

const URGENCY_LABELS: Record<Urgency, string> = {
  high: 'Urgent',
  medium: 'Needed soon',
  low: 'Planned',
};

export default function NewRequestScreen() {
  const { profile } = useCurrentUser();
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

    if (!formData.patientName.trim()) return showMessage('Missing patient name', 'Enter the name of the patient who needs blood.');
    if (!formData.bloodType) return showMessage('Missing blood type', 'Select the blood type the patient needs.');
    if (!/^\d+$/.test(formData.units.trim()) || units < 1) {
      return showMessage('Invalid units', 'Enter the number of units needed, for example 2.');
    }
    if (!formData.urgency) return showMessage('Missing urgency', 'Select how soon the blood is needed.');
    if (!formData.hospital.trim()) return showMessage('Missing hospital', 'Enter the hospital or blood bank name.');
    if (!formData.district) return showMessage('Missing district', 'Select the district of the hospital.');
    if (!formData.location.trim()) return showMessage('Missing area', 'Enter the area or town of the hospital.');
    if (!contactNumber) return showMessage('Invalid phone', 'Enter a 10-digit Indian mobile number donors can call.');

    const user = auth.currentUser;
    if (!user) return showMessage('Not signed in', 'Sign in again to post a request.');

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

      await addDoc(collection(firestore, 'bloodRequests'), request);
      showMessage('Request posted', 'Volunteers and donors can now see it.');
      router.back();
    } catch (error) {
      console.error('Error creating request:', error);
      showMessage('Could not post request', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen back title="Request blood" subtitle="Volunteers will call donors who match">
      <Field
        label="Patient name *"
        value={formData.patientName}
        onChangeText={patientName => set({ patientName })}
      />
      <ChipSelect
        label="Blood type needed *"
        options={BLOOD_TYPES}
        value={formData.bloodType || null}
        onChange={bloodType => set({ bloodType })}
      />
      <Field
        label="Units needed *"
        value={formData.units}
        onChangeText={units => set({ units })}
        keyboardType="number-pad"
      />
      <ChipSelect
        label="How soon *"
        options={['high', 'medium', 'low']}
        value={formData.urgency || null}
        onChange={urgency => set({ urgency: urgency as Urgency })}
        format={value => URGENCY_LABELS[value as Urgency]}
      />
      <Field
        label="Hospital or blood bank *"
        value={formData.hospital}
        onChangeText={hospital => set({ hospital })}
      />
      <ChipSelect
        label="District *"
        options={KERALA_DISTRICTS}
        value={formData.district || null}
        onChange={district => set({ district })}
      />
      <Field
        label="Area / town *"
        value={formData.location}
        onChangeText={location => set({ location })}
        placeholder="e.g. Kanhangad, Edappally"
      />
      <Field
        label="Contact number *"
        value={formData.contactNumber}
        onChangeText={contactNumber => set({ contactNumber })}
        keyboardType="phone-pad"
        hint="Donors and volunteers will call this number"
      />
      <Button label="Post request" icon="water-plus" loading={saving} onPress={handleSubmit} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: space.sm,
  },
});

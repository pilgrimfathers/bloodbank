import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { BLOOD_TYPES, COLORS, KERALA_DISTRICTS } from '../constants';
import { UserProfile } from '../types';
import { showMessage } from '../utils/dialog';
import { normalizePhone, parseDateInput, toDateInput } from '../utils/format';
import ChipSelect from './ChipSelect';
import Field from './Field';

export type DonorFormValues = {
  name: string;
  phoneNumber: string;
  bloodType: string;
  district: string;
  area: string;
  address: string;
  medicalConditions: string;
  isDonor: boolean;
  notes: string;
  lastDonation: Date | null;
};

type Props = {
  initial?: Partial<UserProfile>;
  // Last donation is only entered once; after that it comes from donation records.
  showLastDonation?: boolean;
  showNotes?: boolean;
  submitLabel: string;
  onSubmit: (values: DonorFormValues) => Promise<void>;
};

export default function DonorForm({ initial, showLastDonation, showNotes, submitLabel, onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    phoneNumber: initial?.phoneNumber ?? '',
    bloodType: initial?.bloodType ?? '',
    district: initial?.district ?? '',
    area: initial?.area ?? '',
    address: initial?.address ?? '',
    medicalConditions: initial?.medicalConditions ?? '',
    isDonor: initial?.isDonor ?? true,
    notes: initial?.notes ?? '',
    lastDonation: toDateInput(initial?.lastDonation),
  });
  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    const phoneNumber = normalizePhone(form.phoneNumber);
    if (!form.name.trim()) return showMessage('Missing name', 'Please enter the full name.');
    if (!phoneNumber) return showMessage('Invalid phone', 'Enter a 10-digit Indian mobile number.');
    if (!form.bloodType) return showMessage('Missing blood type', 'Please select a blood type.');
    if (!form.district) return showMessage('Missing district', 'Please select a district.');

    let lastDonation: Date | null = null;
    if (showLastDonation && form.lastDonation.trim()) {
      lastDonation = parseDateInput(form.lastDonation);
      if (!lastDonation) return showMessage('Invalid date', 'Enter the last donation date as DD-MM-YYYY.');
      if (lastDonation > new Date()) return showMessage('Invalid date', 'Last donation date cannot be in the future.');
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        phoneNumber,
        area: form.area.trim(),
        address: form.address.trim(),
        medicalConditions: form.medicalConditions.trim(),
        notes: form.notes.trim(),
        lastDonation,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <Field label="Full name *" value={form.name} onChangeText={name => set({ name })} />
      <Field
        label="Phone number *"
        value={form.phoneNumber}
        onChangeText={phoneNumber => set({ phoneNumber })}
        keyboardType="phone-pad"
        placeholder="10-digit mobile number"
      />
      <ChipSelect
        label="Blood type *"
        options={BLOOD_TYPES}
        value={form.bloodType || null}
        onChange={bloodType => set({ bloodType })}
      />
      <ChipSelect
        label="District *"
        options={KERALA_DISTRICTS}
        value={form.district || null}
        onChange={district => set({ district })}
      />
      <Field
        label="Area / town"
        value={form.area}
        onChangeText={area => set({ area })}
        placeholder="e.g. Kanhangad, Edappally"
      />
      <Field label="Address" value={form.address} onChangeText={address => set({ address })} multiline />
      {showLastDonation && (
        <Field
          label="Last donation date"
          value={form.lastDonation}
          onChangeText={lastDonation => set({ lastDonation })}
          placeholder="DD-MM-YYYY"
          hint="Leave empty if never donated"
        />
      )}
      <Field
        label="Medical conditions"
        value={form.medicalConditions}
        onChangeText={medicalConditions => set({ medicalConditions })}
        multiline
      />
      {showNotes && (
        <Field
          label="Volunteer notes"
          value={form.notes}
          onChangeText={notes => set({ notes })}
          multiline
          hint="Not shown to the donor in the app"
        />
      )}
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchLabel}>Available to donate</Text>
          <Text style={styles.switchHint}>Turn off to stop being contacted for requests</Text>
        </View>
        <Switch
          value={form.isDonor}
          onValueChange={isDonor => set({ isDonor })}
          trackColor={{ true: COLORS.primary }}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="white" />
          : <Text style={styles.buttonText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchText: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchHint: {
    fontSize: 12,
    color: '#999',
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
});

import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { BLOOD_TYPES, KERALA_DISTRICTS } from '@/shared/constants';
import { palette, radius, space } from '../theme';
import { UserProfile } from '@/shared/types';
import { showMessage } from '../utils/dialog';
import { normalizePhone, parseDateInput, toDateInput } from '@/shared/format';
import ChipSelect from './ChipSelect';
import Field from './Field';
import Button from './ui/Button';
import Text from './ui/Text';
import { useI18n } from '../i18n';

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
  const { t, districtName } = useI18n();
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
    if (!form.name.trim()) return showMessage(t('donorForm.missingName'), t('donorForm.enterName'));
    if (!phoneNumber) return showMessage(t('donorForm.invalidPhone'), t('donorForm.enterPhone'));
    if (!form.bloodType) return showMessage(t('donorForm.missingBloodType'), t('donorForm.selectBloodType'));
    if (!form.district) return showMessage(t('donorForm.missingDistrict'), t('donorForm.selectDistrict'));

    let lastDonation: Date | null = null;
    if (showLastDonation && form.lastDonation.trim()) {
      lastDonation = parseDateInput(form.lastDonation);
      if (!lastDonation) return showMessage(t('donationNew.invalidDate'), t('donorForm.lastDateFormat'));
      if (lastDonation > new Date()) return showMessage(t('donationNew.invalidDate'), t('donorForm.lastDateFuture'));
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
      <Field label={t('donorForm.fullName')} value={form.name} onChangeText={name => set({ name })} autoComplete="name" />
      <Field
        label={t('donorForm.phone')}
        value={form.phoneNumber}
        onChangeText={phoneNumber => set({ phoneNumber })}
        keyboardType="phone-pad"
        placeholder={t('donorForm.phonePlaceholder')}
        autoComplete="tel"
      />
      <ChipSelect
        label={t('donorForm.bloodGroup')}
        options={BLOOD_TYPES}
        value={form.bloodType || null}
        onChange={bloodType => set({ bloodType })}
      />
      <ChipSelect
        label={t('manage.district')}
        options={KERALA_DISTRICTS}
        value={form.district || null}
        onChange={district => set({ district })}
        format={district => districtName(district)}
      />
      <Field
        label={t('donorForm.area')}
        value={form.area}
        onChangeText={area => set({ area })}
        placeholder={t('donorForm.areaPlaceholder')}
      />
      <Field label={t('donorForm.address')} value={form.address} onChangeText={address => set({ address })} multiline />
      {showLastDonation && (
        <Field
          label={t('donorForm.lastDonation')}
          value={form.lastDonation}
          onChangeText={lastDonation => set({ lastDonation })}
          placeholder="DD-MM-YYYY"
          hint={t('donorForm.lastDonationHint')}
        />
      )}
      <Field
        label={t('donorForm.medical')}
        value={form.medicalConditions}
        onChangeText={medicalConditions => set({ medicalConditions })}
        multiline
      />
      {showNotes && (
        <Field
          label={t('donorForm.notes')}
          value={form.notes}
          onChangeText={notes => set({ notes })}
          multiline
          hint={t('donorForm.notesHint')}
        />
      )}
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text variant="bodyStrong">{t('donorForm.available')}</Text>
          <Text variant="caption" color={palette.inkMuted}>{t('donorForm.availableHint')}</Text>
        </View>
        <Switch
          value={form.isDonor}
          onValueChange={isDonor => set({ isDonor })}
          trackColor={{ false: palette.line, true: palette.leaf }}
          thumbColor="#fff"
          accessibilityLabel={t('donorForm.available')}
        />
      </View>

      <Button label={submitLabel} onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    marginBottom: space.xl,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  switchText: {
    flex: 1,
  },
});

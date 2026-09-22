import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { KERALA_DISTRICTS } from '@/shared/constants';
import { Donation, UserProfile, UserRole } from '@/shared/types';
import { coversDistrict, deleteDonation, getDonations, getUser } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { formatDate } from '@/shared/format';
import { palette, radius, space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import DonationList from '@/src/components/DonationList';
import DonorCard from '@/src/components/DonorCard';
import Button from '@/src/components/ui/Button';
import EmptyState from '@/src/components/ui/EmptyState';
import { List, ListRow } from '@/src/components/ui/List';
import Pill from '@/src/components/ui/Pill';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';

const ROLES: UserRole[] = ['donor', 'volunteer', 'admin'];
const ROLE_LABELS: Record<UserRole, string> = { donor: 'Donor', volunteer: 'Volunteer', admin: 'Admin' };

export default function DonorDetailScreen() {
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId?: string }>();
  const { profile: me } = useCurrentUser();
  const [donor, setDonor] = useState<UserProfile | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    try {
      const user = await getUser(id);
      if (!user) {
        setNotFound(true);
        return;
      }
      setDonor(user);
      setDonations(await getDonations(id));
    } catch (error) {
      console.error('Error loading donor:', error);
      showMessage('Could not load donor', 'Check your connection and try again.');
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, [id]));

  if (notFound) {
    return (
      <Screen back title="Donor">
        <EmptyState icon="account-question-outline" title="This donor no longer exists" />
      </Screen>
    );
  }
  if (!donor || !me) {
    return (
      <Screen back title="Donor">
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const canManage = coversDistrict(me, donor.district);
  const isAdmin = me.role === 'admin';

  const update = async (patch: Partial<UserProfile>, message?: string) => {
    try {
      await updateDoc(doc(firestore, 'users', donor.id), { ...patch, updatedAt: new Date() });
      setDonor({ ...donor, ...patch });
      if (message) showMessage('Saved', message);
    } catch (error) {
      console.error('Error updating donor:', error);
      showMessage('Could not update donor', 'Check your connection and try again.');
    }
  };

  const toggleActive = async () => {
    const deactivating = donor.status !== 'inactive';
    const ok = await confirmAction(
      deactivating ? 'Deactivate donor?' : 'Reactivate donor?',
      deactivating
        ? `${donor.name} will be hidden from eligible donor searches.`
        : `${donor.name} will show up in donor searches again.`,
      deactivating ? 'Deactivate' : 'Reactivate',
    );
    if (ok) await update({ status: deactivating ? 'inactive' : 'active' });
  };

  const handleDeleteDonation = async (donation: Donation) => {
    const ok = await confirmAction('Delete donation?', `Remove the donation on ${formatDate(donation.date)}?`, 'Delete');
    if (!ok) return;
    try {
      await deleteDonation(donation);
      await load();
    } catch (error) {
      console.error('Error deleting donation:', error);
      showMessage('Could not delete donation', 'Check your connection and try again.');
    }
  };

  const phone = donor.phoneNumber?.replace(/\D/g, '').slice(-10);
  const place = [donor.area, donor.district].filter(Boolean).join(', ') || 'No district set';

  return (
    <Screen
      back
      title={donor.name}
      subtitle={place}
      hero={
        <DonorCard
          bloodType={donor.bloodType}
          lastDonation={donor.lastDonation}
          donationCount={donor.donationCount ?? donations.length}
        />
      }
    >
      <View style={styles.pills}>
        <Pill label={ROLE_LABELS[donor.role ?? 'donor']} tone="info" />
        <Pill label={donor.verified ? 'Verified' : 'Unverified'} tone={donor.verified ? 'leaf' : 'muted'} />
        {!donor.isDonor && <Pill label="Unavailable" tone="turmeric" />}
        {donor.status === 'inactive' && <Pill label="Inactive" tone="muted" />}
        {donor.hasAccount === false && <Pill label="No app" tone="kasavu" />}
        {donor.visibility === 'public' && <Pill label="Public" tone="leaf" />}
        {donor.visibility === 'public_phone' && <Pill label="Public with number" tone="leaf" />}
      </View>

      {phone && (
        <View style={styles.row}>
          <Button icon="phone" label="Call" onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.flex} />
          <Button
            icon="whatsapp"
            label="WhatsApp"
            variant="secondary"
            color={palette.leaf}
            onPress={() => Linking.openURL(`https://wa.me/91${phone}`)}
            style={styles.flex}
          />
        </View>
      )}

      <List>
        <ListRow icon="phone-outline" title={donor.phoneNumber || 'No phone number'} subtitle="Phone" />
        {donor.email && <ListRow icon="email-outline" title={donor.email} subtitle="Email" />}
        <ListRow icon="home-outline" title={donor.address || 'Not added'} subtitle="Address" />
        <ListRow icon="medical-bag" title={donor.medicalConditions || 'None noted'} subtitle="Medical conditions" />
        {donor.notes && <ListRow icon="note-text-outline" title={donor.notes} subtitle="Volunteer notes" />}
        <ListRow icon="calendar-blank-outline" title={formatDate(donor.createdAt)} subtitle="Added on" />
      </List>

      {canManage && (
        <View style={styles.manage}>
          <Button
            icon="water-plus"
            label="Log donation"
            onPress={() => router.push({
              pathname: '/donation/new',
              params: { donorId: donor.id, ...(requestId && { requestId }) },
            })}
          />
          <View style={styles.row}>
            <Button
              icon="pencil-outline"
              label="Edit"
              variant="secondary"
              onPress={() => router.push({ pathname: '/donor/edit', params: { id: donor.id } })}
              style={styles.flex}
            />
            <Button
              icon={donor.verified ? 'shield-off-outline' : 'shield-check-outline'}
              label={donor.verified ? 'Unverify' : 'Verify'}
              variant="secondary"
              color={palette.leaf}
              onPress={() => update({ verified: !donor.verified })}
              style={styles.flex}
            />
          </View>
          <Button
            icon={donor.status === 'inactive' ? 'account-check-outline' : 'account-off-outline'}
            label={donor.status === 'inactive' ? 'Reactivate donor' : 'Deactivate donor'}
            variant="secondary"
            color={palette.inkMuted}
            onPress={toggleActive}
          />
        </View>
      )}

      {isAdmin && donor.id !== me.id && donor.hasAccount !== false && (
        <RoleEditor donor={donor} onSave={update} />
      )}

      <Section title="Donation history">
        <DonationList donations={donations} onDelete={canManage ? handleDeleteDonation : undefined} />
      </Section>
    </Screen>
  );
}

function RoleEditor({ donor, onSave }: {
  donor: UserProfile;
  onSave: (patch: Partial<UserProfile>, message?: string) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(donor.role ?? 'donor');
  const [districts, setDistricts] = useState<string[]>(donor.volunteerDistricts ?? []);
  const [saving, setSaving] = useState(false);

  const toggleDistrict = (district: string) => {
    setDistricts(prev => prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district]);
  };

  const save = async () => {
    setSaving(true);
    await onSave(
      { role, volunteerDistricts: role === 'volunteer' ? districts : [] },
      `${donor.name} is now ${role === 'admin' ? 'an admin' : `a ${role}`}.`,
    );
    setSaving(false);
  };

  return (
    <Section title="Access">
      <View style={styles.panel}>
        <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
          Only admins can change this.
        </Text>
        <ChipSelect
          label="Role"
          options={ROLES}
          value={role}
          onChange={value => setRole(value as UserRole)}
          format={value => ROLE_LABELS[value as UserRole]}
        />
        {role === 'volunteer' && (
          <View style={styles.districts}>
            <Text variant="label" color={palette.inkMuted}>Districts they manage</Text>
            <Text variant="caption" color={palette.inkFaint} style={styles.panelHint}>
              Leave all unselected to cover the whole of Kerala.
            </Text>
            <View style={styles.chips}>
              {KERALA_DISTRICTS.map(district => {
                const selected = districts.includes(district);
                return (
                  <Pressable
                    key={district}
                    onPress={() => toggleDistrict(district)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text variant="label" color={selected ? '#fff' : palette.ink}>{district}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <Button label="Save access" color={palette.info} loading={saving} onPress={save} />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: space.xxl,
  },
  flex: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  manage: {
    gap: space.md,
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    padding: space.lg,
  },
  panelHint: {
    marginBottom: space.md,
  },
  districts: {
    marginBottom: space.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: palette.info,
    borderColor: palette.info,
  },
});

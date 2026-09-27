import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { KERALA_DISTRICTS } from '@/shared/constants';
import { DONOR_ENDPOINTS, MergeDonorResult } from '@/shared/donors';
import { Donation, UserProfile, UserRole } from '@/shared/types';
import { coversDistrict, deleteAddedDonor, deleteDonation, getDonations, getUser, mapUser } from '@/src/utils/data';
import { callNotifyApi } from '@/src/utils/push';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { formatDate } from '@/shared/format';
import { palette, radius, space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import DonationList from '@/src/components/DonationList';
import DonorCard from '@/src/components/DonorCard';
import Field from '@/src/components/Field';
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

  const handleDeleteDonor = async () => {
    const ok = await confirmAction(
      'Delete donor?',
      `${donor.name} and their ${donations.length} recorded donations will be removed. This can't be undone.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await deleteAddedDonor(donor);
      router.back();
    } catch (error) {
      console.error('Error deleting donor:', error);
      showMessage('Could not delete donor', 'Check your connection and try again.');
    }
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
          {isAdmin && donor.hasAccount === false && (
            <Button
              icon="trash-can-outline"
              label="Delete donor"
              variant="secondary"
              color={palette.blood}
              onPress={handleDeleteDonor}
            />
          )}
        </View>
      )}

      {isAdmin && donor.hasAccount === false && (
        <MergeSection
          donor={donor}
          onMerged={intoId => router.replace({ pathname: '/donor/[id]', params: { id: intoId } })}
        />
      )}

      {isAdmin && donor.hasAccount !== false && <AddedRecordsSection donor={donor} />}

      {isAdmin && donor.id !== me.id && donor.hasAccount !== false && (
        <RoleEditor donor={donor} onSave={update} />
      )}

      <Section title="Donation history">
        <DonationList donations={donations} onDelete={canManage ? handleDeleteDonation : undefined} />
      </Section>
    </Screen>
  );
}

// Other donors sharing this donor's phone number.
function useSamePhone(donor: UserProfile) {
  const [matches, setMatches] = useState<UserProfile[]>([]);
  useEffect(() => {
    if (!donor.phoneNumber) return;
    let cancelled = false;
    getDocs(query(collection(firestore, 'users'), where('phoneNumber', '==', donor.phoneNumber)))
      .then(snap => {
        if (!cancelled) setMatches(snap.docs.map(mapUser).filter(user => user.id !== donor.id));
      })
      .catch(error => console.error('Error finding donors with the same phone:', error));
    return () => { cancelled = true; };
  }, [donor.id, donor.phoneNumber]);
  return matches;
}

// On an app account: donors a volunteer added earlier who may be the same person.
function AddedRecordsSection({ donor }: { donor: UserProfile }) {
  const added = useSamePhone(donor).filter(user => user.hasAccount === false);
  if (!added.length) return null;
  return (
    <Section title="Also added without the app">
      <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
        A volunteer added a donor with this number before they signed up. Open it to merge it into this account.
      </Text>
      <List>
        {added.map(user => (
          <ListRow
            key={user.id}
            icon="account-outline"
            title={user.name}
            subtitle={`${user.bloodType} · ${user.district || 'No district'}`}
            onPress={() => router.push({ pathname: '/donor/[id]', params: { id: user.id } })}
          />
        ))}
      </List>
    </Section>
  );
}

// On a donor added without the app: move them onto the account they signed up with.
function MergeSection({ donor, onMerged }: { donor: UserProfile; onMerged: (intoId: string) => void }) {
  const samePhone = useSamePhone(donor).filter(user => user.hasAccount !== false);
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<UserProfile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const search = async () => {
    if (!email.trim()) return;
    setBusy('search');
    try {
      const snap = await getDocs(query(collection(firestore, 'users'), where('email', '==', email.trim())));
      setFound(snap.docs.map(mapUser).filter(user => user.hasAccount !== false && user.id !== donor.id));
    } catch (error) {
      console.error('Error searching accounts:', error);
      showMessage('Could not search', 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const merge = async (account: UserProfile) => {
    const ok = await confirmAction(
      'Merge donor?',
      `Merge ${donor.name} into ${account.name}'s account (${account.email ?? account.phoneNumber})? ` +
        'Their donation history moves to the account, and this record is deleted.',
      'Merge',
    );
    if (!ok) return;
    setBusy(account.id);
    try {
      await callNotifyApi<MergeDonorResult>(DONOR_ENDPOINTS.merge, { fromId: donor.id, intoId: account.id });
      onMerged(account.id);
    } catch (error) {
      showMessage('Could not merge', error instanceof Error ? error.message : 'Try again in a minute.');
      setBusy(null);
    }
  };

  const candidates = [...samePhone, ...(found ?? []).filter(user => !samePhone.some(s => s.id === user.id))];

  return (
    <Section title="Signed up on the app?">
      <View style={styles.panel}>
        <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
          Merge this donor into their account to keep one record.
        </Text>
        {candidates.map(account => (
          <View key={account.id} style={styles.candidate}>
            <Text variant="bodyStrong">{account.name}</Text>
            <Text variant="caption" color={palette.inkMuted}>
              {[account.bloodType, account.email, account.phoneNumber === donor.phoneNumber && 'Same phone']
                .filter(Boolean).join(' · ')}
            </Text>
            <Button
              icon="call-merge"
              label="Merge into this account"
              variant="secondary"
              loading={busy === account.id}
              disabled={!!busy}
              onPress={() => merge(account)}
              style={styles.candidateButton}
            />
          </View>
        ))}
        <Field
          label="Find account by email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={search}
        />
        {found && !found.length && (
          <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
            No app account uses that email.
          </Text>
        )}
        <Button
          icon="magnify"
          label="Search"
          variant="secondary"
          loading={busy === 'search'}
          disabled={!!busy}
          onPress={search}
        />
      </View>
    </Section>
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
  candidate: {
    paddingVertical: space.md,
    marginBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  candidateButton: {
    marginTop: space.sm,
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

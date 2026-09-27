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
import { StringKey, useI18n } from '@/src/i18n';

const ROLES: UserRole[] = ['donor', 'volunteer', 'admin'];
const ROLE_LABELS: Record<UserRole, StringKey> = { donor: 'role.donor', volunteer: 'role.volunteer', admin: 'role.admin' };

export default function DonorDetailScreen() {
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId?: string }>();
  const { profile: me } = useCurrentUser();
  const { t, formatDate, districtName } = useI18n();
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
      showMessage(t('donorDetail.couldNotLoad'), t('common.checkConnection'));
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, [id]));

  if (notFound) {
    return (
      <Screen back title={t('role.donor')}>
        <EmptyState icon="account-question-outline" title={t('donorDetail.notFound')} />
      </Screen>
    );
  }
  if (!donor || !me) {
    return (
      <Screen back title={t('role.donor')}>
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
      if (message) showMessage(t('common.saved'), message);
    } catch (error) {
      console.error('Error updating donor:', error);
      showMessage(t('donorDetail.couldNotUpdate'), t('common.checkConnection'));
    }
  };

  const toggleActive = async () => {
    const deactivating = donor.status !== 'inactive';
    const ok = await confirmAction(
      deactivating ? t('donorDetail.deactivateTitle') : t('donorDetail.reactivateTitle'),
      deactivating
        ? t('donorDetail.deactivateMessage', { name: donor.name })
        : t('donorDetail.reactivateMessage', { name: donor.name }),
      deactivating ? t('donorDetail.deactivate') : t('donorDetail.reactivate'),
    );
    if (ok) await update({ status: deactivating ? 'inactive' : 'active' });
  };

  const handleDeleteDonor = async () => {
    const ok = await confirmAction(
      t('donorDetail.deleteTitle'),
      t('donorDetail.deleteMessage', { name: donor.name, count: donations.length }),
      t('common.delete'),
    );
    if (!ok) return;
    try {
      await deleteAddedDonor(donor);
      router.back();
    } catch (error) {
      console.error('Error deleting donor:', error);
      showMessage(t('donorDetail.couldNotDelete'), t('common.checkConnection'));
    }
  };

  const handleDeleteDonation = async (donation: Donation) => {
    const ok = await confirmAction(
      t('donorDetail.deleteDonationTitle'),
      t('donorDetail.deleteDonationMessage', { date: formatDate(donation.date) }),
      t('common.delete'),
    );
    if (!ok) return;
    try {
      await deleteDonation(donation);
      await load();
    } catch (error) {
      console.error('Error deleting donation:', error);
      showMessage(t('donorDetail.couldNotDeleteDonation'), t('common.checkConnection'));
    }
  };

  const phone = donor.phoneNumber?.replace(/\D/g, '').slice(-10);
  const place = [donor.area, districtName(donor.district)].filter(Boolean).join(', ') || t('manage.noDistrictSet');

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
        <Pill label={t(ROLE_LABELS[donor.role ?? 'donor'])} tone="info" />
        <Pill label={donor.verified ? t('manage.pill.verified') : t('manage.pill.unverified')} tone={donor.verified ? 'leaf' : 'muted'} />
        {!donor.isDonor && <Pill label={t('manage.pill.unavailable')} tone="turmeric" />}
        {donor.status === 'inactive' && <Pill label={t('manage.pill.inactive')} tone="muted" />}
        {donor.hasAccount === false && <Pill label={t('manage.pill.noApp')} tone="kasavu" />}
        {donor.visibility === 'public' && <Pill label={t('manage.pill.public')} tone="leaf" />}
        {donor.visibility === 'public_phone' && <Pill label={t('visibility.public_phone.label')} tone="leaf" />}
      </View>

      {phone && (
        <View style={styles.row}>
          <Button icon="phone" label={t('common.call')} onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.flex} />
          <Button
            icon="whatsapp"
            label={t('common.whatsapp')}
            variant="secondary"
            color={palette.leaf}
            onPress={() => Linking.openURL(`https://wa.me/91${phone}`)}
            style={styles.flex}
          />
        </View>
      )}

      <List>
        <ListRow icon="phone-outline" title={donor.phoneNumber || t('common.noPhone')} subtitle={t('donorDetail.phone')} />
        {donor.email && <ListRow icon="email-outline" title={donor.email} subtitle={t('donorDetail.email')} />}
        <ListRow icon="home-outline" title={donor.address || t('common.notAdded')} subtitle={t('donorDetail.address')} />
        <ListRow icon="medical-bag" title={donor.medicalConditions || t('donorDetail.noneNoted')} subtitle={t('donorDetail.medical')} />
        {donor.notes && <ListRow icon="note-text-outline" title={donor.notes} subtitle={t('donorDetail.volunteerNotes')} />}
        <ListRow icon="calendar-blank-outline" title={formatDate(donor.createdAt)} subtitle={t('donorDetail.addedOn')} />
      </List>

      {canManage && (
        <View style={styles.manage}>
          <Button
            icon="water-plus"
            label={t('donorDetail.logDonation')}
            onPress={() => router.push({
              pathname: '/donation/new',
              params: { donorId: donor.id, ...(requestId && { requestId }) },
            })}
          />
          <View style={styles.row}>
            <Button
              icon="pencil-outline"
              label={t('common.edit')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/donor/edit', params: { id: donor.id } })}
              style={styles.flex}
            />
            <Button
              icon={donor.verified ? 'shield-off-outline' : 'shield-check-outline'}
              label={donor.verified ? t('donorDetail.unverify') : t('donorDetail.verify')}
              variant="secondary"
              color={palette.leaf}
              onPress={() => update({ verified: !donor.verified })}
              style={styles.flex}
            />
          </View>
          <Button
            icon={donor.status === 'inactive' ? 'account-check-outline' : 'account-off-outline'}
            label={donor.status === 'inactive' ? t('donorDetail.reactivateDonor') : t('donorDetail.deactivateDonor')}
            variant="secondary"
            color={palette.inkMuted}
            onPress={toggleActive}
          />
          {isAdmin && donor.hasAccount === false && (
            <Button
              icon="trash-can-outline"
              label={t('donorDetail.deleteDonor')}
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

      <Section title={t('donorDetail.history')}>
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
  const { t, districtName } = useI18n();
  const added = useSamePhone(donor).filter(user => user.hasAccount === false);
  if (!added.length) return null;
  return (
    <Section title={t('donorDetail.alsoAdded')}>
      <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
        {t('donorDetail.alsoAddedHint')}
      </Text>
      <List>
        {added.map(user => (
          <ListRow
            key={user.id}
            icon="account-outline"
            title={user.name}
            subtitle={`${user.bloodType} · ${districtName(user.district) || t('common.noDistrict')}`}
            onPress={() => router.push({ pathname: '/donor/[id]', params: { id: user.id } })}
          />
        ))}
      </List>
    </Section>
  );
}

// On a donor added without the app: move them onto the account they signed up with.
function MergeSection({ donor, onMerged }: { donor: UserProfile; onMerged: (intoId: string) => void }) {
  const { t } = useI18n();
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
      showMessage(t('donorDetail.couldNotSearch'), t('common.checkConnection'));
    } finally {
      setBusy(null);
    }
  };

  const merge = async (account: UserProfile) => {
    const ok = await confirmAction(
      t('donorDetail.mergeTitle'),
      t('donorDetail.mergeMessage', {
        donor: donor.name,
        account: account.name,
        contact: account.email ?? account.phoneNumber ?? '',
      }),
      t('donorDetail.merge'),
    );
    if (!ok) return;
    setBusy(account.id);
    try {
      await callNotifyApi<MergeDonorResult>(DONOR_ENDPOINTS.merge, { fromId: donor.id, intoId: account.id });
      onMerged(account.id);
    } catch (error) {
      showMessage(t('donorDetail.couldNotMerge'), error instanceof Error ? error.message : t('common.tryAgainLater'));
      setBusy(null);
    }
  };

  const candidates = [...samePhone, ...(found ?? []).filter(user => !samePhone.some(s => s.id === user.id))];

  return (
    <Section title={t('donorDetail.signedUp')}>
      <View style={styles.panel}>
        <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
          {t('donorDetail.mergeHint')}
        </Text>
        {candidates.map(account => (
          <View key={account.id} style={styles.candidate}>
            <Text variant="bodyStrong">{account.name}</Text>
            <Text variant="caption" color={palette.inkMuted}>
              {[account.bloodType, account.email, account.phoneNumber === donor.phoneNumber && t('donorDetail.samePhone')]
                .filter(Boolean).join(' · ')}
            </Text>
            <Button
              icon="call-merge"
              label={t('donorDetail.mergeInto')}
              variant="secondary"
              loading={busy === account.id}
              disabled={!!busy}
              onPress={() => merge(account)}
              style={styles.candidateButton}
            />
          </View>
        ))}
        <Field
          label={t('donorDetail.findByEmail')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={search}
        />
        {found && !found.length && (
          <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
            {t('donorDetail.noAccount')}
          </Text>
        )}
        <Button
          icon="magnify"
          label={t('common.search')}
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
  const { t, districtName } = useI18n();
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
      t(role === 'admin' ? 'donorDetail.nowAdmin' : role === 'volunteer' ? 'donorDetail.nowVolunteer' : 'donorDetail.nowDonor', { name: donor.name }),
    );
    setSaving(false);
  };

  return (
    <Section title={t('donorDetail.access')}>
      <View style={styles.panel}>
        <Text variant="caption" color={palette.inkMuted} style={styles.panelHint}>
          {t('donorDetail.adminsOnly')}
        </Text>
        <ChipSelect
          label={t('donorDetail.role')}
          options={ROLES}
          value={role}
          onChange={value => setRole(value as UserRole)}
          format={value => t(ROLE_LABELS[value as UserRole])}
        />
        {role === 'volunteer' && (
          <View style={styles.districts}>
            <Text variant="label" color={palette.inkMuted}>{t('donorDetail.districtsTheyManage')}</Text>
            <Text variant="caption" color={palette.inkFaint} style={styles.panelHint}>
              {t('donorDetail.wholeKerala')}
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
                    <Text variant="label" color={selected ? '#fff' : palette.ink}>{districtName(district)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <Button label={t('donorDetail.saveAccess')} color={palette.info} loading={saving} onPress={save} />
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

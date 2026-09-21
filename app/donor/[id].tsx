import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { COLORS, KERALA_DISTRICTS } from '@/src/constants';
import { Donation, UserProfile, UserRole } from '@/src/types';
import { coversDistrict, deleteDonation, getDonations, getUser } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { formatDate } from '@/src/utils/format';
import BackButton from '@/src/components/BackButton';
import ChipSelect from '@/src/components/ChipSelect';
import DonationList from '@/src/components/DonationList';
import EligibilityBadge from '@/src/components/EligibilityBadge';
import LoadingSpinner from '@/src/components/LoadingSpinner';
import PageContainer from '@/src/components/PageContainer';

const ROLES: UserRole[] = ['donor', 'volunteer', 'admin'];

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
      showMessage('Error', 'Failed to load donor details');
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, [id]));

  if (notFound) {
    return (
      <PageContainer>
        <BackButton />
        <Text style={styles.empty}>Donor not found.</Text>
      </PageContainer>
    );
  }
  if (!donor || !me) return <LoadingSpinner />;

  const canManage = coversDistrict(me, donor.district);
  const isAdmin = me.role === 'admin';

  const update = async (patch: Partial<UserProfile>, message?: string) => {
    try {
      await updateDoc(doc(firestore, 'users', donor.id), { ...patch, updatedAt: new Date() });
      setDonor({ ...donor, ...patch });
      if (message) showMessage('Saved', message);
    } catch (error) {
      console.error('Error updating donor:', error);
      showMessage('Error', 'Failed to update donor');
    }
  };

  const toggleActive = async () => {
    const deactivating = donor.status !== 'inactive';
    const ok = await confirmAction(
      deactivating ? 'Deactivate donor?' : 'Reactivate donor?',
      deactivating
        ? `${donor.name} will be hidden from eligible donor searches.`
        : `${donor.name} will show up in donor searches again.`,
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
      showMessage('Error', 'Failed to delete donation');
    }
  };

  const phone = donor.phoneNumber?.replace(/\D/g, '').slice(-10);

  return (
    <PageContainer>
      <BackButton />
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.bloodTypeContainer}>
            <Text style={styles.bloodType}>{donor.bloodType}</Text>
          </View>
          <Text style={styles.name}>{donor.name}</Text>
          <Text style={styles.meta}>
            {[donor.area, donor.district].filter(Boolean).join(', ') || 'No district set'}
          </Text>
          <View style={styles.tags}>
            <Tag text={(donor.role ?? 'donor').toUpperCase()} color="#1565c0" />
            <Tag text={donor.verified ? 'VERIFIED' : 'UNVERIFIED'} color={donor.verified ? COLORS.success : '#999'} />
            {!donor.isDonor && <Tag text="UNAVAILABLE" color={COLORS.warning} />}
            {donor.status === 'inactive' && <Tag text="INACTIVE" color="#333" />}
            {donor.hasAccount === false && <Tag text="NO APP" color="#6a1b9a" />}
          </View>
        </View>

        <EligibilityBadge lastDonation={donor.lastDonation} variant="card" />

        {phone && (
          <View style={styles.contactRow}>
            <ActionButton icon="phone" label="Call" onPress={() => Linking.openURL(`tel:${phone}`)} />
            <ActionButton
              icon="whatsapp"
              label="WhatsApp"
              color="#25D366"
              onPress={() => Linking.openURL(`https://wa.me/91${phone}`)}
            />
          </View>
        )}

        <View style={styles.card}>
          <Info label="Phone" value={donor.phoneNumber} />
          {donor.email && <Info label="Email" value={donor.email} />}
          <Info label="Address" value={donor.address} />
          <Info label="Medical conditions" value={donor.medicalConditions} />
          <Info label="Total donations" value={String(donor.donationCount ?? donations.length)} />
          {donor.notes && <Info label="Volunteer notes" value={donor.notes} />}
          <Info label="Added on" value={formatDate(donor.createdAt)} />
        </View>

        {canManage && (
          <View style={styles.actions}>
            <ActionButton
              icon="water-plus"
              label="Log donation"
              onPress={() => router.push({
                pathname: '/donation/new',
                params: { donorId: donor.id, ...(requestId && { requestId }) },
              })}
            />
            <ActionButton
              icon="pencil"
              label="Edit"
              onPress={() => router.push({ pathname: '/donor/edit', params: { id: donor.id } })}
            />
            <ActionButton
              icon={donor.verified ? 'shield-off' : 'shield-check'}
              label={donor.verified ? 'Unverify' : 'Verify'}
              color={COLORS.success}
              onPress={() => update({ verified: !donor.verified })}
            />
            <ActionButton
              icon={donor.status === 'inactive' ? 'account-check' : 'account-off'}
              label={donor.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
              color="#333"
              onPress={toggleActive}
            />
          </View>
        )}

        {isAdmin && donor.id !== me.id && donor.hasAccount !== false && (
          <RoleEditor donor={donor} onSave={update} />
        )}

        <Text style={styles.sectionTitle}>Donation history</Text>
        <DonationList donations={donations} onDelete={canManage ? handleDeleteDonation : undefined} />
      </ScrollView>
    </PageContainer>
  );
}

function RoleEditor({ donor, onSave }: {
  donor: UserProfile;
  onSave: (patch: Partial<UserProfile>, message?: string) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(donor.role ?? 'donor');
  const [districts, setDistricts] = useState<string[]>(donor.volunteerDistricts ?? []);

  const toggleDistrict = (district: string) => {
    setDistricts(prev => prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Access (admin only)</Text>
      <ChipSelect options={ROLES} value={role} onChange={value => setRole(value as UserRole)} />
      {role === 'volunteer' && (
        <>
          <Text style={styles.meta}>Districts this volunteer manages (none selected = all of Kerala)</Text>
          <View style={styles.districtGrid}>
            {KERALA_DISTRICTS.map(district => {
              const selected = districts.includes(district);
              return (
                <TouchableOpacity
                  key={district}
                  style={[styles.districtChip, selected && styles.districtChipSelected]}
                  onPress={() => toggleDistrict(district)}
                >
                  <Text style={[styles.districtText, selected && styles.districtTextSelected]}>{district}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => onSave(
          { role, volunteerDistricts: role === 'volunteer' ? districts : [] },
          `${donor.name} is now ${role === 'admin' ? 'an admin' : `a ${role}`}.`,
        )}
      >
        <Text style={styles.saveButtonText}>Save access</Text>
      </TouchableOpacity>
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress, color = COLORS.primary }: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={18} color="white" />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 80 : 100,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  header: {
    alignItems: 'center',
  },
  bloodTypeContainer: {
    backgroundColor: COLORS.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloodType: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  meta: {
    color: COLORS.muted,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  info: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  infoValue: {
    fontSize: 16,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  districtChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  districtChipSelected: {
    backgroundColor: '#1565c0',
  },
  districtText: {
    color: '#1565c0',
  },
  districtTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#1565c0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  empty: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 120,
  },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl, Platform, Switch,
} from 'react-native';
import { collection, getDocs, query, where, QueryConstraint } from 'firebase/firestore';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../config/firebase';
import { useCurrentUser } from '../context/UserContext';
import { BLOOD_TYPES, BloodType, COLORS, COMPATIBLE_DONORS, KERALA_DISTRICTS } from '../constants';
import { UserProfile } from '../types';
import { isVolunteer, mapUser } from '../utils/data';
import { getEligibility } from '../utils/eligibility';
import ChipSelect from '../components/ChipSelect';
import EligibilityBadge from '../components/EligibilityBadge';
import LoadingSpinner from '../components/LoadingSpinner';

type EligibilityFilter = 'all' | 'eligible' | 'cooling';

export default function ManageDonorsScreen() {
  const { profile } = useCurrentUser();
  const params = useLocalSearchParams<{ bloodType?: string; district?: string; requestId?: string }>();

  // Volunteers limited to some districts must always query one of them.
  const allowedDistricts = profile?.role !== 'admin' && profile?.volunteerDistricts?.length
    ? profile.volunteerDistricts
    : null;
  const defaultDistrict = params.district && (!allowedDistricts || allowedDistricts.includes(params.district))
    ? params.district
    : allowedDistricts?.[0] ?? null;

  const [district, setDistrict] = useState<string | null>(defaultDistrict);
  const [bloodType, setBloodType] = useState<string | null>(params.bloodType ?? null);
  const [includeCompatible, setIncludeCompatible] = useState(!!params.requestId);
  const [eligibility, setEligibility] = useState<EligibilityFilter>(params.requestId ? 'eligible' : 'all');
  const [search, setSearch] = useState('');
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // The tab stays mounted, so re-apply filters when opened again from a request.
  useEffect(() => {
    if (!params.requestId) return;
    setDistrict(defaultDistrict);
    setBloodType(params.bloodType ?? null);
    setIncludeCompatible(true);
    setEligibility('eligible');
  }, [params.requestId]);

  const districtAllowed = !allowedDistricts || (!!district && allowedDistricts.includes(district));
  useEffect(() => {
    if (!districtAllowed) setDistrict(allowedDistricts![0]);
  }, [districtAllowed]);

  const fetchDonors = async () => {
    if (!isVolunteer(profile) || !districtAllowed) return;
    try {
      const constraints: QueryConstraint[] = [];
      if (district) constraints.push(where('district', '==', district));
      if (bloodType) {
        constraints.push(includeCompatible
          ? where('bloodType', 'in', COMPATIBLE_DONORS[bloodType as BloodType])
          : where('bloodType', '==', bloodType));
      }
      const snap = await getDocs(query(collection(firestore, 'users'), ...constraints));
      setDonors(snap.docs.map(mapUser));
    } catch (error) {
      console.error('Error fetching donors:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchDonors();
  }, [profile?.role, districtAllowed, district, bloodType, includeCompatible]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDonors();
    setRefreshing(false);
  };

  const visibleDonors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return donors
      .map(donor => ({ donor, eligible: getEligibility(donor.lastDonation).eligible }))
      .filter(({ donor, eligible }) => {
        if (eligibility === 'eligible' && (!eligible || !donor.isDonor || donor.status === 'inactive')) return false;
        if (eligibility === 'cooling' && eligible) return false;
        if (!term) return true;
        return donor.name?.toLowerCase().includes(term)
          || donor.phoneNumber?.includes(term)
          || donor.area?.toLowerCase().includes(term);
      })
      // Donors who can give right now first, then alphabetical.
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.donor.name.localeCompare(b.donor.name))
      .map(({ donor }) => donor);
  }, [donors, search, eligibility]);

  if (!profile) return <LoadingSpinner />;

  if (!isVolunteer(profile)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>This section is only for volunteers.</Text>
      </View>
    );
  }

  const openDonor = (donor: UserProfile) => {
    router.push({
      pathname: '/donor/[id]',
      params: { id: donor.id, ...(params.requestId && { requestId: params.requestId }) },
    });
  };

  const renderDonor = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDonor(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.bloodTypeContainer}>
          <Text style={styles.bloodType}>{item.bloodType || '?'}</Text>
        </View>
        <View style={styles.cardTitle}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {[item.area, item.district].filter(Boolean).join(', ') || 'No district set'}
          </Text>
        </View>
        <EligibilityBadge lastDonation={item.lastDonation} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>{item.phoneNumber}</Text>
        <View style={styles.flags}>
          {item.role && item.role !== 'donor' && <Flag text={item.role.toUpperCase()} color="#1565c0" />}
          {!item.verified && <Flag text="UNVERIFIED" color="#999" />}
          {!item.isDonor && <Flag text="UNAVAILABLE" color={COLORS.warning} />}
          {item.status === 'inactive' && <Flag text="INACTIVE" color="#333" />}
          {item.hasAccount === false && <Flag text="NO APP" color="#6a1b9a" />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Donors</Text>
          <Text style={styles.subtitle}>
            {allowedDistricts ? `Managing ${allowedDistricts.join(', ')}` : 'Managing all of Kerala'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilters(!showFilters)}>
            <MaterialCommunityIcons name="filter-variant" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/donor/edit')}>
            <MaterialCommunityIcons name="account-plus" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={visibleDonors}
        keyExtractor={item => item.id}
        renderItem={renderDonor}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {params.requestId && (
              <View style={styles.banner}>
                <MaterialCommunityIcons name="information" size={20} color="#1565c0" />
                <Text style={styles.bannerText}>
                  Finding donors for a {params.bloodType} request. Open a donor to log their donation against it.
                </Text>
                <TouchableOpacity onPress={() => router.setParams({ requestId: '', bloodType: '', district: '' })}>
                  <MaterialCommunityIcons name="close" size={20} color="#1565c0" />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={styles.search}
              placeholder="Search name, phone or area"
              value={search}
              onChangeText={setSearch}
            />
            {showFilters && (
              <View style={styles.filters}>
                <ChipSelect
                  label="District"
                  options={allowedDistricts ?? KERALA_DISTRICTS}
                  value={district}
                  onChange={setDistrict}
                  allLabel={allowedDistricts ? undefined : 'All Kerala'}
                  onClear={() => setDistrict(null)}
                />
                <ChipSelect
                  label="Blood type"
                  options={BLOOD_TYPES}
                  value={bloodType}
                  onChange={setBloodType}
                  allLabel="Any"
                  onClear={() => setBloodType(null)}
                />
                {bloodType && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      Include compatible donors ({COMPATIBLE_DONORS[bloodType as BloodType].join(', ')})
                    </Text>
                    <Switch
                      value={includeCompatible}
                      onValueChange={setIncludeCompatible}
                      trackColor={{ true: COLORS.primary }}
                    />
                  </View>
                )}
                <ChipSelect
                  label="Eligibility"
                  options={['all', 'eligible', 'cooling']}
                  value={eligibility}
                  onChange={value => setEligibility(value as EligibilityFilter)}
                />
              </View>
            )}
            <Text style={styles.count}>
              {loading ? 'Loading…' : `${visibleDonors.length} of ${donors.length} donors`}
            </Text>
          </View>
        }
        ListEmptyComponent={loading ? null : <Text style={styles.emptyText}>No donors match these filters.</Text>}
      />
    </View>
  );
}

function Flag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.flag, { borderColor: color }]}>
      <Text style={[styles.flagText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: Platform.OS === 'ios' ? 60 : 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    color: '#1565c0',
  },
  search: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  filters: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  switchLabel: {
    flex: 1,
    color: COLORS.muted,
  },
  count: {
    color: COLORS.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
  },
  bloodTypeContainer: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodType: {
    color: 'white',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    color: COLORS.muted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 24,
  },
});

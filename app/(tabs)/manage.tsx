import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Switch, TextInput, View,
} from 'react-native';
import { collection, getDocs, query, where, QueryConstraint } from 'firebase/firestore';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BLOOD_TYPES, BloodType, COMPATIBLE_DONORS, KERALA_DISTRICTS, withFirst } from '@/shared/constants';
import { UserProfile } from '@/shared/types';
import { isVolunteer, mapUser } from '@/src/utils/data';
import { getEligibility } from '@/shared/eligibility';
import { fonts, palette, radius, space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import EligibilityBadge from '@/src/components/EligibilityBadge';
import BloodMark from '@/src/components/ui/BloodMark';
import EmptyState from '@/src/components/ui/EmptyState';
import { ListRow } from '@/src/components/ui/List';
import Pill from '@/src/components/ui/Pill';
import Screen, { HeaderButton } from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';
import { StringKey, useI18n } from '@/src/i18n';

type EligibilityFilter = 'all' | 'eligible' | 'cooling';

const ELIGIBILITY_LABELS: Record<EligibilityFilter, StringKey> = {
  all: 'manage.all',
  eligible: 'eligibility.canDonate',
  cooling: 'manage.coolingOff',
};

export default function ManageDonorsScreen() {
  const { profile } = useCurrentUser();
  const { t, districtName } = useI18n();
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

  if (!profile) {
    return (
      <Screen title={t('manage.title')}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  if (!isVolunteer(profile)) {
    return (
      <Screen title={t('manage.title')}>
        <EmptyState
          icon="account-lock-outline"
          title={t('manage.volunteersOnly.title')}
          message={t('manage.volunteersOnly.message')}
        />
      </Screen>
    );
  }

  const openDonor = (donor: UserProfile) => {
    router.push({
      pathname: '/donor/[id]',
      params: { id: donor.id, ...(params.requestId && { requestId: params.requestId }) },
    });
  };

  const renderDonor = ({ item, index }: { item: UserProfile; index: number }) => {
    const eligible = getEligibility(item.lastDonation).eligible;
    const active = eligible && item.isDonor && item.status !== 'inactive';
    const place = [item.area, districtName(item.district)].filter(Boolean).join(', ') || t('manage.noDistrictSet');

    return (
      <View style={[
        styles.item,
        index === 0 && styles.first,
        index === visibleDonors.length - 1 && styles.last,
        index > 0 && styles.divider,
      ]}>
        <ListRow
          leading={<BloodMark bloodType={item.bloodType} muted={!active} />}
          title={item.name}
          subtitle={`${place}\n${item.phoneNumber || t('common.noPhone')}`}
          trailing={
            <View style={styles.meta}>
              <EligibilityBadge lastDonation={item.lastDonation} />
              {item.role === 'volunteer' && <Pill label={t('role.volunteer')} tone="info" />}
              {item.role === 'admin' && <Pill label={t('role.admin')} tone="info" />}
              {!item.verified && <Pill label={t('manage.pill.unverified')} tone="muted" />}
              {!item.isDonor && <Pill label={t('manage.pill.unavailable')} tone="turmeric" />}
              {item.status === 'inactive' && <Pill label={t('manage.pill.inactive')} tone="muted" />}
              {item.hasAccount === false && <Pill label={t('manage.pill.noApp')} tone="kasavu" />}
            </View>
          }
          chevron={false}
          onPress={() => openDonor(item)}
        />
      </View>
    );
  };

  return (
    <Screen
      title={t('manage.title')}
      subtitle={allowedDistricts
        ? t('manage.managing', { districts: allowedDistricts.map(d => districtName(d)).join(', ') })
        : t('manage.managingAll')}
      right={
        <>
          <HeaderButton
            icon={showFilters ? 'filter-variant-remove' : 'filter-variant'}
            label={showFilters ? t('manage.hideFilters') : t('manage.showFilters')}
            onPress={() => setShowFilters(!showFilters)}
          />
          <HeaderButton icon="account-plus" label={t('manage.addDonor')} onPress={() => router.push('/donor/edit')} />
        </>
      }
      scroll={false}
      contentStyle={styles.noGap}
    >
      <FlatList
        data={visibleDonors}
        keyExtractor={item => item.id}
        renderItem={renderDonor}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.blood]} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            {!!params.requestId && (
              <View style={styles.banner}>
                <MaterialCommunityIcons name="information-outline" size={22} color={palette.info} />
                <Text variant="body" color={palette.info} style={styles.flex}>
                  {t('manage.requestBanner', { bloodType: params.bloodType ?? '' })}
                </Text>
                <Pressable
                  onPress={() => router.setParams({ requestId: '', bloodType: '', district: '' })}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('manage.stopFinding')}
                >
                  <MaterialCommunityIcons name="close" size={22} color={palette.info} />
                </Pressable>
              </View>
            )}

            <View style={styles.search}>
              <MaterialCommunityIcons name="magnify" size={22} color={palette.inkFaint} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('manage.searchPlaceholder')}
                placeholderTextColor={palette.inkFaint}
                selectionColor={palette.blood}
                value={search}
                onChangeText={setSearch}
                accessibilityLabel={t('manage.searchLabel')}
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('manage.clearSearch')}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={palette.inkFaint} />
                </Pressable>
              )}
            </View>

            {showFilters && (
              <View>
                <ChipSelect
                  horizontal
                  label={t('manage.district')}
                  options={withFirst(allowedDistricts ?? KERALA_DISTRICTS, defaultDistrict ?? profile?.district)}
                  format={d => districtName(d)}
                  value={district}
                  onChange={setDistrict}
                  allLabel={allowedDistricts ? undefined : t('manage.allKerala')}
                  onClear={() => setDistrict(null)}
                />
                <ChipSelect
                  horizontal
                  label={t('manage.bloodType')}
                  options={BLOOD_TYPES}
                  value={bloodType}
                  onChange={setBloodType}
                  allLabel={t('manage.all')}
                  onClear={() => setBloodType(null)}
                />
                {bloodType && (
                  <View style={styles.switchRow}>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{t('manage.includeCompatible')}</Text>
                      <Text variant="caption" color={palette.inkMuted}>
                        {t('manage.canGiveTo', { groups: COMPATIBLE_DONORS[bloodType as BloodType].join(', '), bloodType })}
                      </Text>
                    </View>
                    <Switch
                      value={includeCompatible}
                      onValueChange={setIncludeCompatible}
                      trackColor={{ false: palette.line, true: palette.leaf }}
                      thumbColor="#fff"
                    />
                  </View>
                )}
                <ChipSelect
                  horizontal
                  label={t('manage.eligibility')}
                  options={['all', 'eligible', 'cooling']}
                  value={eligibility}
                  onChange={value => setEligibility(value as EligibilityFilter)}
                  format={value => t(ELIGIBILITY_LABELS[value as EligibilityFilter])}
                />
              </View>
            )}

            <Text variant="caption" color={palette.inkMuted} style={styles.count}>
              {loading ? t('manage.loading') : t('manage.showing', { shown: visibleDonors.length, total: donors.length })}
            </Text>
          </View>
        }
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={palette.blood} style={styles.loading} />
        ) : (
          <EmptyState
            icon="account-search-outline"
            title={t('manage.empty.title')}
            message={t('manage.empty.message')}
            action={{ label: t('manage.addDonor'), onPress: () => router.push('/donor/edit') }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  noGap: {
    gap: 0,
    paddingTop: 0,
  },
  header: {
    paddingTop: space.lg,
  },
  list: {
    paddingBottom: space.xxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.infoTint,
    marginBottom: space.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
    paddingHorizontal: space.md,
    marginBottom: space.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: space.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: palette.ink,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: space.lg,
  },
  count: {
    marginBottom: space.sm,
  },
  meta: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  // Rows share one rounded surface, like List, but stay virtualised.
  item: {
    backgroundColor: palette.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: palette.line,
  },
  first: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
  },
  last: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  loading: {
    paddingVertical: space.xl,
  },
});

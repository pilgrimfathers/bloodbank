import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Switch, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BLOOD_TYPES, BloodType, COMPATIBLE_DONORS, KERALA_DISTRICTS, withFirst } from '@/shared/constants';
import {
  AskDonorBody, AskDonorResult, DAILY_ASK_LIMIT, DONOR_ENDPOINTS, DonorSearchBody, DonorSearchResult, PublicDonor,
} from '@/shared/donors';
import { BloodRequest } from '@/shared/types';
import { mapRequest } from '@/src/utils/data';
import { callNotifyApi } from '@/src/utils/push';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { useI18n } from '@/src/i18n';
import { palette, radius, space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import BloodMark from '@/src/components/ui/BloodMark';
import Button from '@/src/components/ui/Button';
import EmptyState from '@/src/components/ui/EmptyState';
import Pill from '@/src/components/ui/Pill';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';

// Donors who made their profile public. Anyone signed in can look; asking a
// donor sends them one of your open requests.
export default function FindDonorsScreen() {
  const params = useLocalSearchParams<{ requestId?: string; bloodType?: string; district?: string }>();
  const { profile } = useCurrentUser();
  const { t, districtName } = useI18n();

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [requestId, setRequestId] = useState<string | null>(params.requestId || null);
  const [bloodType, setBloodType] = useState<string | null>(params.bloodType || null);
  const [district, setDistrict] = useState<string | null>(params.district || null);
  const [includeCompatible, setIncludeCompatible] = useState(true);
  const [donors, setDonors] = useState<PublicDonor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const request = requests.find(r => r.id === requestId) ?? null;
  // Pre-select the newest request once, unless the caller passed filters in.
  const defaulted = useRef(!!(params.requestId || params.bloodType));

  // The caller's own open requests, to ask donors on behalf of.
  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    getDocs(query(
      collection(firestore, 'bloodRequests'),
      where('requesterId', '==', profile.id),
      where('status', '==', 'open'),
    ))
      .then(snap => {
        const mine = snap.docs.map(mapRequest).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setRequests(mine);
        if (!defaulted.current && mine[0]) selectRequest(mine[0]);
        defaulted.current = true;
      })
      .catch(error => console.error('Error loading your requests:', error));
  }, [profile?.id]));

  const selectRequest = (next: BloodRequest) => {
    setRequestId(next.id);
    setBloodType(next.bloodType);
    setDistrict(next.district ?? null);
  };

  const search = async () => {
    if (!bloodType) return;
    setLoading(true);
    try {
      const body: DonorSearchBody = { bloodType, district: district ?? undefined, includeCompatible };
      const result = await callNotifyApi<DonorSearchResult>(DONOR_ENDPOINTS.search, body);
      setDonors(result.donors);
    } catch (error) {
      console.error('Error searching donors:', error);
      showMessage(t('findDonors.couldNotLoad'), error instanceof Error ? error.message : t('common.checkConnection'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, [bloodType, district, includeCompatible]);

  const onRefresh = async () => {
    setRefreshing(true);
    await search();
    setRefreshing(false);
  };

  const ask = async (donor: PublicDonor) => {
    if (!request) {
      const ok = await confirmAction(
        t('findDonors.postFirst.title'),
        t('findDonors.postFirst.message'),
        t('requestNew.title'),
      );
      if (ok) router.push('/request/new');
      return;
    }
    const ok = await confirmAction(
      t('findDonors.askConfirm.title', { name: donor.name }),
      t('findDonors.askConfirm.message', {
        name: donor.name,
        patient: request.patientName,
        bloodType: request.bloodType,
        hospital: request.hospital,
        phone: request.contactNumber,
      }),
      t('findDonors.askConfirm.send'),
    );
    if (!ok) return;

    setAsking(donor.id);
    try {
      const body: AskDonorBody = { donorId: donor.id, requestId: request.id };
      const result = await callNotifyApi<AskDonorResult>(DONOR_ENDPOINTS.ask, body);
      if (result.skipped === 'no-device') {
        showMessage(t('findDonors.noDevice.title'), t('findDonors.noDevice.message', { name: donor.name }));
        return;
      }
      setAsked(prev => new Set(prev).add(`${request.id}_${donor.id}`));
      showMessage(
        result.skipped === 'already-asked' ? t('findDonors.alreadyAsked.title') : t('findDonors.sent.title'),
        result.skipped === 'already-asked'
          ? t('findDonors.alreadyAsked.message', { name: donor.name })
          : t('findDonors.sent.message', { name: donor.name, limit: DAILY_ASK_LIMIT }),
      );
    } catch (error) {
      showMessage(t('findDonors.couldNotSend'), error instanceof Error ? error.message : t('common.checkConnection'));
    } finally {
      setAsking(null);
    }
  };

  const compatible = bloodType ? COMPATIBLE_DONORS[bloodType as BloodType] : [];

  return (
    <Screen
      back
      title={t('findDonors.title')}
      subtitle={t('findDonors.subtitle')}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {requests.length > 0 && (
        <ChipSelect
          horizontal
          label={t('findDonors.askingFor')}
          options={requests.map(r => r.id)}
          value={requestId}
          onChange={id => selectRequest(requests.find(r => r.id === id)!)}
          format={id => {
            const r = requests.find(item => item.id === id)!;
            return t('findDonors.requestOption', { bloodType: r.bloodType, patient: r.patientName });
          }}
        />
      )}

      <View>
        <ChipSelect
          horizontal
          label={t('findDonors.bloodGroup')}
          options={BLOOD_TYPES}
          value={bloodType}
          onChange={setBloodType}
        />
        <ChipSelect
          horizontal
          label={t('findDonors.district')}
          options={withFirst(KERALA_DISTRICTS, district ?? profile?.district)}
          value={district}
          onChange={setDistrict}
          format={districtName}
          allLabel={t('findDonors.allKerala')}
          onClear={() => setDistrict(null)}
        />
        {bloodType && compatible.length > 1 && (
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{t('findDonors.includeCompatible')}</Text>
              <Text variant="caption" color={palette.inkMuted}>
                {t('findDonors.canGiveTo', { groups: compatible.join(', '), bloodType })}
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
      </View>

      {!bloodType ? (
        <EmptyState
          icon="water-outline"
          title={t('findDonors.chooseGroup.title')}
          message={t('findDonors.chooseGroup.message')}
        />
      ) : loading && !refreshing ? (
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      ) : donors.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title={t('findDonors.empty.title')}
          message={request ? t('findDonors.empty.withRequest') : t('findDonors.empty.noRequest')}
          action={request ? undefined : { label: t('requestNew.title'), onPress: () => router.push('/request/new') }}
        />
      ) : (
        <View style={styles.list}>
          <Text variant="caption" color={palette.inkMuted}>
            {donors.length === 1 ? t('findDonors.oneDonor') : t('findDonors.donors', { count: donors.length })}
          </Text>
          {donors.map(donor => (
            <DonorRow
              key={donor.id}
              donor={donor}
              asking={asking === donor.id}
              asked={!!request && asked.has(`${request.id}_${donor.id}`)}
              onAsk={() => ask(donor)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function DonorRow({ donor, asking, asked, onAsk }: {
  donor: PublicDonor;
  asking: boolean;
  asked: boolean;
  onAsk: () => void;
}) {
  const { t, districtName } = useI18n();
  const place = [donor.area, districtName(donor.district)].filter(Boolean).join(', ') || t('common.kerala');
  const phone = donor.phoneNumber?.replace(/\D/g, '').slice(-10);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <BloodMark bloodType={donor.bloodType} muted={!donor.eligible} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{donor.name}</Text>
          <Text variant="caption" color={palette.inkMuted}>{place}</Text>
          <View style={styles.pills}>
            {donor.eligible
              ? <Pill label={t('eligibility.canDonate')} tone="leaf" />
              : <Pill label={t('eligibility.daysLeft', { count: donor.daysRemaining })} tone="turmeric" />}
            {donor.verified && <Pill label={t('findDonors.verified')} tone="kasavu" />}
          </View>
        </View>
      </View>

      {donor.eligible && (
        <View style={styles.actions}>
          {phone ? (
            <>
              <Button icon="phone" label={t('common.call')} onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.flex} />
              <Button
                icon="whatsapp"
                label={t('common.whatsapp')}
                variant="secondary"
                color={palette.leaf}
                onPress={() => Linking.openURL(`https://wa.me/91${phone}`)}
                style={styles.flex}
              />
            </>
          ) : (
            <Button
              icon={asked ? 'check' : 'bell-ring-outline'}
              label={asked ? t('findDonors.asked') : t('findDonors.ask')}
              variant={asked ? 'secondary' : 'primary'}
              loading={asking}
              disabled={asked}
              onPress={onAsk}
              style={styles.flex}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    paddingVertical: space.xl,
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
  },
  list: {
    gap: space.md,
  },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
});

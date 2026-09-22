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
      showMessage('Could not load donors', error instanceof Error ? error.message : 'Check your connection and try again.');
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
        'Post a request first',
        'Donors get your request with the hospital and contact number, so they can call you. Post one, then come back to ask donors.',
        'Request blood',
      );
      if (ok) router.push('/request/new');
      return;
    }
    const ok = await confirmAction(
      `Ask ${donor.name}?`,
      `${donor.name} will get a notification about ${request.patientName}'s ${request.bloodType} request at ${request.hospital}, and can call ${request.contactNumber} if they can help.`,
      'Send',
    );
    if (!ok) return;

    setAsking(donor.id);
    try {
      const body: AskDonorBody = { donorId: donor.id, requestId: request.id };
      const result = await callNotifyApi<AskDonorResult>(DONOR_ENDPOINTS.ask, body);
      if (result.skipped === 'no-device') {
        showMessage('Could not reach this donor', `${donor.name} has notifications turned off. Try another donor or ask a volunteer.`);
        return;
      }
      setAsked(prev => new Set(prev).add(`${request.id}_${donor.id}`));
      showMessage(
        result.skipped === 'already-asked' ? 'Already asked' : 'Request sent',
        result.skipped === 'already-asked'
          ? `You already sent this request to ${donor.name}.`
          : `${donor.name} will see your request. Keep your phone close. You can ask up to ${DAILY_ASK_LIMIT} donors a day.`,
      );
    } catch (error) {
      showMessage('Could not send', error instanceof Error ? error.message : 'Check your connection and try again.');
    } finally {
      setAsking(null);
    }
  };

  const compatible = bloodType ? COMPATIBLE_DONORS[bloodType as BloodType] : [];

  return (
    <Screen
      back
      title="Find donors"
      subtitle="Donors who chose to be listed publicly"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {requests.length > 0 && (
        <ChipSelect
          horizontal
          label="Asking for"
          options={requests.map(r => r.id)}
          value={requestId}
          onChange={id => selectRequest(requests.find(r => r.id === id)!)}
          format={id => {
            const r = requests.find(item => item.id === id)!;
            return `${r.bloodType} for ${r.patientName}`;
          }}
        />
      )}

      <View>
        <ChipSelect horizontal label="Blood group needed" options={BLOOD_TYPES} value={bloodType} onChange={setBloodType} />
        <ChipSelect
          horizontal
          label="District"
          options={withFirst(KERALA_DISTRICTS, district ?? profile?.district)}
          value={district}
          onChange={setDistrict}
          allLabel="All Kerala"
          onClear={() => setDistrict(null)}
        />
        {bloodType && compatible.length > 1 && (
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Include compatible donors</Text>
              <Text variant="caption" color={palette.inkMuted}>
                {compatible.join(', ')} can give to {bloodType}
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
        <EmptyState icon="water-outline" title="Choose a blood group" message="Pick the blood group the patient needs." />
      ) : loading && !refreshing ? (
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      ) : donors.length === 0 ? (
        <EmptyState
          icon="account-search-outline"
          title="No public donors found"
          message={request
            ? 'Try all of Kerala. Volunteers can also reach donors who keep their profile private.'
            : 'Try all of Kerala, or post a request so volunteers can reach donors who keep their profile private.'}
          action={request ? undefined : { label: 'Request blood', onPress: () => router.push('/request/new') }}
        />
      ) : (
        <View style={styles.list}>
          <Text variant="caption" color={palette.inkMuted}>
            {donors.length === 1 ? '1 donor' : `${donors.length} donors`}
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
  const place = [donor.area, donor.district].filter(Boolean).join(', ') || 'Kerala';
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
              ? <Pill label="Can donate" tone="leaf" />
              : <Pill label={`${donor.daysRemaining} days left`} tone="turmeric" />}
            {donor.verified && <Pill label="Verified" tone="kasavu" />}
          </View>
        </View>
      </View>

      {donor.eligible && (
        <View style={styles.actions}>
          {phone ? (
            <>
              <Button icon="phone" label="Call" onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.flex} />
              <Button
                icon="whatsapp"
                label="WhatsApp"
                variant="secondary"
                color={palette.leaf}
                onPress={() => Linking.openURL(`https://wa.me/91${phone}`)}
                style={styles.flex}
              />
            </>
          ) : (
            <Button
              icon={asked ? 'check' : 'bell-ring-outline'}
              label={asked ? 'Asked' : 'Ask to donate'}
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

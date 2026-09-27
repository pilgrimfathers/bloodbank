import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Switch, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BloodRequest, Donation } from '@/shared/types';
import { coversDistrict, isVolunteer, mapDonation, mapRequest } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { StringKey, useI18n } from '@/src/i18n';
import { palette, radius, space } from '@/src/theme';
import DonationList from '@/src/components/DonationList';
import BloodMark from '@/src/components/ui/BloodMark';
import Button from '@/src/components/ui/Button';
import EmptyState from '@/src/components/ui/EmptyState';
import { List, ListRow } from '@/src/components/ui/List';
import Pill, { Tone } from '@/src/components/ui/Pill';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';
import { callNotifyApi } from '@/src/utils/push';
import { NOTIFY_ENDPOINTS, NotifyResult, RequestDonorsBody } from '@/shared/notifications';

const URGENCY: Record<BloodRequest['urgency'], { label: StringKey; tone: Tone }> = {
  high: { label: 'urgency.high', tone: 'blood' },
  medium: { label: 'urgency.medium', tone: 'turmeric' },
  low: { label: 'urgency.low', tone: 'muted' },
};

const STATUS: Record<BloodRequest['status'], { label: StringKey; tone: Tone }> = {
  open: { label: 'status.open', tone: 'info' },
  fulfilled: { label: 'status.fulfilled', tone: 'leaf' },
  closed: { label: 'status.closed', tone: 'muted' },
};

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useCurrentUser();
  const { t, formatDate, timeAgo, districtName } = useI18n();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchRequest = async () => {
    try {
      const snap = await getDoc(doc(firestore, 'bloodRequests', id));
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      setRequest(mapRequest(snap));

      if (isVolunteer(profile)) {
        const donationSnap = await getDocs(query(collection(firestore, 'donations'), where('requestId', '==', id)));
        setDonations(donationSnap.docs.map(mapDonation));
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      showMessage(t('requestDetail.couldNotLoad'), t('requestDetail.pullToRetry'));
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequest();
  }, [id, profile?.role]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequest();
    setRefreshing(false);
  };

  const updateStatus = async (status: 'fulfilled' | 'closed') => {
    const ok = await confirmAction(
      status === 'fulfilled' ? t('requestDetail.fulfilled.title') : t('requestDetail.closeRequest.title'),
      status === 'fulfilled'
        ? t('requestDetail.fulfilled.message')
        : t('requestDetail.closeRequest.message'),
      status === 'fulfilled' ? t('requestDetail.markFulfilled') : t('requestDetail.closeRequest.confirm'),
    );
    if (!ok) return;

    setUpdating(true);
    try {
      await updateDoc(doc(firestore, 'bloodRequests', id), {
        status,
        updatedAt: new Date(),
        // Donors are credited through donation records, not on the request itself.
        ...(status === 'fulfilled' && { fulfilledAt: new Date() }),
      });
      router.back();
    } catch (error) {
      console.error('Error updating request:', error);
      showMessage(t('requestDetail.couldNotUpdate'), t('common.checkConnection'));
    } finally {
      setUpdating(false);
    }
  };

  if (notFound) {
    return (
      <Screen back title={t('requestDetail.title')}>
        <EmptyState icon="file-question-outline" title={t('requestDetail.notFound')} />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen back title={t('requestDetail.title')}>
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const isOwner = auth.currentUser?.uid === request.requesterId;
  const isManager = coversDistrict(profile, request.district);
  const canUpdate = (isOwner || isManager) && request.status === 'open';
  const phone = request.contactNumber?.replace(/\D/g, '').slice(-10);
  const place = [request.location, districtName(request.district)].filter(Boolean).join(', ');
  const unitsLabel = request.units === 1
    ? t('requestDetail.oneUnitOf', { bloodType: request.bloodType })
    : t('requestDetail.unitsOf', { units: request.units, bloodType: request.bloodType });

  return (
    <Screen
      back
      title={t('requestDetail.title')}
      subtitle={t('requestDetail.postedBy', { time: timeAgo(request.createdAt), name: request.requesterName })}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.summary}>
        <BloodMark bloodType={request.bloodType} size="lg" muted={request.status !== 'open'} />
        <View style={styles.summaryText}>
          <Text variant="title">{unitsLabel}</Text>
          <Text variant="body" color={palette.inkMuted}>{t('requestDetail.forPatient', { patient: request.patientName })}</Text>
          <View style={styles.pills}>
            <Pill label={t(STATUS[request.status].label)} tone={STATUS[request.status].tone} />
            {request.status === 'open' && (
              <Pill label={t(URGENCY[request.urgency].label)} tone={URGENCY[request.urgency].tone} />
            )}
          </View>
        </View>
      </View>

      {phone && request.status === 'open' && (
        <View style={styles.actions}>
          <Button
            icon="phone"
            label={t('common.call')}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={styles.flex}
          />
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
        <ListRow icon="hospital-building" title={request.hospital} subtitle={place || undefined} />
        <ListRow icon="phone-outline" title={request.contactNumber || t('requestDetail.noContact')} subtitle={t('requestDetail.contact')} />
        <ListRow icon="calendar-blank-outline" title={formatDate(request.createdAt)} subtitle={t('requestDetail.posted')} />
      </List>

      {isManager && request.status === 'open' && (
        <Button
          icon="account-search"
          label={t('requestDetail.findEligible')}
          color={palette.info}
          onPress={() => router.push({
            pathname: '/(tabs)/manage',
            params: { bloodType: request.bloodType, district: request.district ?? '', requestId: request.id },
          })}
        />
      )}

      {isOwner && !isManager && request.status === 'open' && (
        <Button
          icon="account-search"
          label={t('findDonors.title')}
          color={palette.info}
          onPress={() => router.push({
            pathname: '/find-donors',
            params: { requestId: request.id, bloodType: request.bloodType, district: request.district ?? '' },
          })}
        />
      )}

      {isManager && (
        <Section title={t('requestDetail.donationsLogged', { count: donations.length, units: request.units })}>
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${Math.min(100, (donations.length / Math.max(1, request.units)) * 100)}%` },
            ]} />
          </View>
          <DonationList donations={donations} />
        </Section>
      )}

      {profile?.role === 'admin' && request.status === 'open' && (
        <NotifyDonors request={request} onSent={fetchRequest} />
      )}

      {canUpdate && (
        <View style={styles.actions}>
          <Button
            icon="check-circle-outline"
            label={t('requestDetail.markFulfilled')}
            color={palette.leaf}
            loading={updating}
            onPress={() => updateStatus('fulfilled')}
            style={styles.flex}
          />
          <Button
            label={t('requestDetail.close')}
            variant="secondary"
            color={palette.inkMuted}
            disabled={updating}
            onPress={() => updateStatus('closed')}
            style={styles.flex}
          />
        </View>
      )}
    </Screen>
  );
}

// Admin-only: alert donors with the request's blood type through the notification API.
function NotifyDonors({ request, onSent }: { request: BloodRequest; onSent: () => void }) {
  const { t, timeAgo, districtName } = useI18n();
  const [includeCoolingOff, setIncludeCoolingOff] = useState(false);
  const [districtOnly, setDistrictOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const alreadySent = !!request.donorsNotifiedAt;

  const send = async () => {
    const ok = await confirmAction(
      alreadySent ? t('requestDetail.notify.titleAgain') : t('requestDetail.notify.title'),
      t('requestDetail.notify.message', { bloodType: request.bloodType }),
      alreadySent ? t('requestDetail.notify.sendAgain') : t('requestDetail.notify.send'),
    );
    if (!ok) return;

    setSending(true);
    try {
      const body: RequestDonorsBody = {
        requestId: request.id,
        includeCoolingOff,
        districtOnly: districtOnly && !!request.district,
        force: alreadySent,
      };
      const result = await callNotifyApi<NotifyResult>(NOTIFY_ENDPOINTS.requestDonors, body);
      if (result.skipped === 'no-recipients') {
        showMessage(t('requestDetail.notify.nobody.title'), t('requestDetail.notify.nobody.message', { bloodType: request.bloodType }));
      } else if (result.skipped === 'already-notified') {
        showMessage(t('requestDetail.notify.already.title'), t('requestDetail.notify.already.message'));
      } else {
        showMessage(
          t('requestDetail.notify.sent.title'),
          result.recipients === 1
            ? t('requestDetail.notify.sentToOne')
            : t('requestDetail.notify.sentToMany', { count: result.recipients }),
        );
      }
      onSent();
    } catch (error) {
      console.error('Error notifying donors:', error);
      showMessage(t('requestDetail.notify.couldNotSend'), error instanceof Error ? error.message : t('common.checkConnection'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Section title={t('requestDetail.notify.section')}>
      <View style={styles.notifyCard}>
        <Text variant="body" color={palette.inkMuted}>
          {alreadySent
            ? request.donorsNotifiedByName
              ? t('requestDetail.notify.summaryBy', {
                count: request.donorsNotifiedCount ?? 0,
                time: timeAgo(request.donorsNotifiedAt!),
                name: request.donorsNotifiedByName,
              })
              : t('requestDetail.notify.summary', {
                count: request.donorsNotifiedCount ?? 0,
                time: timeAgo(request.donorsNotifiedAt!),
              })
            : t('requestDetail.notify.notSent')}
        </Text>
        <View style={styles.switchRow}>
          <Text variant="body" style={styles.flex}>{t('requestDetail.notify.includeCoolingOff')}</Text>
          <Switch
            value={includeCoolingOff}
            onValueChange={setIncludeCoolingOff}
            trackColor={{ false: palette.line, true: palette.leaf }}
            thumbColor="#fff"
          />
        </View>
        {request.district && (
          <View style={styles.switchRow}>
            <Text variant="body" style={styles.flex}>
              {t('requestDetail.notify.districtOnly', { district: districtName(request.district) })}
            </Text>
            <Switch
              value={districtOnly}
              onValueChange={setDistrictOnly}
              trackColor={{ false: palette.line, true: palette.leaf }}
              thumbColor="#fff"
            />
          </View>
        )}
        <Button
          icon="bell-ring-outline"
          label={alreadySent ? t('requestDetail.notify.sendAgain') : t('requestDetail.notify.button', { bloodType: request.bloodType })}
          variant={alreadySent ? 'secondary' : 'primary'}
          loading={sending}
          onPress={send}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  notifyCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    padding: space.lg,
    gap: space.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  loading: {
    paddingVertical: space.xxl,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  summaryText: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.line,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.leaf,
  },
});

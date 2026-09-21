import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BloodRequest, Donation } from '@/src/types';
import { coversDistrict, isVolunteer, mapDonation, mapRequest } from '@/src/utils/data';
import { confirmAction, showMessage } from '@/src/utils/dialog';
import { formatDate, timeAgo } from '@/src/utils/format';
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

const URGENCY: Record<BloodRequest['urgency'], { label: string; tone: Tone }> = {
  high: { label: 'Urgent', tone: 'blood' },
  medium: { label: 'Needed soon', tone: 'turmeric' },
  low: { label: 'Planned', tone: 'muted' },
};

const STATUS: Record<BloodRequest['status'], { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  fulfilled: { label: 'Fulfilled', tone: 'leaf' },
  closed: { label: 'Closed', tone: 'muted' },
};

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useCurrentUser();
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
      showMessage('Could not load request', 'Check your connection and pull down to try again.');
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
      status === 'fulfilled' ? 'Mark as fulfilled?' : 'Close this request?',
      status === 'fulfilled'
        ? 'The patient has the blood they need. Donors will stop seeing this request.'
        : 'Donors will stop seeing this request. Use this if it is no longer needed.',
      status === 'fulfilled' ? 'Mark fulfilled' : 'Close request',
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
      showMessage('Could not update request', 'Check your connection and try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (notFound) {
    return (
      <Screen back title="Blood request">
        <EmptyState icon="file-question-outline" title="This request no longer exists" />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen back title="Blood request">
        <ActivityIndicator color={palette.blood} style={styles.loading} />
      </Screen>
    );
  }

  const isOwner = auth.currentUser?.uid === request.requesterId;
  const isManager = coversDistrict(profile, request.district);
  const canUpdate = (isOwner || isManager) && request.status === 'open';
  const phone = request.contactNumber?.replace(/\D/g, '').slice(-10);
  const place = [request.location, request.district].filter(Boolean).join(', ');
  const unitsLabel = `${request.units} ${request.units === 1 ? 'unit' : 'units'}`;

  return (
    <Screen
      back
      title="Blood request"
      subtitle={`Posted ${timeAgo(request.createdAt)} by ${request.requesterName}`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.summary}>
        <BloodMark bloodType={request.bloodType} size="lg" muted={request.status !== 'open'} />
        <View style={styles.summaryText}>
          <Text variant="title">{unitsLabel} of {request.bloodType}</Text>
          <Text variant="body" color={palette.inkMuted}>for {request.patientName}</Text>
          <View style={styles.pills}>
            <Pill {...STATUS[request.status]} />
            {request.status === 'open' && <Pill {...URGENCY[request.urgency]} />}
          </View>
        </View>
      </View>

      {phone && request.status === 'open' && (
        <View style={styles.actions}>
          <Button
            icon="phone"
            label="Call"
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={styles.flex}
          />
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
        <ListRow icon="hospital-building" title={request.hospital} subtitle={place || undefined} />
        <ListRow icon="phone-outline" title={request.contactNumber || 'No contact number'} subtitle="Contact" />
        <ListRow icon="calendar-blank-outline" title={formatDate(request.createdAt)} subtitle="Posted" />
      </List>

      {isManager && request.status === 'open' && (
        <Button
          icon="account-search"
          label="Find eligible donors"
          color={palette.info}
          onPress={() => router.push({
            pathname: '/(tabs)/manage',
            params: { bloodType: request.bloodType, district: request.district ?? '', requestId: request.id },
          })}
        />
      )}

      {isManager && (
        <Section title={`Donations logged (${donations.length} of ${request.units})`}>
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              { width: `${Math.min(100, (donations.length / Math.max(1, request.units)) * 100)}%` },
            ]} />
          </View>
          <DonationList donations={donations} />
        </Section>
      )}

      {canUpdate && (
        <View style={styles.actions}>
          <Button
            icon="check-circle-outline"
            label="Mark fulfilled"
            color={palette.leaf}
            loading={updating}
            onPress={() => updateStatus('fulfilled')}
            style={styles.flex}
          />
          <Button
            label="Close"
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

const styles = StyleSheet.create({
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

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BloodRequest } from '@/shared/types';
import { mapRequest } from '@/src/utils/data';
import { palette, radius, space } from '@/src/theme';
import AlertsCard from '@/src/components/AlertsCard';
import VisibilityCard from '@/src/components/VisibilityCard';
import DonorCard from '@/src/components/DonorCard';
import RequestRow from '@/src/components/RequestRow';
import EmptyState from '@/src/components/ui/EmptyState';
import { List } from '@/src/components/ui/List';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';
import { useI18n } from '@/src/i18n';

export default function HomeScreen() {
  const { profile, authUser } = useCurrentUser();
  const { t, districtName } = useI18n();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(collection(firestore, 'users', authUser.uid, 'inbox'), snap => {
      const count = snap.docs.filter(item => !item.data().readAt).length;
      setUnreadCount(count);
      Notifications.setBadgeCountAsync(count).catch(() => {});
    }, error => console.error('Error loading notification count:', error));
  }, [authUser?.uid]);

  const fetchRequests = async () => {
    try {
      const snap = await getDocs(query(
        collection(firestore, 'bloodRequests'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(30),
      ));
      setRequests(snap.docs.map(mapRequest));
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  // Prefer requests in the donor's own district; fall back to all of Kerala.
  const nearby = profile?.district ? requests.filter(r => r.district === profile.district) : [];
  const shown = (nearby.length ? nearby : requests).slice(0, 5);
  const scope = nearby.length ? districtName(profile!.district) : t('common.kerala');
  const firstName = profile?.name?.split(' ')[0] ?? '';

  return (
    <Screen
      title={firstName ? t('home.helloName', { name: firstName }) : t('home.hello')}
      subtitle={profile?.district ? t('common.inKerala', { district: districtName(profile.district) }) : t('common.kerala')}
      right={<Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={t('notifications.title')} style={styles.bell}>
        <MaterialCommunityIcons name={unreadCount ? 'bell-badge' : 'bell-outline'} size={26} color="#fff" />
        {unreadCount > 0 && <View style={styles.bellBadge}><Text variant="caption" color={palette.bloodDark}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
      </Pressable>}
      refreshing={refreshing}
      onRefresh={onRefresh}
      hero={profile && (
        <DonorCard
          bloodType={profile.bloodType}
          lastDonation={profile.lastDonation}
          donationCount={profile.donationCount ?? 0}
        />
      )}
    >
      <AlertsCard />

      <VisibilityCard />

      {profile && !profile.district && (
        <Pressable style={styles.notice} onPress={() => router.push('/profile/edit')} accessibilityRole="button">
          <MaterialCommunityIcons name="map-marker-plus" size={24} color={palette.turmeric} />
          <Text variant="body" style={styles.flex}>
            {t('home.addDistrict')}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.turmeric} />
        </Pressable>
      )}

      <View style={styles.actions}>
        <ActionTile
          icon="water-plus"
          title={t('home.requestBlood')}
          text={t('home.requestBloodText')}
          onPress={() => router.push('/request/new')}
          filled
        />
        <ActionTile
          icon="hand-heart"
          title={t('home.donated')}
          text={t('home.donatedText')}
          onPress={() => router.push('/donation/new')}
        />
      </View>

      <Pressable style={styles.findRow} onPress={() => router.push('/find-donors')} accessibilityRole="button">
        <MaterialCommunityIcons name="account-search" size={24} color={palette.blood} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t('home.findDonors')}</Text>
          <Text variant="caption" color={palette.inkMuted}>{t('home.findDonorsText')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={palette.inkFaint} />
      </Pressable>

      <Section
        title={t('home.openRequestsIn', { place: scope })}
        action={{ label: t('common.seeAll'), onPress: () => router.navigate('/(tabs)/requests') }}
      >
        {loading ? (
          <ActivityIndicator color={palette.blood} style={styles.loading} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon="water-check"
            title={t('home.noRequests')}
            message={t('home.noRequestsMessage')}
          />
        ) : (
          <List>
            {shown.map(request => <RequestRow key={request.id} request={request} />)}
          </List>
        )}
      </Section>
    </Screen>
  );
}

function ActionTile({ icon, title, text, onPress, filled }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
  onPress: () => void;
  filled?: boolean;
}) {
  const fg = filled ? '#fff' : palette.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tile, filled && styles.tileFilled, pressed && { opacity: 0.85 }]}
    >
      <MaterialCommunityIcons name={icon} size={26} color={filled ? '#fff' : palette.blood} />
      <Text variant="bodyStrong" color={fg} style={styles.tileTitle}>{title}</Text>
      <Text variant="caption" color={filled ? 'rgba(255,255,255,0.8)' : palette.inkMuted}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { padding: space.xs, position: 'relative' },
  bellBadge: { position: 'absolute', top: -2, right: -5, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  flex: {
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.turmericTint,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  tile: {
    flex: 1,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  tileFilled: {
    backgroundColor: palette.bloodDark,
    borderColor: palette.bloodDark,
  },
  findRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  tileTitle: {
    marginTop: space.sm,
  },
  loading: {
    paddingVertical: space.xl,
  },
});

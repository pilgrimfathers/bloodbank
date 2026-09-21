import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { BloodRequest } from '@/src/types';
import { mapRequest } from '@/src/utils/data';
import { palette, radius, space } from '@/src/theme';
import DonorCard from '@/src/components/DonorCard';
import RequestRow from '@/src/components/RequestRow';
import EmptyState from '@/src/components/ui/EmptyState';
import { List } from '@/src/components/ui/List';
import Screen from '@/src/components/ui/Screen';
import Section from '@/src/components/ui/Section';
import Text from '@/src/components/ui/Text';

export default function HomeScreen() {
  const { profile } = useCurrentUser();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  const scope = nearby.length ? profile!.district : 'Kerala';
  const firstName = profile?.name?.split(' ')[0] ?? '';

  return (
    <Screen
      title={firstName ? `Hello, ${firstName}` : 'Hello'}
      subtitle={profile?.district ? `${profile.district}, Kerala` : 'Kerala'}
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
      {profile && !profile.district && (
        <Pressable style={styles.notice} onPress={() => router.push('/profile/edit')} accessibilityRole="button">
          <MaterialCommunityIcons name="map-marker-plus" size={24} color={palette.turmeric} />
          <Text variant="body" style={styles.flex}>
            Add your district so volunteers can call you for requests nearby.
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.turmeric} />
        </Pressable>
      )}

      <View style={styles.actions}>
        <ActionTile
          icon="water-plus"
          title="Request blood"
          text="For a patient who needs it"
          onPress={() => router.push('/request/new')}
          filled
        />
        <ActionTile
          icon="hand-heart"
          title="I donated"
          text="Log it to start your cool-off"
          onPress={() => router.push('/donation/new')}
        />
      </View>

      <Section
        title={`Open requests in ${scope}`}
        action={{ label: 'See all', onPress: () => router.navigate('/(tabs)/requests') }}
      >
        {loading ? (
          <ActivityIndicator color={palette.blood} style={styles.loading} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon="water-check"
            title="No open requests right now"
            message="When someone needs blood, it shows up here."
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
  tileTitle: {
    marginTop: space.sm,
  },
  loading: {
    paddingVertical: space.xl,
  },
});

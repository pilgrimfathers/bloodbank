import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { KERALA_DISTRICTS } from '@/src/constants';
import { BloodRequest } from '@/src/types';
import { mapRequest } from '@/src/utils/data';
import { palette, radius, space } from '@/src/theme';
import ChipSelect from '@/src/components/ChipSelect';
import RequestRow from '@/src/components/RequestRow';
import EmptyState from '@/src/components/ui/EmptyState';
import Screen, { HeaderButton } from '@/src/components/ui/Screen';

type StatusFilter = 'open' | 'all';

export default function RequestsScreen() {
  const { profile } = useCurrentUser();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [district, setDistrict] = useState<string | null>(profile?.district ?? null);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      const q = query(collection(firestore, 'bloodRequests'), orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(q);
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

  // Filtered client-side to avoid needing a district+createdAt composite index.
  const visible = useMemo(
    () => requests.filter(r =>
      (!district || r.district === district) && (status === 'all' || r.status === 'open')
    ),
    [requests, district, status],
  );

  return (
    <Screen
      title="Blood requests"
      subtitle={district ? `Showing ${district}` : 'Showing all of Kerala'}
      right={<HeaderButton icon="plus" label="Request blood" onPress={() => router.push('/request/new')} />}
      scroll={false}
      contentStyle={styles.noGap}
    >
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={[
            styles.item,
            index === 0 && styles.first,
            index === visible.length - 1 && styles.last,
            index > 0 && styles.divider,
          ]}>
            <RequestRow request={item} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.blood]} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filters}>
            <ChipSelect
              horizontal
              options={KERALA_DISTRICTS}
              value={district}
              onChange={setDistrict}
              allLabel="All Kerala"
              onClear={() => setDistrict(null)}
            />
            <ChipSelect
              horizontal
              options={['open', 'all']}
              value={status}
              onChange={value => setStatus(value as StatusFilter)}
              format={value => (value === 'open' ? 'Open only' : 'Include closed')}
            />
          </View>
        }
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={palette.blood} style={styles.loading} />
        ) : (
          <EmptyState
            icon="water-check"
            title={`No ${status === 'open' ? 'open ' : ''}requests${district ? ` in ${district}` : ''}`}
            message="Try another district, or post a request if someone needs blood."
            action={{ label: 'Request blood', onPress: () => router.push('/request/new') }}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noGap: {
    gap: 0,
    paddingTop: 0,
  },
  filters: {
    paddingTop: space.lg,
  },
  list: {
    paddingBottom: space.xxl,
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

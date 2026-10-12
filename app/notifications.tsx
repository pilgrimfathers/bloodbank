import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { collection, onSnapshot, orderBy, query, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/src/components/ui/Screen';
import Text from '@/src/components/ui/Text';
import EmptyState from '@/src/components/ui/EmptyState';
import { firestore } from '@/src/config/firebase';
import { useCurrentUser } from '@/src/context/UserContext';
import { useI18n } from '@/src/i18n';
import { palette, radius, space } from '@/src/theme';
import type { InboxNotification } from '@/shared/notifications';

export default function NotificationsScreen() {
  const { authUser } = useCurrentUser();
  const { t, timeAgo } = useI18n();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(query(collection(firestore, 'users', authUser.uid, 'inbox'), orderBy('createdAt', 'desc')),
      snap => {
        setItems(snap.docs.map(item => {
          const data = item.data();
          return { id: item.id, title: data.title, body: data.body, data: data.data, createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? null, readAt: (data.readAt as Timestamp | null)?.toDate() ?? null };
        }));
        Notifications.setBadgeCountAsync(snap.docs.filter(item => !item.data().readAt).length).catch(() => {});
        setLoading(false);
      }, error => { console.error('Error loading notifications:', error); setLoading(false); });
  }, [authUser?.uid]);

  const markRead = (item: InboxNotification) => {
    if (!item.readAt && authUser) updateDoc(doc(firestore, 'users', authUser.uid, 'inbox', item.id), { readAt: new Date() }).catch(error => console.error('Could not mark notification read:', error));
  };
  const openItem = (item: InboxNotification) => {
    markRead(item);
    if (item.data?.type === 'request' && item.data.requestId) router.push({ pathname: '/request/[id]', params: { id: item.data.requestId } });
    else if (item.data?.type === 'donor' && item.data.donorId) router.push({ pathname: '/donor/[id]', params: { id: item.data.donorId } });
  };
  const unread = items.filter(item => !item.readAt);
  const markAllRead = async () => {
    if (!authUser) return;
    await Promise.all(unread.map(item => updateDoc(doc(firestore, 'users', authUser.uid, 'inbox', item.id), { readAt: new Date() })));
  };

  return <Screen title={t('notifications.title')} back right={unread.length > 0 ? <Pressable onPress={markAllRead} accessibilityRole="button"><Text variant="caption" color="#fff">{t('notifications.markAllRead')}</Text></Pressable> : undefined}>
    {loading ? <ActivityIndicator color={palette.blood} style={styles.loading} /> : items.length === 0 ? <EmptyState icon="bell-outline" title={t('notifications.empty')} message={t('notifications.emptyMessage')} /> : (
      <View style={styles.list}>{items.map(item => <Pressable key={item.id} onPress={() => openItem(item)} accessibilityRole="button" style={[styles.item, !item.readAt && styles.unread]}>
        <View style={styles.icon}><MaterialCommunityIcons name={item.data?.type === 'donor' ? 'account-heart' : 'water'} size={23} color={palette.blood} /></View>
        <View style={styles.copy}><View style={styles.titleRow}><Text variant="bodyStrong" style={styles.flex}>{item.title}</Text>{!item.readAt && <View style={styles.dot} />}</View><Text variant="body" color={palette.inkMuted}>{item.body}</Text>{item.createdAt && <Text variant="caption" color={palette.inkFaint}>{timeAgo(item.createdAt)}</Text>}</View>
      </Pressable>)}</View>
    )}
  </Screen>;
}

const styles = StyleSheet.create({
  loading: { paddingVertical: space.xxl },
  list: { gap: space.sm },
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  unread: { backgroundColor: palette.bloodTint, borderColor: palette.bloodTint },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  copy: { flex: 1, gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.blood },
});

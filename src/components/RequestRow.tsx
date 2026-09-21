import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { palette, space } from '@/src/theme';
import { BloodRequest } from '@/src/types';
import { timeAgo } from '@/src/utils/format';
import BloodMark from './ui/BloodMark';
import { ListRow } from './ui/List';
import Pill, { Tone } from './ui/Pill';
import Text from './ui/Text';

const URGENCY: Record<BloodRequest['urgency'], { label: string; tone: Tone }> = {
  high: { label: 'Urgent', tone: 'blood' },
  medium: { label: 'Soon', tone: 'turmeric' },
  low: { label: 'Planned', tone: 'muted' },
};

const STATUS: Record<BloodRequest['status'], { label: string; tone: Tone } | null> = {
  open: null,
  fulfilled: { label: 'Fulfilled', tone: 'leaf' },
  closed: { label: 'Closed', tone: 'muted' },
};

export default function RequestRow({ request }: { request: BloodRequest }) {
  const urgency = URGENCY[request.urgency] ?? URGENCY.low;
  const status = STATUS[request.status];
  const place = [request.location, request.district].filter(Boolean).join(', ');

  return (
    <ListRow
      leading={<BloodMark bloodType={request.bloodType} muted={request.status !== 'open'} />}
      title={request.hospital}
      subtitle={`${request.units} ${request.units === 1 ? 'unit' : 'units'} for ${request.patientName}\n${place}`}
      trailing={
        <View style={styles.meta}>
          {status ? <Pill {...status} /> : <Pill {...urgency} />}
          {request.createdAt && (
            <Text variant="caption" color={palette.inkFaint}>{timeAgo(request.createdAt)}</Text>
          )}
        </View>
      }
      chevron={false}
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
    />
  );
}

const styles = StyleSheet.create({
  meta: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
});

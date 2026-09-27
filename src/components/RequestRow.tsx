import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { palette, space } from '@/src/theme';
import { BloodRequest } from '@/shared/types';
import { StringKey, useI18n } from '@/src/i18n';
import BloodMark from './ui/BloodMark';
import { ListRow } from './ui/List';
import Pill, { Tone } from './ui/Pill';
import Text from './ui/Text';

const URGENCY: Record<BloodRequest['urgency'], { label: StringKey; tone: Tone }> = {
  high: { label: 'urgency.high', tone: 'blood' },
  medium: { label: 'urgency.medium', tone: 'turmeric' },
  low: { label: 'urgency.low', tone: 'muted' },
};

const STATUS: Record<BloodRequest['status'], { label: StringKey; tone: Tone } | null> = {
  open: null,
  fulfilled: { label: 'status.fulfilled', tone: 'leaf' },
  closed: { label: 'status.closed', tone: 'muted' },
};

export default function RequestRow({ request }: { request: BloodRequest }) {
  const { t, timeAgo, districtName } = useI18n();
  const urgency = URGENCY[request.urgency] ?? URGENCY.low;
  const status = STATUS[request.status];
  const pill = status ?? urgency;
  const place = [request.location, districtName(request.district)].filter(Boolean).join(', ');
  const units = request.units === 1
    ? t('request.oneUnitFor', { patient: request.patientName })
    : t('request.unitsFor', { units: request.units, patient: request.patientName });

  return (
    <ListRow
      leading={<BloodMark bloodType={request.bloodType} muted={request.status !== 'open'} />}
      title={request.hospital}
      subtitle={`${units}\n${place}`}
      trailing={
        <View style={styles.meta}>
          <Pill label={t(pill.label)} tone={pill.tone} />
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

import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, space } from '@/src/theme';
import { getEligibility } from '@/shared/eligibility';
import { formatDate } from '@/shared/format';
import Text from './ui/Text';

type Props = {
  bloodType: string;
  lastDonation?: Date | null;
  donationCount?: number;
};

const SIZE = 132;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// How far the body has "refilled" since the last donation, 0..1.
function refillProgress(lastDonation: Date | null | undefined, eligibleFrom: Date | null) {
  if (!lastDonation || !eligibleFrom) return 1;
  const total = eligibleFrom.getTime() - lastDonation.getTime();
  const elapsed = Date.now() - lastDonation.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

export default function DonorCard({ bloodType, lastDonation, donationCount = 0 }: Props) {
  const { eligible, eligibleFrom, daysRemaining } = getEligibility(lastDonation);
  const progress = refillProgress(lastDonation, eligibleFrom);
  const ringColor = eligible ? palette.leaf : palette.turmeric;

  return (
    <View style={styles.card}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={palette.line} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text variant="display" color={palette.blood}>{bloodType || '?'}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text variant="heading" color={ringColor}>
          {eligible ? 'Ready to donate' : `${daysRemaining} days to go`}
        </Text>
        <Text variant="caption" color={palette.inkMuted} style={styles.gap}>
          {eligible
            ? lastDonation
              ? `Last gave on ${formatDate(lastDonation)}`
              : 'No donations recorded yet'
            : `Your body is refilling. You can give again on ${formatDate(eligibleFrom)}.`}
        </Text>
        <View style={styles.count}>
          <MaterialCommunityIcons name="water" size={18} color={palette.kasavu} />
          <Text variant="label" color={palette.ink}>
            {donationCount === 1 ? '1 donation' : `${donationCount} donations`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.line,
  },
  ring: {
    width: SIZE,
    height: SIZE,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
  },
  gap: {
    marginTop: space.xs,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.md,
    alignSelf: 'flex-start',
    backgroundColor: palette.kasavuTint,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
});

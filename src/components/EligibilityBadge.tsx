import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { getEligibility } from '../utils/eligibility';
import { formatDate } from '../utils/format';

type Props = {
  lastDonation?: Date | null;
  // "card" shows a full explanation, "badge" a compact pill for lists.
  variant?: 'card' | 'badge';
};

export default function EligibilityBadge({ lastDonation, variant = 'badge' }: Props) {
  const { eligible, eligibleFrom, daysRemaining } = getEligibility(lastDonation);
  const color = eligible ? COLORS.success : COLORS.warning;

  if (variant === 'badge') {
    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>
          {eligible ? 'ELIGIBLE' : `${daysRemaining}d LEFT`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <MaterialCommunityIcons
        name={eligible ? 'check-circle' : 'timer-sand'}
        size={32}
        color={color}
      />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color }]}>
          {eligible ? 'Eligible to donate' : 'In cool-off period'}
        </Text>
        <Text style={styles.cardText}>
          {eligible
            ? lastDonation
              ? `Last donated on ${formatDate(lastDonation)}`
              : 'No donations recorded yet'
            : `Can donate again from ${formatDate(eligibleFrom)} (${daysRemaining} days)`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardText: {
    color: COLORS.muted,
    marginTop: 4,
  },
});

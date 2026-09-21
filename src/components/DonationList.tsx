import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { Donation } from '../types';
import { formatDate } from '../utils/format';

type Props = {
  donations: Donation[];
  onDelete?: (donation: Donation) => void;
};

export default function DonationList({ donations, onDelete }: Props) {
  if (donations.length === 0) {
    return <Text style={styles.empty}>No donations recorded yet.</Text>;
  }

  return (
    <View style={styles.card}>
      {donations.map((donation, index) => (
        <View key={donation.id} style={[styles.row, index === donations.length - 1 && styles.lastRow]}>
          <MaterialCommunityIcons name="water" size={24} color={COLORS.primary} />
          <View style={styles.content}>
            <Text style={styles.date}>{formatDate(donation.date)}</Text>
            <Text style={styles.meta}>
              {donation.hospital || 'Hospital not recorded'}
              {donation.recordedByName ? ` · logged by ${donation.recordedByName}` : ''}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(donation)} hitSlop={8}>
              <MaterialCommunityIcons name="delete-outline" size={22} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  content: {
    flex: 1,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    color: COLORS.muted,
  },
});

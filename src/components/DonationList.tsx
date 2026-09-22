import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '@/src/theme';
import { Donation } from '@/shared/types';
import { formatDate } from '@/shared/format';
import EmptyState from './ui/EmptyState';
import { List, ListRow } from './ui/List';

type Props = {
  donations: Donation[];
  onDelete?: (donation: Donation) => void;
};

export default function DonationList({ donations, onDelete }: Props) {
  if (donations.length === 0) {
    return <EmptyState icon="water-outline" title="No donations recorded yet" />;
  }

  return (
    <List>
      {donations.map(donation => (
        <ListRow
          key={donation.id}
          icon="water"
          title={formatDate(donation.date)}
          subtitle={[
            donation.hospital || 'Hospital not recorded',
            donation.recordedByName && `Logged by ${donation.recordedByName}`,
          ].filter(Boolean).join('\n')}
          trailing={onDelete && (
            <Pressable
              onPress={() => onDelete(donation)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Delete donation on ${formatDate(donation.date)}`}
            >
              <MaterialCommunityIcons name="delete-outline" size={22} color={palette.inkFaint} />
            </Pressable>
          )}
        />
      ))}
    </List>
  );
}

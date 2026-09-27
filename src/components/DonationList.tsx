import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '@/src/theme';
import { Donation } from '@/shared/types';
import { useI18n } from '@/src/i18n';
import EmptyState from './ui/EmptyState';
import { List, ListRow } from './ui/List';

type Props = {
  donations: Donation[];
  onDelete?: (donation: Donation) => void;
};

export default function DonationList({ donations, onDelete }: Props) {
  const { t, formatDate } = useI18n();
  if (donations.length === 0) {
    return <EmptyState icon="water-outline" title={t('eligibility.noDonations')} />;
  }

  return (
    <List>
      {donations.map(donation => (
        <ListRow
          key={donation.id}
          icon="water"
          title={formatDate(donation.date)}
          subtitle={[
            donation.hospital || t('donation.hospitalNotRecorded'),
            donation.recordedByName && t('donation.loggedBy', { name: donation.recordedByName }),
          ].filter(Boolean).join('\n')}
          trailing={onDelete && (
            <Pressable
              onPress={() => onDelete(donation)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('donation.deleteLabel', { date: formatDate(donation.date) })}
            >
              <MaterialCommunityIcons name="delete-outline" size={22} color={palette.inkFaint} />
            </Pressable>
          )}
        />
      ))}
    </List>
  );
}

import { getEligibility } from '@/shared/eligibility';
import { useI18n } from '@/src/i18n';
import Pill from './ui/Pill';

// Compact eligibility tag for lists. Use DonorCard for the full view.
export default function EligibilityBadge({ lastDonation }: { lastDonation?: Date | null }) {
  const { t } = useI18n();
  const { eligible, daysRemaining } = getEligibility(lastDonation);
  return eligible
    ? <Pill label={t('eligibility.canDonate')} tone="leaf" />
    : <Pill label={t('eligibility.daysLeft', { count: daysRemaining })} tone="turmeric" />;
}

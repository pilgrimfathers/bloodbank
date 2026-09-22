import { getEligibility } from '@/shared/eligibility';
import Pill from './ui/Pill';

// Compact eligibility tag for lists. Use DonorCard for the full view.
export default function EligibilityBadge({ lastDonation }: { lastDonation?: Date | null }) {
  const { eligible, daysRemaining } = getEligibility(lastDonation);
  return eligible
    ? <Pill label="Can donate" tone="leaf" />
    : <Pill label={`${daysRemaining} days left`} tone="turmeric" />;
}

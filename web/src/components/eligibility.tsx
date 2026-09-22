import { getEligibility } from "@shared/eligibility";
import { formatDate } from "@shared/format";
import { Pill } from "./ui";

export function EligibilityPill({ lastDonation }: { lastDonation?: Date | null }) {
  const { eligible, daysRemaining } = getEligibility(lastDonation);
  return eligible ? <Pill tone="leaf">Can donate</Pill> : <Pill tone="turmeric">{daysRemaining} days left</Pill>;
}

const SIZE = 120;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// The refill ring from the mobile donor card: fills over the cool-off period.
export function DonorRing({ bloodType, lastDonation, donationCount = 0 }: {
  bloodType: string;
  lastDonation?: Date | null;
  donationCount?: number;
}) {
  const { eligible, eligibleFrom, daysRemaining } = getEligibility(lastDonation);
  // Share of the cool-off already served, from the day counts getEligibility computes.
  const totalDays = lastDonation && eligibleFrom
    ? Math.round((eligibleFrom.getTime() - lastDonation.getTime()) / 86_400_000)
    : 0;
  const progress = totalDays > 0 ? Math.min(1, Math.max(0, 1 - daysRemaining / totalDays)) : 1;
  const ring = eligible ? "var(--color-leaf)" : "var(--color-turmeric)";

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={ring}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold tracking-tight text-blood">
          {bloodType || "?"}
        </span>
      </div>
      <div>
        <p className="text-lg font-semibold" style={{ color: ring }}>
          {eligible ? "Ready to donate" : `${daysRemaining} days to go`}
        </p>
        <p className="text-sm text-ink-muted">
          {eligible
            ? lastDonation ? `Last gave on ${formatDate(lastDonation)}` : "No donations recorded yet"
            : `Can give again on ${formatDate(eligibleFrom)}`}
        </p>
        <p className="mt-3">
          <Pill tone="kasavu">{donationCount === 1 ? "1 donation" : `${donationCount} donations`}</Pill>
        </p>
      </div>
    </div>
  );
}

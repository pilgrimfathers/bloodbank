import { COOLOFF_MONTHS } from './constants';

const DAY_MS = 24 * 60 * 60 * 1000;

// Adds calendar months, clamping to the last day of the target month
// (e.g. 31 Aug + 6 months = 28/29 Feb, not 2/3 Mar).
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function nextEligibleDate(lastDonation?: Date | null): Date | null {
  if (!lastDonation) return null;
  return addMonths(startOfDay(lastDonation), COOLOFF_MONTHS);
}

export type Eligibility = {
  eligible: boolean;
  eligibleFrom: Date | null;
  daysRemaining: number;
};

export function getEligibility(lastDonation?: Date | null, now: Date = new Date()): Eligibility {
  const eligibleFrom = nextEligibleDate(lastDonation);
  if (!eligibleFrom) return { eligible: true, eligibleFrom: null, daysRemaining: 0 };

  const daysRemaining = Math.ceil((eligibleFrom.getTime() - startOfDay(now).getTime()) / DAY_MS);
  return {
    eligible: daysRemaining <= 0,
    eligibleFrom,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

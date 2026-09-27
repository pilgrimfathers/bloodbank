// Contract for the public donor directory (web/src/app/api/donors). Donor
// documents stay readable by volunteers only; everyone else finds donors
// through these endpoints, which return only what the donor chose to share.

import type { ProfileVisibility } from './types';

export const DONOR_ENDPOINTS = {
  // Any signed-in user: donors who made their profile public.
  search: '/api/donors/search',
  // Requester (or a volunteer): push one of their open requests to a donor.
  ask: '/api/donors/ask',
  // Admins: fold a donor added without the app into their new app account.
  merge: '/api/donors/merge',
} as const;

export const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only volunteers can see you. They call you when a request matches.',
  },
  {
    value: 'public',
    label: 'Public, number hidden',
    description: 'People who need blood see your blood group and area, and can ask you through the app.',
  },
  {
    value: 'public_phone',
    label: 'Public with number',
    description: 'Also shows your phone number so people can call or WhatsApp you.',
  },
];

export const PUBLIC_VISIBILITIES: ProfileVisibility[] = ['public', 'public_phone'];

// A donor who asked to be found by the public, as seen by other users.
export type PublicDonor = {
  id: string;
  // First name and last initial, e.g. "Anjali M."
  name: string;
  bloodType: string;
  district?: string;
  area?: string;
  verified: boolean;
  eligible: boolean;
  daysRemaining: number;
  // Only present for "Public with number" donors.
  phoneNumber?: string;
};

export type DonorSearchBody = {
  bloodType: string;
  district?: string;
  // Also return donor groups that can give to bloodType.
  includeCompatible?: boolean;
};

export type DonorSearchResult = { donors: PublicDonor[] };

export type AskDonorBody = { donorId: string; requestId: string };

export type AskDonorResult = {
  sent: boolean;
  // Set when nothing was sent: asked before for this request, or the donor
  // has no device with notifications on.
  skipped?: 'already-asked' | 'no-device';
};

// Requesters can ask this many donors per day, to keep alerts meaningful.
export const DAILY_ASK_LIMIT = 10;

export function publicName(name?: string): string {
  const [first = 'Donor', ...rest] = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export type MergeDonorBody = {
  // The donor a volunteer added, who doesn't use the app (hasAccount false).
  fromId: string;
  // The app account the same person signed up with.
  intoId: string;
};

export type MergeDonorResult = { merged: true; donations: number };

// Details kept on the account when merging in a donor added without the app.
// The account's own answers win; the added record only fills gaps, and its
// volunteer notes and verification carry over.
export function mergedProfileFields(
  added: { area?: string; address?: string; medicalConditions?: string; district?: string; notes?: string; verified?: boolean },
  account: { area?: string; address?: string; medicalConditions?: string; district?: string; notes?: string; verified?: boolean },
) {
  const fill = (key: 'area' | 'address' | 'medicalConditions' | 'district') =>
    account[key]?.trim() ? {} : added[key]?.trim() ? { [key]: added[key] } : {};
  const notes = [account.notes?.trim(), added.notes?.trim()].filter(Boolean).join('\n\n');
  return {
    ...fill('district'),
    ...fill('area'),
    ...fill('address'),
    ...fill('medicalConditions'),
    ...(notes && { notes }),
    verified: !!(account.verified || added.verified),
  };
}

// Donation count and latest donation once all donations are on one donor.
export function donationSummary(dates: Date[]) {
  const latest = dates.reduce<Date | null>((max, date) => (!max || date > max ? date : max), null);
  return { lastDonation: latest, donationCount: dates.length };
}

// Contract for the public donor directory (web/src/app/api/donors). Donor
// documents stay readable by volunteers only; everyone else finds donors
// through these endpoints, which return only what the donor chose to share.

import type { ProfileVisibility } from './types';

export const DONOR_ENDPOINTS = {
  // Any signed-in user: donors who made their profile public.
  search: '/api/donors/search',
  // Requester (or a volunteer): push one of their open requests to a donor.
  ask: '/api/donors/ask',
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

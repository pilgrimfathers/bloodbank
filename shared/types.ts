export type UserRole = 'donor' | 'volunteer' | 'admin';

// Who outside the volunteer team can find a donor (see shared/donors.ts).
export type ProfileVisibility = 'private' | 'public' | 'public_phone';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  bloodType: string;
  phoneNumber: string;
  district?: string;
  area?: string;
  address: string;
  medicalConditions?: string;
  lastDonation?: Date | null;
  donationCount?: number;
  // Donor is willing to be contacted for donations.
  isDonor: boolean;
  // Missing means the donor hasn't chosen yet, and is treated as private.
  visibility?: ProfileVisibility;
  role?: UserRole;
  // Districts a volunteer manages. Empty or missing means all of Kerala.
  volunteerDistricts?: string[];
  verified?: boolean;
  status?: 'active' | 'inactive';
  // False for donors added by a volunteer who don't use the app.
  hasAccount?: boolean;
  notes?: string;
  // Expo push tokens for the devices this user is signed in on.
  pushTokens?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Donation = {
  id: string;
  donorId: string;
  donorName: string;
  bloodType: string;
  district?: string;
  date: Date;
  hospital?: string;
  requestId?: string | null;
  recordedBy: string;
  recordedByName?: string;
  createdAt: Date;
};

export type BloodRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  patientName: string;
  bloodType: string;
  units: number;
  urgency: 'high' | 'medium' | 'low';
  hospital: string;
  district?: string;
  location: string;
  status: 'open' | 'fulfilled' | 'closed';
  createdAt: Date;
  contactNumber: string;
  // Set by the notification API (see shared/notifications.ts).
  adminNotifiedAt?: Date | null;
  donorsNotifiedAt?: Date | null;
  donorsNotifiedCount?: number;
  donorsNotifiedByName?: string;
};

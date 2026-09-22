export type UserRole = 'donor' | 'volunteer' | 'admin';

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

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  bloodType: string;
  phoneNumber: string;
  address: string;
  lastDonation?: Date;
  isDonor: boolean;
};

export type BloodRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  bloodType: string;
  units: number;
  urgency: 'high' | 'medium' | 'low';
  hospital: string;
  location: string;
  status: 'open' | 'fulfilled' | 'closed';
  createdAt: Date;
  contactNumber: string;
}; 
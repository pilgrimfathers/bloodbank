import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { UserProfile } from '@/shared/types';
import { mapUser } from '../utils/data';
import { registerPushToken, scheduleCooloffReminder } from '../utils/push';

type UserContextValue = {
  authUser: User | null;
  profile: UserProfile | null;
  initializing: boolean;
};

const UserContext = createContext<UserContextValue>({
  authUser: null,
  profile: null,
  initializing: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      setAuthUser(user);
      if (!user) setProfile(null);
      setInitializing(false);
    });
  }, []);

  // Keep the profile live so role and last-donation changes show up immediately.
  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(
      doc(firestore, 'users', authUser.uid),
      snap => setProfile(snap.exists() ? mapUser(snap) : null),
      error => console.error('Error loading profile:', error),
    );
  }, [authUser]);

  // Register this device for push once the signed-in user's profile exists.
  const profileLoaded = !!profile;
  useEffect(() => {
    if (authUser && profileLoaded) registerPushToken(authUser.uid);
  }, [authUser?.uid, profileLoaded]);

  // Remind the donor on the day their cool-off ends.
  const lastDonationTime = profile?.lastDonation?.getTime();
  useEffect(() => {
    if (!profileLoaded) return;
    scheduleCooloffReminder(lastDonationTime ? new Date(lastDonationTime) : null);
  }, [profileLoaded, lastDonationTime]);

  return (
    <UserContext.Provider value={{ authUser, profile, initializing }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}

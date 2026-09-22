import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { UserProfile } from '@/shared/types';
import { mapUser } from '../utils/data';

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

  return (
    <UserContext.Provider value={{ authUser, profile, initializing }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}

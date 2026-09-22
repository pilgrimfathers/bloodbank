"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@shared/types";
import { auth, firestore } from "./firebase";
import { mapUser } from "./data";

type AuthValue = {
  authUser: User | null;
  profile: UserProfile | null;
  // True until both the auth state and (if signed in) the profile are known.
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({ authUser: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, user => {
    setAuthUser(user);
    if (!user) {
      setProfile(null);
      setProfileReady(true);
    } else {
      setProfileReady(false);
    }
    setAuthReady(true);
  }), []);

  // Keep the profile live so role changes apply without a reload.
  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(
      doc(firestore, "users", authUser.uid),
      snap => {
        setProfile(snap.exists() ? mapUser(snap) : null);
        setProfileReady(true);
      },
      error => {
        console.error("Error loading profile:", error);
        setProfileReady(true);
      },
    );
  }, [authUser]);

  return (
    <AuthContext.Provider value={{ authUser, profile, loading: !authReady || !profileReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

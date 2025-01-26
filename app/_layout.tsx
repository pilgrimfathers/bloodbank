import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { auth } from './config/firebase';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="request/[id]" />
          <Stack.Screen name="request/new" />
        </>
      )}
    </Stack>
  );
}

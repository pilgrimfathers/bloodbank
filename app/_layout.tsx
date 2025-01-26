import { Stack, useSegments, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { auth } from './config/firebase';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = segments[0] === '(tabs)' || segments[0] === 'request';

    if (!isAuthenticated && inProtectedRoute) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, initializing, segments[0]]);

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

import { Stack, useSegments, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { auth } from './config/firebase';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  const handleNavigation = useCallback(() => {
    if (initializing) return;

    // Check if the current route requires authentication
    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = !['index', '(auth)'].includes(segments[0] || '');

    if (!isAuthenticated && inProtectedRoute) {
      // Redirect to login if trying to access protected route while not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if trying to access auth pages while authenticated
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, initializing]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

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

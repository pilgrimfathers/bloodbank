import { Stack, useSegments, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { UserProvider, useCurrentUser } from '@/src/context/UserContext';

const PROTECTED_SEGMENTS = ['(tabs)', 'request', 'donor', 'donation', 'profile'];

function RootNavigator() {
  const { authUser, initializing } = useCurrentUser();
  const isAuthenticated = !!authUser;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = PROTECTED_SEGMENTS.includes(segments[0]);

    if (!isAuthenticated && inProtectedRoute) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, initializing, segments[0]]);

  if (initializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth Stack */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Main App Stack */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="request/[id]" />
        <Stack.Screen name="request/new" />
        <Stack.Screen name="donor/[id]" />
        <Stack.Screen name="donor/edit" />
        <Stack.Screen name="donation/new" />
        <Stack.Screen name="profile/edit" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}

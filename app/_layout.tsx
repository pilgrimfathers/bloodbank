import { Stack, useSegments, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  AnekMalayalam_400Regular,
  AnekMalayalam_500Medium,
  AnekMalayalam_600SemiBold,
  AnekMalayalam_700Bold,
  AnekMalayalam_800ExtraBold,
} from '@expo-google-fonts/anek-malayalam';
import { palette } from '@/src/theme';
import { UserProvider, useCurrentUser } from '@/src/context/UserContext';

SplashScreen.preventAutoHideAsync();

const PROTECTED_SEGMENTS = ['(tabs)', 'request', 'donor', 'donation', 'profile'];

function RootNavigator() {
  const { authUser, initializing } = useCurrentUser();
  const isAuthenticated = !!authUser;
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    AnekMalayalam_400Regular,
    AnekMalayalam_500Medium,
    AnekMalayalam_600SemiBold,
    AnekMalayalam_700Bold,
    AnekMalayalam_800ExtraBold,
  });
  // Fall back to system fonts rather than blocking the app if loading fails.
  const ready = !initializing && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

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

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }}>
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
      {/* Every screen opens with the red header band, so status bar icons stay light. */}
      <StatusBar style="light" />
      <RootNavigator />
    </UserProvider>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '@/src/utils/push';

type AlertPermission = {
  granted: boolean;
  // False once Android has stopped showing the prompt; only Settings can fix it.
  canAskAgain: boolean;
};

// Tracks notification permission, re-checking whenever the app returns to the
// foreground (e.g. after the user changes it in Settings).
export function useAlertPermission(uid?: string) {
  const [permission, setPermission] = useState<AlertPermission | null>(null);
  const wasGranted = useRef<boolean | null>(null);

  const refresh = useCallback(async () => {
    // Simulators and emulators can't receive push; don't nag there.
    if (!Device.isDevice) {
      setPermission({ granted: true, canAskAgain: false });
      return;
    }
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    const granted = status === 'granted';
    // Save the push token as soon as alerts get turned on.
    if (granted && wasGranted.current === false && uid) registerPushToken(uid);
    wasGranted.current = granted;
    setPermission({ granted, canAskAgain });
  }, [uid]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (permission?.canAskAgain) {
      const startedAt = Date.now();
      const { status } = await Notifications.requestPermissionsAsync();
      await refresh();
      // canAskAgain isn't reliable on Android: if the request came back at once,
      // no dialog was shown (the user blocked it before), so go to Settings.
      if (status === 'granted' || Date.now() - startedAt > 800) return;
    }
    await Linking.openSettings();
  }, [permission?.canAskAgain, refresh]);

  return { permission, enable };
}

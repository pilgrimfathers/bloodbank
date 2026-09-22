import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '@/src/config/firebase';
import { COOLOFF_MONTHS } from '@/shared/constants';
import { nextEligibleDate } from '@/shared/eligibility';
import { ANDROID_CHANNEL_ID, NotifyResult, PRODUCTION_API_URL } from '@/shared/notifications';

const TOKEN_KEY = 'pushToken';
const REMINDER_KEY = 'cooloffReminderId';

// Show alerts even while the app is open, so volunteers don't miss a request.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Blood requests',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A3142B',
  });
}

// Asks for permission (only if never asked) and saves this device's Expo push
// token on the user's profile. Never throws: Expo Go on Android has no remote push.
export async function registerPushToken(uid: string) {
  try {
    if (!Device.isDevice) return;
    await ensureAndroidChannel();

    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await updateDoc(doc(firestore, 'users', uid), { pushTokens: arrayUnion(token) });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Push registration skipped:', error);
  }
}

// Removes this device's token so a signed-out phone stops getting alerts.
export async function unregisterPushToken(uid: string) {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await updateDoc(doc(firestore, 'users', uid), { pushTokens: arrayRemove(token) });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Push unregistration failed:', error);
  }
}

// Local reminder on the morning the donor can give again. Rescheduled whenever
// the last donation changes; no server involved.
export async function scheduleCooloffReminder(lastDonation?: Date | null) {
  try {
    const previous = await AsyncStorage.getItem(REMINDER_KEY);
    if (previous) {
      await Notifications.cancelScheduledNotificationAsync(previous);
      await AsyncStorage.removeItem(REMINDER_KEY);
    }

    const eligibleFrom = nextEligibleDate(lastDonation);
    if (!eligibleFrom) return;
    const remindAt = new Date(eligibleFrom);
    remindAt.setHours(9, 0, 0, 0);
    if (remindAt <= new Date()) return;

    await ensureAndroidChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'You can donate again',
        body: `Your ${COOLOFF_MONTHS}-month cool-off is over. Thank you for keeping someone alive.`,
        data: { type: 'broadcast' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    await AsyncStorage.setItem(REMINDER_KEY, id);
  } catch (error) {
    console.warn('Could not schedule cool-off reminder:', error);
  }
}

// Calls the notification API on the web app with the user's Firebase ID token.
export async function callNotifyApi<T = NotifyResult>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be logged in.');
  const token = await user.getIdToken();

  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? `Request failed (${response.status})`);
  return json as T;
}

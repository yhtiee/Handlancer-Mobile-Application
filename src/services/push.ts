import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Remote push was removed from Expo Go in SDK 53, and `expo-notifications` throws
 * while its module body evaluates — so a top-level import would crash the whole app
 * at startup, not just this call. It has to be required lazily, behind this guard.
 *
 * `appOwnership` is deprecated in favour of `executionEnvironment`, but it is still
 * the only flag that separates Expo Go from a dev build: `executionEnvironment` is
 * `storeClient` for both, so guarding on it would disable push in dev builds too.
 */
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Show notifications that arrive while the app is open.
 *
 * Without a handler, expo-notifications delivers foreground pushes silently —
 * they land in the tray only after backgrounding, which reads as "push doesn't
 * work" during exactly the testing people do first.
 */
export function configurePushHandler(): void {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // `shouldShowAlert` is deprecated in SDK 56 — banner + list replace it.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Fires when the user taps a notification. Returns an unsubscribe fn. */
export function addPushResponseListener(
  onTap: (data: Record<string, unknown>) => void,
): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) return () => {};

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data ?? {};
    onTap(data as Record<string, unknown>);
  });
  return () => sub.remove();
}

/**
 * The notification that launched the app from a cold start, if any. A tap on a
 * killed app never reaches the response listener.
 */
export async function getInitialPushData(): Promise<Record<string, unknown> | null> {
  const Notifications = loadNotifications();
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  const data = response?.notification?.request?.content?.data;
  return (data as Record<string, unknown>) ?? null;
}

/** Request permission and return the Expo push token, or null if unavailable. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const Notifications = loadNotifications();
  if (!Notifications) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return null;
  }
}

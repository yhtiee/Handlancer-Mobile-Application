import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Remote push was removed from Expo Go in SDK 53 and `expo-notifications` may
 * throw while its module body evaluates there — so a top-level import would
 * crash the whole app at startup, not just this call. It has to be required
 * lazily, inside a try/catch, which DOES catch a throwing module body (unlike a
 * hoisted `import`, which runs before any of our code).
 *
 * `appOwnership` is deprecated in favour of `executionEnvironment`, but it is
 * still the only flag that separates Expo Go from a dev build:
 * `executionEnvironment` is `storeClient` for both.
 */
export const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

/** Why a device has no Expo push token. `null` means it has one. */
export type PushUnavailableReason =
  /** Simulator/emulator — Expo never issues tokens to one. */
  | 'simulator'
  /** Expo Go: remote push removed in SDK 53. Needs a dev/preview build. */
  | 'expo-go'
  /** `expo-notifications` could not be loaded in this runtime. */
  | 'module'
  /** The user declined the OS permission prompt. */
  | 'permission'
  /** Expo's token service rejected the request (usually a projectId problem). */
  | 'token';

export type PushRegistration = { token: string | null; reason: PushUnavailableReason | null };

/** Human-readable explanation, shown in Settings so "push is broken" has an answer. */
export const PUSH_REASON_TEXT: Record<PushUnavailableReason, string> = {
  simulator: 'Push needs a physical device — simulators never receive one.',
  'expo-go':
    'Expo Go cannot receive push notifications (removed in SDK 53). Install a development or preview build to get them on this phone.',
  module: 'The notifications module is unavailable in this build.',
  permission: 'Notification permission was denied. Turn it on in your phone’s app settings.',
  token: 'Could not get a push token from Expo. Check the EAS projectId in app.json.',
};

/**
 * Cached module handle. `undefined` = not tried yet, `null` = tried and failed.
 * Memoised because a module whose body throws re-throws on every `require`.
 */
let cached: NotificationsModule | null | undefined;

/**
 * Local notifications remain available in Expo Go; only remote push was removed.
 * So this loads the module regardless of runtime and lets each caller decide
 * whether the thing it wants is supported here.
 */
function loadNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Android needs a channel before a token is issued, and before any local post. */
async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
  });
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

  ensureAndroidChannel(Notifications).catch(() => {});
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

/**
 * Raise a notification from the device itself.
 *
 * This is the fallback for runtimes with no remote push — above all Expo Go,
 * where local notifications still work. The realtime subscription already
 * delivers every notification row to the running app, so the tray entry can be
 * posted here instead of by Expo's servers. It only covers the time the app is
 * actually running; a backgrounded or killed app still needs real push, which
 * needs a development build.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    await ensureAndroidChannel(Notifications);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data },
      // `null` fires immediately rather than scheduling.
      trigger: null,
    });
  } catch {
    // A tray entry is a nicety; never let it break the caller.
  }
}

/**
 * Request permission and return the Expo push token.
 *
 * Returns the reason alongside it rather than a bare `null`: every caller used
 * to collapse six different failures into "not available on this device", which
 * is why an unregistered phone was impossible to diagnose from inside the app.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (!Device.isDevice) return { token: null, reason: 'simulator' };

  const Notifications = loadNotifications();
  if (!Notifications) return { token: null, reason: 'module' };
  // Remote push specifically — the module above is still used for local posts.
  if (isExpoGo) return { token: null, reason: 'expo-go' };

  await ensureAndroidChannel(Notifications);

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return { token: null, reason: 'permission' };

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { token: token.data, reason: null };
  } catch (e) {
    console.log('[push] getExpoPushTokenAsync failed', e);
    return { token: null, reason: 'token' };
  }
}

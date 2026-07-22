import { useEffect } from 'react';

import { useNotificationsRealtime } from '@/queries/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { savePushToken } from '@/services/notifications';
import { registerForPushNotifications } from '@/services/push';

/** Registers the device for push once signed in, and saves the token. */
export function PushRegistrar() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  // Single app-wide realtime subscription that feeds the notifications cache.
  useNotificationsRealtime();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    registerForPushNotifications()
      .then((token) => {
        if (active && token && token !== profile?.push_token) {
          savePushToken(userId, token).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Only re-run when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}

import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useNotificationsRealtime } from '@/queries/use-notifications';
import { useRealtimeSync } from '@/queries/use-realtime-sync';
import { savePushToken } from '@/services/notifications';
import {
  addPushResponseListener,
  configurePushHandler,
  getInitialPushData,
  registerForPushNotifications,
} from '@/services/push';

/** Registers the device for push once signed in, and saves the token. */
export function PushRegistrar() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const shell = profile?.role === 'provider' ? 'provider' : 'user';

  // Single app-wide realtime subscription that feeds the notifications cache.
  useNotificationsRealtime();
  // Keeps jobs, quotes, escrow and chat fresh without a manual reload.
  useRealtimeSync();

  useEffect(() => {
    if (!userId) return;
    let active = true;

    configurePushHandler();
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

  // Tapping a notification should land on the thing it is about, not the home
  // screen — otherwise the user has to go and find it themselves.
  useEffect(() => {
    if (!userId) return;

    function open(data: Record<string, unknown>) {
      const jobId = typeof data.job_id === 'string' ? data.job_id : null;
      const conversationId =
        typeof data.conversation_id === 'string' ? data.conversation_id : null;

      if (conversationId) return router.push(routes.chatThread(shell, conversationId));
      if (jobId) {
        return router.push(
          shell === 'provider' ? routes.providerJobDetail(jobId) : routes.jobDetail(jobId),
        );
      }
      router.push(routes.profileNotifications(shell));
    }

    // A cold start from a tap never reaches the listener below.
    getInitialPushData()
      .then((data) => {
        if (data) open(data);
      })
      .catch(() => {});

    return addPushResponseListener(open);
  }, [userId, shell, router]);

  return null;
}

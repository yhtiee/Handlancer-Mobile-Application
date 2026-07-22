import { Stack } from 'expo-router/stack';

import { AppStack } from '@/components/app-stack';

/**
 * User shell: a Stack that sits ABOVE the tabs.
 *
 * Every secondary screen (post a job, wallet, notifications, a chat thread…) is
 * pushed onto THIS stack rather than into an individual tab's stack. That is
 * what makes Back return to the screen you actually came from: pushing
 * `/(user)/job/post` from Home no longer switches to the Jobs tab and strands
 * you on "My Jobs" when you go back.
 *
 * It also means the tab bar is covered by pushed screens for free — no
 * segment-sniffing needed to hide it.
 *
 * Screens set their own titles via `<Stack.Screen options>`; only `(tabs)`
 * needs configuring here, because its roots draw their own headers.
 */
export default function UserShellLayout() {
  return (
    <AppStack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </AppStack>
  );
}

import { Stack } from 'expo-router/stack';

import { AppStack } from '@/components/app-stack';

/**
 * Provider shell: a Stack that sits ABOVE the tabs. See the user shell for the
 * reasoning — pushing a secondary screen (quotes, wallet, a quote builder) onto
 * this stack rather than into a tab's own stack is what makes Back return to
 * the screen you came from.
 */
export default function ProviderShellLayout() {
  return (
    <AppStack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </AppStack>
  );
}

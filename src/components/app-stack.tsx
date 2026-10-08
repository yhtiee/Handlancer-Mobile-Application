import { Stack } from 'expo-router/stack';

import { HeaderClose } from '@/components/ui';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shared Stack configuration: a SOLID, cross-platform header with a centered
 * title and one consistent back affordance.
 *
 * The back button is defined here, once, rather than per screen — that is what
 * keeps every pushed screen on the same chevron. React Navigation passes
 * `canGoBack`, which is false on a stack's root, so tab roots render no back
 * button without needing to opt out.
 *
 * Deliberately avoids iOS-only header features that break on Android:
 * `headerTransparent`, `headerLargeTitle`, `headerBlurEffect` and
 * `PlatformColor`. A non-transparent header also makes React Navigation inset
 * the screen below it automatically — fixing content overflowing under the
 * header (e.g. the wallet balance card).
 */
export function AppStack({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        // React Navigation renders its own Text, so the family is set here.
        headerTitleStyle: { color: theme.text, fontSize: 17, fontFamily: FontFamily.text[600] },
        headerTintColor: theme.text,
        headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderClose /> : undefined),
        contentStyle: { backgroundColor: theme.background },
      }}>
      {children}
    </Stack>
  );
}

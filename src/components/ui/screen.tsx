import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import type { IconName } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const BG_LIGHT = require('@/assets/images/bg_light.png');
const BG_DARK = require('@/assets/images/bg_dark.png');

/** Non-scrolling screen container with the themed gradient background. */
export function ScreenView({ style, children, ...rest }: ViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const backgroundImage = scheme === 'dark' ? BG_DARK : BG_LIGHT;
  const theme = useTheme();

  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }, style]} {...rest}>
      <Image
        source={backgroundImage}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
      />
      {children}
    </View>
  );
}

/**
 * Standard scrollable screen body for a Stack child: handles safe-area insets
 * automatically and applies the themed gradient background.
 * Includes KeyboardAvoidingView to keep inputs visible when keyboard appears.
 */
export function Screen({ children, contentContainerStyle, style, ...rest }: ScrollViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const backgroundImage = scheme === 'dark' ? BG_DARK : BG_LIGHT;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <View style={{ flex: 1 }}>
        <Image
          source={backgroundImage}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={[{ flex: 1 }, style]}
          contentContainerStyle={[
            {
              paddingHorizontal: Layout.gutter,
              // The stack header covers the top inset; the bottom is ours to pad.
              // Tab roots override this with `useTabBarInset()` to clear the bar.
              paddingBottom: insets.bottom + Spacing.four,
              gap: Layout.listGap,
            },
            contentContainerStyle,
          ]}
          {...rest}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Placeholder body for screens not yet built out. */
export function PlaceholderScreen(props: {
  icon?: IconName;
  title: string;
  description?: string;
}) {
  return (
    <ScreenView>
      <EmptyState {...props} />
    </ScreenView>
  );
}

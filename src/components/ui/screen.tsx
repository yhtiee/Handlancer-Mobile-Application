import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import type { IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** Non-scrolling screen container on the flat ground colour. */
export function ScreenView({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * Standard scrollable screen body for a Stack child: handles safe-area insets
 * automatically and sits on the flat ground colour.
 * Includes KeyboardAvoidingView to keep inputs visible when keyboard appears.
 */
export function Screen({ children, contentContainerStyle, style, ...rest }: ScrollViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <View style={{ flex: 1 }}>
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

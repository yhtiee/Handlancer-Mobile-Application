import { type Href } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabButton } from '@/components/ui';
import { Elevation, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The four real tabs. Quotes and wallet are secondary screens on the shell
 * Stack in the parent `_layout`, not hidden tabs.
 */
export default function ProviderTabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.one,
            boxShadow: Elevation.lg,
          },
        ]}>
        <TabTrigger name="find-work" href={'/(provider)/(tabs)/(find-work)' as Href} asChild>
          <TabButton icon="search-outline" iconFocused="search" label="Find Work" />
        </TabTrigger>
        <TabTrigger name="jobs" href={'/(provider)/(tabs)/(jobs)' as Href} asChild>
          <TabButton icon="briefcase-outline" iconFocused="briefcase" label="My Jobs" />
        </TabTrigger>
        <TabTrigger name="messages" href={'/(provider)/(tabs)/(chat)' as Href} asChild>
          <TabButton icon="chatbubble-outline" iconFocused="chatbubble" label="Messages" />
        </TabTrigger>
        <TabTrigger name="profile" href={'/(provider)/(tabs)/(profile)' as Href} asChild>
          <TabButton icon="person-outline" iconFocused="person" label="Profile" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

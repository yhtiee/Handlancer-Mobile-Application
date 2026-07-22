import { type Href } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabButton } from '@/components/ui';
import { Elevation, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The four real tabs. Secondary screens live on the shell Stack in the parent
 * `_layout`, so they cover this bar on their own — nothing here needs to know
 * about them.
 */
export default function UserTabsLayout() {
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
        <TabTrigger name="home" href={'/(user)/(tabs)/(discover)' as Href} asChild>
          <TabButton icon="home-outline" iconFocused="home" label="Home" />
        </TabTrigger>
        <TabTrigger name="jobs" href={'/(user)/(tabs)/(jobs)' as Href} asChild>
          <TabButton icon="briefcase-outline" iconFocused="briefcase" label="Jobs" />
        </TabTrigger>
        <TabTrigger name="messages" href={'/(user)/(tabs)/(chat)' as Href} asChild>
          <TabButton icon="chatbubble-outline" iconFocused="chatbubble" label="Messages" />
        </TabTrigger>
        <TabTrigger name="profile" href={'/(user)/(tabs)/(profile)' as Href} asChild>
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

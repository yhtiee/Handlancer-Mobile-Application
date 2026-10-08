import { type Href } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { TabButton } from '@/components/ui';
import { useFloatingTabBarStyle } from '@/components/ui/tab-bar';

/**
 * The four real tabs. Quotes and wallet are secondary screens on the shell
 * Stack in the parent `_layout`, not hidden tabs.
 */
export default function ProviderTabsLayout() {
  const barStyle = useFloatingTabBarStyle();

  return (
    <Tabs>
      <TabSlot />
      <TabList style={barStyle}>
        <TabTrigger name="find-work" href={'/(provider)/(tabs)/(find-work)' as Href} asChild>
          <TabButton icon="search-outline" iconFocused="search" label="Find work" />
        </TabTrigger>
        <TabTrigger name="jobs" href={'/(provider)/(tabs)/(jobs)' as Href} asChild>
          <TabButton icon="briefcase-outline" iconFocused="briefcase" label="Jobs" />
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


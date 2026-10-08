import { type Href } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { TabButton } from '@/components/ui';
import { useFloatingTabBarStyle } from '@/components/ui/tab-bar';

/**
 * The four real tabs. Secondary screens live on the shell Stack in the parent
 * `_layout`, so they cover this bar on their own — nothing here needs to know
 * about them.
 */
export default function UserTabsLayout() {
  const barStyle = useFloatingTabBarStyle();

  return (
    <Tabs>
      <TabSlot />
      <TabList style={barStyle}>
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


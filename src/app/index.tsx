import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** App-logo intro. Hands off to the welcome screen, which checks the session. */
export default function Index() {
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Brief brand moment, then let the welcome screen take over the session check.
    const timer = setTimeout(() => router.replace('/(auth)/welcome'), 1100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 200, height: 200 },
});

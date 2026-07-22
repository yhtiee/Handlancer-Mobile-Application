import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const theme = useTheme();
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const dims = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={uri}
        style={[dims, { backgroundColor: theme.backgroundElement }]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={[dims, styles.fallback, { backgroundColor: theme.backgroundSelected }]}>
      <Text style={[styles.initials, { color: theme.text, fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '600' },
});

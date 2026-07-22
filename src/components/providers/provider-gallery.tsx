import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const IMAGE_HEIGHT = 320;

/**
 * Full-bleed header carousel of a provider's work photos, with paging dots,
 * floating back/more controls, and the provider's avatar inset at the corner.
 */
export function ProviderGallery({
  images,
  avatarUri,
  name,
  onMore,
}: {
  images: string[];
  avatarUri: string;
  name?: string | null;
  onMore?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View style={styles.wrap}>
      <View style={[styles.imageClip, { height: IMAGE_HEIGHT, backgroundColor: theme.backgroundElement }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }>
          {images.map((uri, i) => (
            <Image
              key={`${i}-${uri}`}
              source={uri}
              style={{ width, height: IMAGE_HEIGHT }}
              contentFit="cover"
              transition={150}
            />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.topBar, { top: insets.top + Spacing.two }]}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.circleBtn, { backgroundColor: theme.background }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.circleBtn, { backgroundColor: theme.background }]}
          onPress={onMore}>
          <Icon name="ellipsis-horizontal" size={22} color={theme.text} />
        </Pressable>
      </View>

      {images.length > 1 ? (
        <View style={[styles.dots, { bottom: Spacing.four }]} pointerEvents="none">
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === index ? 18 : 6,
                  backgroundColor: i === index ? theme.tint : 'rgba(255,255,255,0.7)',
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.avatarBox, { backgroundColor: theme.background }]}>
        <Image source={avatarUri} style={styles.avatarImg} contentFit="cover" transition={150} />
      </View>
    </View>
  );
}

const AVATAR = 64;

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: AVATAR / 2 },
  imageClip: {
    overflow: 'hidden',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    borderCurve: 'continuous',
  },
  topBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: Elevation.sm,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: { height: 6, borderRadius: Radius.pill },
  avatarBox: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 0,
    padding: 4,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    boxShadow: Elevation.md,
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
});

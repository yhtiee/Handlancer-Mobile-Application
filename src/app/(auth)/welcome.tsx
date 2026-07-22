import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GlobalLoader, ScreenView } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/hooks/use-theme';

const SLIDES = [
  {
    image: require('@/assets/images/working-man.png'),
    title: 'Browse Local Services',
    subtitle: 'Discover trusted artisans near you and explore the work they do.',
  },
  {
    image: require('@/assets/images/working-woman.png'),
    title: 'Hire With Confidence',
    subtitle: 'Your payment stays safe in escrow until the job is done right.',
  },
  // {
  //   image: require('@/assets/images/welcome.png'),
  //   title: 'Get Work Done',
  //   subtitle: 'Post a job, compare quotes, and book the right pro in minutes.',
  // },
];

export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { loading, session, profile } = useAuth();
  const [index, setIndex] = useState(0);

  // Session check: if already signed in, skip onboarding and go to the app.
  useEffect(() => {
    if (loading || !session) return;
    const home = profile
      ? profile.role === 'provider'
        ? routes.providerFindWork
        : routes.userHome
      : ('/(auth)/sign-in' as Href);
    router.replace(home);
  }, [loading, session, profile, router]);

  // Keep the transparent loader up while bootstrapping, and while a signed-in
  // user is being redirected away from onboarding.
  const showLoader = loading || !!session;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <ScreenView>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.carousel}
        contentContainerStyle={{ flexGrow: 1 }}>
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.heroWrap}>
              <Image source={slide.image} style={styles.heroImage} contentFit="cover" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === index ? 20 : 7,
                backgroundColor: i === index ? theme.tint : theme.border,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        entering={FadeInDown.delay(150)}
        style={[styles.actions, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Get Started" size="lg" onPress={() => router.push('/(auth)/sign-in')} />
        <Text style={[styles.legal, { color: theme.textSecondary }]}>
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </Animated.View>

      {/* Transparent session-check loader over the onboarding content. */}
      <GlobalLoader backgroundColor="transparent" visible={showLoader} />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  carousel: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: "100%" },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.two,
    alignSelf: 'center',
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
  },
  dot: { height: 7, borderRadius: Radius.pill },
  actions: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  legal: { fontSize: 12, textAlign: 'center' },
});

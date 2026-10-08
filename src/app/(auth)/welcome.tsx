import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GlobalLoader } from '@/components/ui';
import { PhotoScrims } from '@/components/ui/photo-header';
import { Text } from '@/components/ui/text';
import { Layout, Scrim, Spacing, Type, TypeItalic } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';

const PHOTO = require('@/assets/images/providers/tailor.png');

/**
 * One screen, one choice. A tradesperson at work, the promise in a sentence,
 * and the two ways in — the choice is carried through sign-in to role select.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, session, profile } = useAuth();

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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      <PhotoScrims top={220} bottom="70%" strength={0.94} />

      <Text style={[styles.word, { top: insets.top + Spacing.two }]}>Handlancer</Text>

      <View style={[styles.over, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Text style={[Type.serif, styles.white]}>
          Hire someone good. <Text style={TypeItalic}>Pay when it’s done.</Text>
        </Text>
        <Text style={[Type.body, styles.sub]}>
          Your money waits in escrow until you approve the work.
        </Text>
        <View style={styles.buttons}>
          <Button
            title="I need something done"
            size="lg"
            onPress={() => router.push('/(auth)/sign-in?role=user' as Href)}
            labelColor="#06201D"
            style={{ backgroundColor: '#2FD0BE' }}
          />
          <Button
            title="I do the work"
            size="lg"
            variant="secondary"
            labelColor="#FFFFFF"
            onPress={() => router.push('/(auth)/sign-in?role=provider' as Href)}
            style={styles.glass}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/sign-in' as Href)}
          style={styles.signin}>
          <Text style={[Type.callout, { color: 'rgba(255,255,255,0.8)' }]}>
            Have an account? <Text style={[Type.bodyMedium, styles.white]}>Sign in</Text>
          </Text>
        </Pressable>
      </View>

      {/* Transparent session-check loader over the onboarding content. */}
      <GlobalLoader backgroundColor="transparent" visible={showLoader} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1220' },
  word: { position: 'absolute', left: Layout.gutter, ...Type.serifTitle, color: '#FFFFFF' },
  over: { position: 'absolute', left: Layout.gutter, right: Layout.gutter, bottom: 0 },
  white: { color: '#FFFFFF' },
  sub: { color: 'rgba(255,255,255,0.86)', marginTop: Spacing.twoHalf },
  buttons: { gap: Spacing.twoHalf, marginTop: Spacing.five - 4 },
  glass: {
    backgroundColor: `rgba(${Scrim},0.6)`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  signin: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
});

import { useRouter } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import {
  getProfileById,
  signInWithEmail,
  signUpWithEmail,
} from '@/services/auth';

type Mode = 'signin' | 'signup';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;
    const emailVal = email.trim();
    if (!emailVal) {
      setEmailError('Enter your email');
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(emailVal)) {
      setEmailError('Enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Enter your password');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { session } = await signUpWithEmail(email, password);
        if (!session) {
          setError('Account created. Disable "Confirm email" in Supabase Auth to sign in instantly.');
          return;
        }
        // New account → choose a role next.
        router.replace('/(auth)/role-select');
      } else {
        const { user } = await signInWithEmail(email, password);
        const profile = await getProfileById(user.id);
        if (!profile) {
          router.replace('/(auth)/role-select');
        } else {
          // Straight to the role's home. Going via '/' would land on the splash
          // screen and bounce back through welcome.
          router.replace(profile.role === 'provider' ? routes.providerFindWork : routes.userHome);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      keyboardDismissMode="interactive"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four },
      ]}>
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {mode === 'signin'
              ? 'Sign in to continue to HandLancer.'
              : 'Sign up to post jobs or offer your services.'}
          </Text>
        </Animated.View>

        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <Text
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
                setEmailError(null);
                setPasswordError(null);
              }}
              style={[
                styles.segmentItem,
                {
                  color: mode === m ? theme.tintText : theme.textSecondary,
                  backgroundColor: mode === m ? theme.tint : 'transparent',
                },
              ]}>
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          ))}
        </View>

        <Input
          label="Email address"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            setEmailError(null);
          }}
          error={emailError}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            setPasswordError(null);
          }}
          error={passwordError}
          secureTextEntry
          autoCapitalize="none"
          textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          placeholder="At least 6 characters"
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        {error ? (
          <Text selectable style={{ color: theme.danger, fontSize: 14 }}>
            {error}
          </Text>
        ) : null}

        <Button
          title={mode === 'signin' ? 'Sign in' : 'Create account'}
          size="lg"
          loading={loading}
          onPress={submit}
        />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.two },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22 },
  segment: {
    flexDirection: 'row',
    padding: Spacing.half,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  segmentItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 10,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

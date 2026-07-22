import { useRouter } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import type { UserRole } from '@/services/database.types';
import { createProfile } from '@/services/auth';

const OPTIONS: { role: UserRole; icon: IconName; title: string; desc: string }[] = [
  {
    role: 'user',
    icon: 'person',
    title: 'I need a job done',
    desc: 'Post jobs, review quotes and hire trusted artisans.',
  },
  {
    role: 'provider',
    icon: 'construct',
    title: 'I provide services',
    desc: 'Find work, send quotes and get paid securely.',
  },
];

export default function RoleSelect() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useAuth();

  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!role) return setError('Choose how you want to use HandLancer');
    if (!name.trim()) return setError('Enter your name');
    if (!session) return setError('Session expired. Please sign in again.');

    setLoading(true);
    setError(null);
    try {
      await createProfile({
        id: session.user.id,
        role,
        name: name.trim(),
        email: session.user.email ?? null,
        phone: session.user.phone ?? null,
      });
      await refreshProfile();
      // Straight to the new role's home. Going via '/' would land on the splash
      // screen and bounce back through welcome.
      router.replace(role === 'provider' ? routes.providerFindWork : routes.userHome);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>How will you use HandLancer?</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You can switch later in settings.
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt, i) => {
            const selected = role === opt.role;
            return (
              <Animated.View key={opt.role} entering={FadeInDown.delay(i * 80)}>
                <Pressable
                  onPress={() => {
                    setRole(opt.role);
                    setError(null);
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: selected ? theme.tint : 'transparent',
                    },
                  ]}>
                  <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
                    <Icon name={opt.icon} size={26} color={theme.tint} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{opt.title}</Text>
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                      {opt.desc}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <Input
          label="Your name"
          value={name}
          onChangeText={setName}
          error={error}
          placeholder="Jane Doe"
          autoCapitalize="words"
        />

        <Button title="Continue" size="lg" loading={loading} onPress={handleContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.two },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22 },
  options: { gap: Spacing.three },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 26, height: 26 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardDesc: { fontSize: 14, lineHeight: 19 },
});

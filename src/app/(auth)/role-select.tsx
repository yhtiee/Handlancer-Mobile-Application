import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Input } from '@/components/ui';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useAuth } from '@/providers/auth-provider';
import type { UserRole } from '@/services/database.types';
import { createProfile } from '@/services/auth';

const OPTIONS: { role: UserRole; title: string; desc: string }[] = [
  {
    role: 'user',
    title: 'I need something done',
    desc: 'Post a job, compare quotes, pay through escrow.',
  },
  {
    role: 'provider',
    title: 'I do the work',
    desc: 'Find jobs near you, send quotes, get paid by stage.',
  },
];

export default function RoleSelect() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useAuth();

  // Pre-picked when the person chose on the welcome screen.
  const { role: preset } = useLocalSearchParams<{ role?: UserRole }>();
  const [role, setRole] = useState<UserRole | null>(
    preset === 'user' || preset === 'provider' ? preset : null,
  );
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!role) return setError('Choose how you want to use Handlancer');
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
          <Text style={[styles.title, { color: theme.text }]}>How will you use Handlancer?</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You can switch later in settings.
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const selected = role === opt.role;
            return (
              <View key={opt.role}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRole(opt.role);
                    setError(null);
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: selected ? theme.text : 'transparent',
                    },
                  ]}>
                  <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{opt.title}</Text>
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                      {opt.desc}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selected
                        ? { backgroundColor: theme.text, borderColor: theme.text }
                        : { borderColor: theme.textSecondary },
                    ]}>
                    {selected ? <Icon name="checkmark" size={14} color={theme.background} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Input
          label="Your name"
          value={name}
          onChangeText={setName}
          error={error}
          placeholder="Tolu Adeyemi"
          autoCapitalize="words"
        />

        <Button title="Continue" size="lg" loading={loading} onPress={handleContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.gutter, gap: Spacing.four },
  header: { gap: Spacing.two },
  title: { ...Type.serif },
  subtitle: { ...Type.body },
  options: { gap: Spacing.three },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardDesc: { fontSize: 14, lineHeight: 19 },
});

import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { formatMoney, Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useWallet } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

/** Compact wallet balance pill that opens the wallet as a secondary screen. */
export function WalletChip({ shell }: { shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const { data: wallet } = useWallet();
  const amount = wallet?.balance ?? 0;

  return (
    <Link href={routes.wallet(shell)} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: theme.tint + '1A', opacity: pressed ? 0.7 : 1 },
        ]}>
        <Icon name="wallet" size={15} color={theme.tint} />
        <Text style={[styles.text, { color: theme.tint }]}>
          {wallet ? formatMoney(amount, wallet.currency ?? 'NGN', true) : '—'}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
  },
  text: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

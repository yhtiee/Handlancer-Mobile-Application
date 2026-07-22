import { Link, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { TransactionRow } from '@/components/wallet/transaction-row';
import { EmptyState, Icon, type IconName, ListFooter, ScreenView, formatMoney } from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useTransactions, useWallet } from '@/queries/use-wallet';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';

export function WalletScreen({ shell }: { shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const bottomInset = useContentInset();
  const { data: wallet, isLoading } = useWallet();
  const query = useTransactions();
  const { items: txns, onEndReached, loadingMore } = useInfiniteList(query);

  const balanceGradient = {
    experimental_backgroundImage: `linear-gradient(135deg, ${theme.tint} 0%, ${theme.accent} 135%)`,
  } as unknown as ViewStyle;

  const header = (
    <View style={styles.header}>
      <View style={[styles.balanceCard, balanceGradient]}>
        <Text style={[styles.balanceLabel, { color: theme.tintText }]}>Available balance</Text>
        {isLoading ? (
          <ActivityIndicator color={theme.tintText} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Text selectable style={[styles.balance, { color: theme.tintText }]}>
            {formatMoney(wallet?.balance ?? 0, wallet?.currency ?? 'NGN')}
          </Text>
        )}
        <View style={styles.actions}>
          <Link href={routes.walletFund(shell)} asChild>
            <WalletAction icon="add" label="Add money" filled />
          </Link>
          <Link href={routes.walletWithdraw(shell)} asChild>
            <WalletAction icon="arrow-up" label="Withdraw" />
          </Link>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Transactions</Text>
    </View>
  );

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'Wallet' }} />
      <FlatList
        data={txns}
        keyExtractor={(item) => item.id}
        refreshing={query.isRefetching && !loadingMore}
        onRefresh={query.refetch}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingBottom: bottomInset }}
        renderItem={({ item }) => <TransactionRow txn={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="No transactions yet"
            description="Top up your wallet or complete a job to see activity here."
          />
        }
      />
    </ScreenView>
  );
}

function WalletAction({
  icon,
  label,
  filled,
  onPress,
}: {
  icon: IconName;
  label: string;
  filled?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: filled ? theme.tintText : 'rgba(255,255,255,0.2)',
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Icon name={icon} size={15} color={filled ? theme.tint : theme.tintText} />
      <Text style={[styles.actionText, { color: filled ? theme.tint : theme.tintText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: Layout.sectionGap, paddingTop: Layout.headerGap, paddingBottom: Spacing.two },
  balanceCard: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.two,
    boxShadow: '0 6px 18px rgba(15, 181, 164, 0.28)',
  },
  balanceLabel: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  balance: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  actionText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
});

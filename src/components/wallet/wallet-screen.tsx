import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { escrowAmounts, EscrowTape } from '@/components/escrow/escrow-tape';
import { Button, EmptyState, formatMoney, GlassButton, ListFooter, ScreenView } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { useTheme } from '@/hooks/use-theme';
import { providerImageFallback } from '@/lib/provider-images';
import { routes } from '@/lib/routes';
import { useMyJobs, useProviderJobs } from '@/queries/use-jobs';
import { useProvider } from '@/queries/use-providers';
import { useEscrow, useTransactions, useWallet } from '@/queries/use-wallet';
import type { Job, Transaction } from '@/services/database.types';

type Item = { kind: 'month'; key: string; label: string } | { kind: 'txn'; key: string; txn: Transaction };

/** Interleave month headings ("October", "September 2025") into the transaction list. */
function withMonths(txns: Transaction[]): Item[] {
  const out: Item[] = [];
  const thisYear = new Date().getFullYear();
  let last = '';
  for (const t of txns) {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== last) {
      last = key;
      const month = d.toLocaleString(undefined, { month: 'long' });
      out.push({ kind: 'month', key, label: d.getFullYear() === thisYear ? month : `${month} ${d.getFullYear()}` });
    }
    out.push({ kind: 'txn', key: t.id, txn: t });
  }
  return out;
}

export function WalletScreen({ shell }: { shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useContentInset();
  const { data: wallet, isLoading } = useWallet();
  const query = useTransactions();
  const { items: txns, onEndReached, loadingMore } = useInfiniteList(query);

  const [whole, kobo] = formatMoney(wallet?.balance ?? 0, wallet?.currency ?? 'NGN').split('.');

  const header = (
    <View style={styles.header}>
      <Text style={[Type.serifTitle, { color: theme.text }]}>Wallet</Text>
      <View>
        {isLoading ? (
          <ActivityIndicator color={theme.text} style={{ alignSelf: 'flex-start', height: 52 }} />
        ) : (
          <Text selectable style={[Type.amount, { color: theme.text }]}>
            {whole}
            {kobo ? <Text style={[styles.kobo, { color: theme.textSecondary }]}>.{kobo}</Text> : null}
          </Text>
        )}
        <Text style={[Type.body, { color: theme.textSecondary }]}>Available to spend or withdraw</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Fund" icon="add" style={{ flex: 1 }} onPress={() => router.push(routes.walletFund(shell))} />
        <Button title="Withdraw" icon="arrow-up" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(routes.walletWithdraw(shell))} />
      </View>
      <HeldInEscrow shell={shell} />
    </View>
  );

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.one }]}>
        <GlassButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <GlassButton
          icon="business-outline"
          accessibilityLabel="Bank account"
          onPress={() => router.push(routes.walletBank(shell))}
        />
      </View>
      <FlatList
        data={withMonths(txns)}
        keyExtractor={(item) => item.key}
        refreshing={query.isRefetching && !loadingMore}
        onRefresh={query.refetch}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListFooter loading={loadingMore} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingBottom: bottomInset }}
        renderItem={({ item }) =>
          item.kind === 'month' ? (
            <Text style={[Type.h3, styles.month, { color: theme.text }]}>{item.label}</Text>
          ) : (
            <TransactionRow txn={item.txn} shell={shell} />
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="No transactions yet"
            description="Fund your wallet or finish a job, and the money shows up here."
          />
        }
      />
    </ScreenView>
  );
}

/** Each live job's escrow, under the face of the person it is held for. */
function HeldInEscrow({ shell }: { shell: 'user' | 'provider' }) {
  // Both hooks always run (rules of hooks); each is disabled outside its shell's data.
  const mine = useInfiniteList(useMyJobs('active')).items as Job[];
  const hired = useInfiniteList(useProviderJobs('active')).items as Job[];
  const jobs = (shell === 'user' ? mine : hired).slice(0, 3);
  if (!jobs.length) return null;
  return (
    <View style={{ gap: Spacing.two }}>
      {jobs.map((j) => (
        <EscrowBlock key={j.id} job={j} shell={shell} />
      ))}
    </View>
  );
}

function EscrowBlock({ job, shell }: { job: Job; shell: 'user' | 'provider' }) {
  const theme = useTheme();
  const router = useRouter();
  const { data: escrow } = useEscrow(job.id);
  const { data: provider } = useProvider(shell === 'user' ? (job.hired_provider_id ?? '') : '');
  if (!escrow || escrow.status === 'pending') return null;
  const { held, released } = escrowAmounts(escrow);
  const who = shell === 'user' ? provider?.name : null;

  return (
    <Pressable
      onPress={() =>
        router.push(shell === 'user' ? routes.jobDetail(job.id) : routes.providerJobDetail(job.id))
      }
      style={[styles.escrow, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.escrowHead}>
          {provider ? (
            <Image
              source={provider.avatar_url ?? providerImageFallback(provider)}
              style={styles.escrowPhoto}
              contentFit="cover"
              contentPosition="top"
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[Type.title, styles.num, { color: theme.text }]}>
              {formatMoney(held)} in escrow
            </Text>
            <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
              {who ? `With ${who} · ` : ''}
              {job.title}
            </Text>
          </View>
        </View>
        <EscrowTape escrow={escrow} size="inline" labelled={false} />
        {released > 0 ? (
          <Text style={[Type.caption, { color: theme.textSecondary }]}>
            {formatMoney(released)} released so far
          </Text>
        ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  header: { gap: Spacing.threeHalf, paddingBottom: Spacing.two },
  kobo: { fontSize: 24, letterSpacing: -0.4 },
  actions: { flexDirection: 'row', gap: Spacing.twoHalf },
  escrow: { borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.three, gap: Spacing.twoHalf },
  escrowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf },
  escrowPhoto: { width: 40, height: 40, borderRadius: 20 },
  num: { fontVariant: ['tabular-nums'] },
  month: { marginTop: Spacing.five, marginBottom: Spacing.one },
});

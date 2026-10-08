import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuoteCard } from '@/components/quotes/quote-card';
import {
  Button,
  ConfirmModal,
  EmptyState,
  formatMoney,
  GlassButton,
  GlobalLoader,
  ScreenView,
  SuccessModal,
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Spacing, Type } from '@/constants/theme';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';
import { useStartConversation } from '@/queries/use-chat';
import { useJob } from '@/queries/use-jobs';
import { useApproveQuote, useJobQuotes, useRejectQuote } from '@/queries/use-quotes';
import { useEscrow, useFundEscrow, useWallet } from '@/queries/use-wallet';
import type { QuoteWithProvider } from '@/services/quotes';

/**
 * Every quote on a job, cheapest first. Tap one to open it in place — its
 * lines, the provider's note — and accept or decline right there. Nothing on
 * this screen sends you anywhere else to decide.
 */
export default function JobQuotes() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useContentInset();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job } = useJob(jobId);
  const { data: quotes, isLoading, refetch, isRefetching } = useJobQuotes(jobId);
  const { data: escrow } = useEscrow(jobId);
  const { data: wallet } = useWallet();
  const approve = useApproveQuote(jobId);
  const reject = useRejectQuote(jobId);
  const fund = useFundEscrow(jobId);
  const startChat = useStartConversation();

  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const [declining, setDeclining] = useState<QuoteWithProvider | null>(null);
  const [paying, setPaying] = useState<QuoteWithProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hired, setHired] = useState<{ name: string; amount: number } | null>(null);

  // Accepted on top, declined last, cheapest first in between.
  const sorted = useMemo(() => {
    const rank = (q: QuoteWithProvider) => (q.status === 'approved' ? 0 : q.status === 'rejected' ? 2 : 1);
    return [...(quotes ?? [])].sort((a, b) => rank(a) - rank(b) || a.total - b.total);
  }, [quotes]);

  const accepted = sorted.find((q) => q.status === 'approved');
  const funded = Boolean(escrow) && escrow!.status !== 'pending';
  // Until the client taps, the accepted quote (or the cheapest) is open.
  const open = openId === undefined ? (accepted ?? sorted[0])?.id ?? null : openId;
  const first = (q: QuoteWithProvider) => q.provider?.name?.trim().split(' ')[0] ?? 'this provider';
  const live = sorted.filter((q) => q.status !== 'rejected').length;

  async function accept(q: QuoteWithProvider) {
    setError(null);
    try {
      await approve.mutateAsync(q);
      setPaying(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept the quote.');
    }
  }

  async function payIntoEscrow() {
    if (!paying) return;
    setError(null);
    try {
      await fund.mutateAsync();
      setHired({ name: paying.provider?.name ?? 'The provider', amount: paying.total });
      setPaying(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The payment did not go through.');
    }
  }

  async function message(q: QuoteWithProvider) {
    const convo = await startChat.mutateAsync({ providerId: q.provider_id, jobId });
    router.push(routes.chatThread('user', convo.id));
  }

  /** The decision, inside the open quote. */
  function decision(q: QuoteWithProvider) {
    if (q.status === 'rejected') return null;
    const msg = (
      <Pressable hitSlop={8} onPress={() => message(q)} disabled={startChat.isPending} style={styles.msg}>
        <Text style={[Type.bodyMedium, styles.link, { color: theme.text }]}>Message {first(q)}</Text>
      </Pressable>
    );
    if (q.status === 'approved') {
      return (
        <View style={styles.actions}>
          {funded ? (
            <Button title="Go to the job" variant="secondary" style={{ backgroundColor: theme.background }} onPress={() => router.push(routes.jobDetail(jobId))} />
          ) : (
            <Button title={`Pay ${formatMoney(q.total)} into escrow`} size="lg" onPress={() => setPaying(q)} />
          )}
          {msg}
        </View>
      );
    }
    if (accepted) {
      // Another quote is already accepted; this one can only be discussed.
      return <View style={styles.actions}>{msg}</View>;
    }
    return (
      <View style={styles.actions}>
        <View style={styles.row}>
          <Button
            title="Decline"
            variant="secondary"
            style={{ flex: 1, backgroundColor: theme.background }}
            disabled={approve.isPending}
            onPress={() => setDeclining(q)}
          />
          <Button
            title={`Accept · ${formatMoney(q.total)}`}
            style={{ flex: 1.6 }}
            loading={approve.isPending && approve.variables?.id === q.id}
            onPress={() => accept(q)}
          />
        </View>
        {msg}
      </View>
    );
  }

  const walletBalance = wallet?.balance ?? 0;
  const amount = paying?.total ?? 0;
  const enough = walletBalance >= amount;

  return (
    <ScreenView>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.one }]}>
        <GlassButton
          icon="chevron-back"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(routes.jobDetail(jobId)))}
        />
      </View>

      {isLoading ? (
        <GlobalLoader backgroundColor="transparent" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Layout.gutter, paddingBottom: bottom, gap: Spacing.twoHalf }}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>Quotes for</Text>
              <Text style={[Type.serifTitle, { color: theme.text }]}>{job?.title ?? ' '}</Text>
              <Text style={[Type.body, { color: theme.textSecondary }]}>
                {live} {live === 1 ? 'quote' : 'quotes'}
                {job?.budget != null ? ` · your budget ${formatMoney(job.budget)}` : ''} · cheapest first
              </Text>
              {error ? (
                <Text selectable style={[Type.callout, { color: theme.danger }]}>
                  {error}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <QuoteCard quote={item} expanded={open === item.id} onToggle={() => setOpenId(open === item.id ? null : item.id)}>
              {decision(item)}
            </QuoteCard>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No quotes yet"
              description="When providers quote on your job, they show here."
            />
          }
        />
      )}

      <ConfirmModal
        visible={Boolean(declining)}
        onCancel={() => setDeclining(null)}
        onConfirm={() => {
          if (declining) reject.mutate(declining.id);
          setDeclining(null);
        }}
        icon="close"
        tone="danger"
        title={`Decline ${declining ? first(declining) : ''}’s quote?`}
        message="They’ll be told you went another way. This can’t be undone."
        confirmLabel="Decline"
        loading={reject.isPending}
      />

      {/* Pay into escrow to confirm the hire. */}
      <Modal visible={Boolean(paying)} transparent animationType="slide" onRequestClose={() => setPaying(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaying(null)} />
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.four }]}>
            <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
            <View style={{ gap: Spacing.one }}>
              <Text style={[Type.serifTitle, { color: theme.text }]}>Pay {formatMoney(amount)} into escrow</Text>
              <Text style={[Type.callout, { color: theme.textSecondary }]}>
                It confirms {paying?.provider?.name ?? 'the provider'} for the job. The money stays held until you
                release each stage.
              </Text>
            </View>
            <View>
              <SheetRow label="Into escrow" value={formatMoney(amount)} bold />
              <SheetRow label="Your wallet" value={formatMoney(walletBalance)} />
            </View>
            {!enough ? (
              <Text style={[Type.callout, { color: theme.danger }]}>
                You’re {formatMoney(amount - walletBalance)} short. Fund your wallet first.
              </Text>
            ) : null}
            {enough ? (
              <Button title={`Pay ${formatMoney(amount)}`} size="lg" loading={fund.isPending} onPress={payIntoEscrow} />
            ) : (
              <Button
                title="Fund wallet"
                size="lg"
                icon="add"
                onPress={() => {
                  setPaying(null);
                  router.push(routes.walletFund('user'));
                }}
              />
            )}
            <Button title="Not now" variant="ghost" onPress={() => setPaying(null)} />
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={Boolean(hired)}
        onClose={() => {
          setHired(null);
          router.push(routes.jobDetail(jobId));
        }}
        title="Provider hired"
        message={`${hired?.name ?? 'The provider'} is hired and your payment is held in escrow. Work can start now.`}
        amount={hired?.amount}
        actionLabel="Go to job"
      />
    </ScreenView>
  );
}

function SheetRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.sheetRow, { borderBottomColor: theme.border }]}>
      <Text style={[bold ? Type.bodyMedium : Type.body, { color: bold ? theme.text : theme.textSecondary }]}>{label}</Text>
      <Text style={[bold ? Type.bodyMedium : Type.body, styles.num, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  header: { gap: Spacing.two, paddingBottom: Spacing.three },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two },
  msg: { alignSelf: 'center', paddingVertical: Spacing.one },
  link: { textDecorationLine: 'underline' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 18, 32, 0.5)' },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.twoHalf,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { fontVariant: ['tabular-nums'] },
});

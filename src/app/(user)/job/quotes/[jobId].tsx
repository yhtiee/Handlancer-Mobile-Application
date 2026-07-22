import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { QuoteCard } from '@/components/quotes/quote-card';
import { Button, Card, EmptyState, formatMoney, GlobalLoader, Icon, MoneyText, ScreenView } from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { routes } from '@/lib/routes';
import { useStartConversation } from '@/queries/use-chat';
import { useApproveQuote, useJobQuotes, useRejectQuote } from '@/queries/use-quotes';
import { useFundEscrow, useWallet } from '@/queries/use-wallet';
import type { QuoteWithProvider } from '@/services/quotes';
import { useContentInset } from '@/hooks/use-insets';
import { useTheme } from '@/hooks/use-theme';

export default function JobQuotes() {
  const theme = useTheme();
  const router = useRouter();
  const bottomInset = useContentInset();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: quotes, isLoading, refetch, isRefetching } = useJobQuotes(jobId);
  const { data: wallet } = useWallet();
  const approve = useApproveQuote(jobId);
  const reject = useRejectQuote(jobId);
  const fund = useFundEscrow(jobId);
  const startChat = useStartConversation();

  const [escrowModalQuote, setEscrowModalQuote] = useState<QuoteWithProvider | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);

  const approvedQuote = quotes?.find((q) => q.status === 'approved');
  const decided = Boolean(approvedQuote);

  async function message(quote: QuoteWithProvider) {
    const convo = await startChat.mutateAsync({ providerId: quote.provider_id, jobId });
    router.push(routes.chatThread('user', convo.id));
  }

  async function handleApprove(quote: QuoteWithProvider) {
    try {
      await approve.mutateAsync(quote);
      setEscrowModalQuote(quote);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not approve quote');
    }
  }

  async function handleConfirmEscrowPayment() {
    if (!escrowModalQuote) return;
    setEscrowError(null);
    try {
      await fund.mutateAsync();
      setEscrowModalQuote(null);
      Alert.alert(
        'Provider Hired! 🎉',
        `Payment of ${formatMoney(escrowModalQuote.total)} confirmed into escrow. Work can now begin!`,
        [
          {
            text: 'Go to Job Details',
            onPress: () => router.push(routes.jobDetail(jobId)),
          },
        ],
      );
    } catch (e) {
      setEscrowError(e instanceof Error ? e.message : 'Escrow payment failed.');
    }
  }

  function renderActions(quote: QuoteWithProvider) {
    const isThisApproved = quote.status === 'approved';
    const canDecide = quote.status !== 'approved' && quote.status !== 'rejected' && !decided;

    return (
      <View style={{ gap: Spacing.two }}>
        <Button
          title="Message provider"
          variant="secondary"
          icon="chatbubble"
          disabled={startChat.isPending}
          onPress={() => message(quote)}
        />

        {isThisApproved ? (
          <Button
            title="Complete Escrow Payment & Hire"
            icon="lock-closed"
            size="lg"
            onPress={() => setEscrowModalQuote(quote)}
          />
        ) : null}

        {canDecide ? (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button
              title="Reject"
              variant="ghost"
              style={{ flex: 1 }}
              disabled={reject.isPending || approve.isPending}
              onPress={() => reject.mutate(quote.id)}
            />
            <Button
              title="Approve & Hire"
              icon="checkmark"
              style={{ flex: 1.4 }}
              loading={approve.isPending && approve.variables?.id === quote.id}
              onPress={() => handleApprove(quote)}
            />
          </View>
        ) : null}
      </View>
    );
  }

  const walletBalance = wallet?.balance ?? 0;
  const targetQuoteTotal = escrowModalQuote?.total ?? 0;
  const isBalanceSufficient = walletBalance >= targetQuoteTotal;

  return (
    <ScreenView>
      <Stack.Screen options={{ title: 'Quotes' }} />
      {isLoading ? (
        <GlobalLoader backgroundColor="transparent" />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Layout.gutter,
            paddingTop: Layout.headerGap,
            paddingBottom: bottomInset,
            gap: Layout.listGap,
          }}
          renderItem={({ item }) => <QuoteCard quote={item}>{renderActions(item)}</QuoteCard>}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No quotes yet"
              description="When providers apply to your job, their quotes show up here for review."
            />
          }
        />
      )}

      {/* Escrow Funding & Auto-Hire Modal */}
      <Modal
        visible={Boolean(escrowModalQuote)}
        transparent
        animationType="slide"
        onRequestClose={() => setEscrowModalQuote(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setEscrowModalQuote(null)} />

          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.iconBadge, { backgroundColor: theme.tint + '1F' }]}>
                <Icon name="lock-closed" size={24} color={theme.tint} />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Escrow Payment Required
              </Text>
              <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
                Fund escrow to confirm hiring {escrowModalQuote?.provider?.name ?? 'the provider'}.
              </Text>
            </View>

            <Card style={styles.detailsCard}>
              <Row label="Materials Subtotal" amount={escrowModalQuote?.materials_cost ?? 0} />
              <Row label="Labour Subtotal" amount={escrowModalQuote?.labor_cost ?? 0} />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Row label="Total Escrow Amount" amount={targetQuoteTotal} isBold />
            </Card>

            <View style={[styles.walletBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.walletRow}>
                <Text style={[styles.walletLabel, { color: theme.textSecondary }]}>
                  Your Available Wallet Balance:
                </Text>
                <MoneyText amount={walletBalance} style={{ fontSize: 16, fontWeight: '700' }} />
              </View>

              {!isBalanceSufficient ? (
                <Text style={[styles.balanceWarning, { color: theme.danger }]}>
                  Short by {formatMoney(targetQuoteTotal - walletBalance)}. Fund your wallet to complete hiring.
                </Text>
              ) : (
                <Text style={[styles.balanceOk, { color: theme.success }]}>
                  ✓ Sufficient balance for instant hiring confirmation.
                </Text>
              )}
            </View>

            {escrowError ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>{escrowError}</Text>
            ) : null}

            <View style={styles.sheetActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEscrowModalQuote(null)}
                style={{ flex: 1 }}
              />
              {isBalanceSufficient ? (
                <Button
                  title={`Pay ${formatMoney(targetQuoteTotal)} & Hire`}
                  icon="checkmark-circle"
                  loading={fund.isPending}
                  onPress={handleConfirmEscrowPayment}
                  style={{ flex: 2 }}
                />
              ) : (
                <Button
                  title="Fund Wallet & Pay"
                  icon="wallet-outline"
                  onPress={() => {
                    setEscrowModalQuote(null);
                    router.push(routes.walletFund('user'));
                  }}
                  style={{ flex: 2 }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenView>
  );
}

function Row({ label, amount, isBold }: { label: string; amount: number; isBold?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.rowLabel,
          { color: isBold ? theme.text : theme.textSecondary, fontWeight: isBold ? '700' : '400' },
        ]}>
        {label}
      </Text>
      <MoneyText amount={amount} style={{ fontSize: isBold ? 16 : 14, fontWeight: isBold ? '700' : '500' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  detailsCard: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  walletBox: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.one,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  balanceWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  balanceOk: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});

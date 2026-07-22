import { StyleSheet, Text, View } from 'react-native';

import { Avatar, MoneyText, QuoteStatusPill, RatingStars } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import type { QuoteWithProvider } from '@/services/quotes';
import { useTheme } from '@/hooks/use-theme';

/** A quote shown to the job owner during review, with the provider's identity and itemized breakdown. */
export function QuoteCard({
  quote,
  children,
}: {
  quote: QuoteWithProvider;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const p = quote.provider;

  const lineItems = quote.line_items ?? [];
  const materialItems = lineItems.filter((i) => i.type === 'material');
  const laborItems = lineItems.filter((i) => i.type === 'labor');

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <Avatar uri={p?.avatar_url} name={p?.name} size={40} />
        <View style={styles.who}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
            {p?.name ?? 'Provider'}
          </Text>
          <RatingStars rating={p?.rating ?? 0} size={12} />
        </View>
        <QuoteStatusPill status={quote.status} />
      </View>

      <View style={styles.breakdown}>
        {/* Materials Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Materials</Text>
          {materialItems.length > 0 ? (
            <View style={styles.itemList}>
              {materialItems.map((item, idx) => (
                <View key={`mat-${idx}`} style={styles.itemRow}>
                  <Text numberOfLines={1} style={[styles.itemLabel, { color: theme.textSecondary }]}>
                    • {item.label || 'Material'}
                  </Text>
                  <MoneyText amount={item.amount} style={{ fontSize: 13, fontWeight: '500' }} />
                </View>
              ))}
            </View>
          ) : null}
          <Line label="Materials Subtotal" amount={quote.materials_cost} isSubtotal />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Labour Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Labour</Text>
          {laborItems.length > 0 ? (
            <View style={styles.itemList}>
              {laborItems.map((item, idx) => (
                <View key={`lab-${idx}`} style={styles.itemRow}>
                  <Text numberOfLines={1} style={[styles.itemLabel, { color: theme.textSecondary }]}>
                    • {item.label || 'Labour'}
                  </Text>
                  <MoneyText amount={item.amount} style={{ fontSize: 13, fontWeight: '500' }} />
                </View>
              ))}
            </View>
          ) : null}
          <Line label="Labour Subtotal" amount={quote.labor_cost} isSubtotal />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>Total Quote Amount</Text>
          <MoneyText amount={quote.total} style={{ fontSize: 17 }} />
        </View>
      </View>

      {quote.message ? (
        <Text selectable style={[styles.message, { color: theme.textSecondary }]}>
          {quote.message}
        </Text>
      ) : null}

      <Text style={[styles.time, { color: theme.textSecondary }]}>{timeAgo(quote.created_at)}</Text>

      {children}
    </View>
  );
}

function Line({ label, amount, isSubtotal }: { label: string; amount: number; isSubtotal?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.line}>
      <Text
        style={[
          styles.lineLabel,
          { color: isSubtotal ? theme.text : theme.textSecondary, fontWeight: isSubtotal ? '600' : '400' },
        ]}>
        {label}
      </Text>
      <MoneyText amount={amount} style={{ fontSize: 14, fontWeight: isSubtotal ? '600' : '500' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  who: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  breakdown: { gap: Spacing.two + 2 },
  section: { gap: Spacing.one + 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemList: { gap: Spacing.one, paddingLeft: Spacing.one },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: 13, paddingRight: Spacing.two },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  lineLabel: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12 },
});

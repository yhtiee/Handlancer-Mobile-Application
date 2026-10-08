import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney, Icon } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/date';
import { providerImageFallback } from '@/lib/provider-images';
import type { QuoteLineItem } from '@/services/database.types';
import type { QuoteWithProvider } from '@/services/quotes';

/**
 * One quote in the compare list. Collapsed: who, rating, price. Tap to expand
 * in place: every line, the provider's note, and the decision — so a client
 * compares, accepts or declines without leaving the list.
 */
export function QuoteCard({
  quote,
  expanded,
  onToggle,
  children,
}: {
  quote: QuoteWithProvider;
  expanded: boolean;
  onToggle: () => void;
  /** The decision buttons, shown when expanded. */
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const p = quote.provider;
  const declined = quote.status === 'rejected';
  const accepted = quote.status === 'approved';
  const rating = (p?.rating ?? 0) > 0 ? `${p!.rating.toFixed(1)} rating` : 'New';
  const labour = quote.line_items.filter((i) => i.type === 'labor');
  const materials = quote.line_items.filter((i) => i.type === 'material');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: accepted ? theme.text : 'transparent',
          opacity: declined ? 0.6 : 1,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${p?.name ?? 'Provider'}, ${formatMoney(quote.total)}`}
        onPress={onToggle}
        style={styles.head}>
        {p ? (
          <Image
            source={p.avatar_url ?? providerImageFallback(p)}
            style={styles.photo}
            contentFit="cover"
            contentPosition="top"
          />
        ) : (
          <View style={[styles.photo, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={[Type.title, { color: theme.text }]}>
            {p?.name ?? 'Provider'}
          </Text>
          <Text numberOfLines={1} style={[Type.caption, { color: theme.textSecondary }]}>
            {accepted ? 'Accepted' : declined ? 'Declined' : `${rating} · ${timeAgo(quote.created_at)}`}
          </Text>
        </View>
        <Text style={[styles.price, { color: theme.text }, declined && styles.struck]}>
          {formatMoney(quote.total)}
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Lines title="Labour" items={labour} total={quote.labor_cost} />
          <Lines title="Materials" items={materials} total={quote.materials_cost} />

          {quote.message ? (
            <Text selectable style={[styles.note, { color: theme.text }]}>
              “{quote.message}”
            </Text>
          ) : null}

          {children}
        </View>
      ) : null}
    </View>
  );
}

function Lines({ title, items, total }: { title: string; items: QuoteLineItem[]; total: number }) {
  const theme = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: Spacing.one }}>
      <View style={styles.lineHead}>
        <Text style={[Type.bodyMedium, { color: theme.text }]}>{title}</Text>
        <Text style={[Type.bodyMedium, styles.num, { color: theme.text }]}>{formatMoney(total)}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.line}>
          <Text style={[Type.caption, { color: theme.textSecondary, flex: 1 }]}>{item.label}</Text>
          <Text style={[Type.caption, styles.num, { color: theme.textSecondary }]}>{formatMoney(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1.5, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.twoHalf, padding: Spacing.three },
  photo: { width: 48, height: 48, borderRadius: 24 },
  price: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between' },
  line: { flexDirection: 'row', gap: Spacing.two },
  num: { fontVariant: ['tabular-nums'] },
  note: { ...Type.serifTitle, fontSize: 17, lineHeight: 24, fontStyle: 'italic' },
});

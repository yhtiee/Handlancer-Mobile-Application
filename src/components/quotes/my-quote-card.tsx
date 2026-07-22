import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon, MoneyText, QuoteStatusPill } from '@/components/ui';
import { categoryIcon } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { QuoteWithJob } from '@/services/quotes';
import { useTheme } from '@/hooks/use-theme';

export function MyQuoteCard({ quote }: { quote: QuoteWithJob }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(routes.providerQuote(quote.id))}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.tint + '22' }]}>
        <Icon name={categoryIcon(quote.job?.category)} size={22} color={theme.tint} />
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {quote.job?.title ?? 'Job'}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {timeAgo(quote.created_at)}
        </Text>
      </View>
      <View style={styles.right}>
        <MoneyText amount={quote.total} compact style={{ fontSize: 15 }} />
        <QuoteStatusPill status={quote.status} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 22, height: 22 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: Spacing.one },
});

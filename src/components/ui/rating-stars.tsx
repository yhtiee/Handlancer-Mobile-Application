import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function RatingStars({
  rating,
  size = 14,
  showValue = true,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  const theme = useTheme();
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => {
        const symbol =
          i < full ? 'star' : i === full && hasHalf ? 'star-half' : 'star-outline';
        return <Icon key={i} name={symbol} size={size} color={theme.warning} />;
      })}
      {showValue ? (
        <Text style={[styles.value, { color: theme.textSecondary, fontSize: size }]}>
          {rating.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { marginLeft: Spacing.one, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

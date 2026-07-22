import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Compact large-number formatter: 1_400_000 → "1.4M". */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function formatMoney(amount: number, currency = 'NGN', compact = false): string {
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : `${currency} `;
  if (compact) return `${symbol}${formatCompact(amount)}`;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export type MoneyTextProps = TextProps & {
  amount: number;
  currency?: string;
  compact?: boolean;
};

export function MoneyText({
  amount,
  currency = 'NGN',
  compact = false,
  style,
  ...rest
}: MoneyTextProps) {
  const theme = useTheme();
  return (
    <Text
      selectable
      style={[{ color: theme.text, fontVariant: ['tabular-nums'], fontWeight: '700' }, style]}
      {...rest}>
      {formatMoney(amount, currency, compact)}
    </Text>
  );
}

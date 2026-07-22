import { ActivityIndicator, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tail spinner for a paginated list, shown only while the next page loads. */
export function ListFooter({ loading }: { loading: boolean }) {
  const theme = useTheme();
  if (!loading) return null;
  return (
    <View style={{ paddingVertical: Spacing.four }}>
      <ActivityIndicator color={theme.tint} />
    </View>
  );
}

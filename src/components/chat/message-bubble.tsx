import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import type { Message } from '@/services/database.types';
import { useTheme } from '@/hooks/use-theme';

export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const theme = useTheme();
  const time = new Date(message.created_at).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: theme.tint, borderBottomRightRadius: Radius.sm }
            : { backgroundColor: theme.backgroundElement, borderBottomLeftRadius: Radius.sm },
        ]}>
        <Text selectable style={[styles.body, { color: mine ? theme.tintText : theme.text }]}>
          {message.body}
        </Text>
      </View>
      <Text style={[styles.time, { color: theme.textSecondary }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', gap: 2, marginVertical: 2 },
  wrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  body: { fontSize: 16, lineHeight: 21 },
  time: { fontSize: 11, paddingHorizontal: Spacing.one },
});

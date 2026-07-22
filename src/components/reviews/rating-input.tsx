import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function RatingInput({
  value,
  onChange,
  size = 40,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          hitSlop={6}
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onChange(n);
          }}>
          <Icon
            name={n <= value ? 'star' : 'star-outline'}
            size={size}
            color={n <= value ? theme.warning : theme.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'center' },
});

import { useRouter } from 'expo-router';
import { Pressable, TouchableOpacity } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** Back/close affordance for stack-root screens reached cross-navigator. */
export function HeaderClose({ icon = 'chevron-back' }: { icon?: IconName }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <TouchableOpacity
      hitSlop={12}
      accessibilityRole="button"
      onPress={() => {
        // Avoid the "GO_BACK was not handled" warning when there's no history
        // (e.g. opened via a deep link) by falling back to the app root.
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}>
      <Icon name={icon} size={24} color={theme.tint} />
    </TouchableOpacity>
  );
}

/** Single trailing header action (icon button). */
export function HeaderAction({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity hitSlop={12} onPress={onPress} accessibilityRole="button">
      <Icon name={icon} size={22} color={theme.tint} />
    </TouchableOpacity>
  );
}

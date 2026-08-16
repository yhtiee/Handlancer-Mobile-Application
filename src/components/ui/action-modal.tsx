import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { MoneyText } from '@/components/ui/money-text';
import { Elevation, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'default' | 'danger' | 'success';

/** Bottom sheet shell. Both modals share it so their motion and metrics match. */
function Sheet({
  visible,
  onDismiss,
  dismissable = true,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  dismissable?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        {/* Tapping the scrim is the escape hatch on Android, where there is no
            swipe-to-dismiss. Disabled while an action is in flight. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onDismiss : undefined}
        />
        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.7)}
          style={[
            styles.sheet,
            { backgroundColor: theme.background, boxShadow: Elevation.lg },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function toneColor(tone: Tone, theme: ReturnType<typeof useTheme>) {
  if (tone === 'danger') return theme.danger;
  if (tone === 'success') return theme.success;
  return theme.tint;
}

/** Circular icon badge with a soft halo in the tone colour. */
function Badge({ icon, tone, big }: { icon: IconName; tone: Tone; big?: boolean }) {
  const theme = useTheme();
  const color = toneColor(tone, theme);
  const size = big ? 76 : 56;
  return (
    <Animated.View
      entering={big ? ZoomIn.springify().damping(12).mass(0.6) : undefined}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '1F',
          borderColor: color + '33',
        },
      ]}>
      <Icon name={icon} size={big ? 36 : 26} color={color} />
    </Animated.View>
  );
}

export type ConfirmDetail = { label: string; value: React.ReactNode };

/**
 * Replaces `Alert.alert` for destructive or money-moving actions. Unlike the
 * native alert this can show the amounts involved, which is the whole point when
 * the user is about to release funds they cannot claw back.
 */
export function ConfirmModal({
  visible,
  onCancel,
  onConfirm,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon = 'help-circle',
  tone = 'default',
  loading = false,
  error,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  details?: ConfirmDetail[];
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: IconName;
  tone?: Tone;
  loading?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();

  return (
    <Sheet visible={visible} onDismiss={onCancel} dismissable={!loading}>
      <View style={styles.header}>
        <Badge icon={icon} tone={tone} />
        <Text style={[Type.h3, styles.title, { color: theme.text }]}>{title}</Text>
        {message ? (
          <Text style={[Type.body, styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
        ) : null}
      </View>

      {details?.length ? (
        <View style={[styles.details, { backgroundColor: theme.backgroundElement }]}>
          {details.map((d, i) => (
            <View
              key={d.label}
              style={[
                styles.detailRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
              ]}>
              <Text style={[Type.callout, { color: theme.textSecondary }]}>{d.label}</Text>
              {d.value}
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text selectable style={[Type.callout, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          title={cancelLabel}
          variant="ghost"
          disabled={loading}
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          title={confirmLabel}
          size="lg"
          variant={tone === 'danger' ? 'destructive' : 'primary'}
          loading={loading}
          onPress={onConfirm}
          style={{ flex: 1.6 }}
        />
      </View>
    </Sheet>
  );
}

/**
 * The celebratory end of a flow — the moment worth making memorable, rather than
 * a system alert the user dismisses without reading.
 */
export function SuccessModal({
  visible,
  onClose,
  title,
  message,
  amount,
  actionLabel = 'Done',
  icon = 'checkmark-circle',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  amount?: number;
  actionLabel?: string;
  icon?: IconName;
}) {
  const theme = useTheme();

  return (
    <Sheet visible={visible} onDismiss={onClose}>
      <View style={styles.header}>
        <Badge icon={icon} tone="success" big />
        <Text style={[Type.h2, styles.title, { color: theme.text }]}>{title}</Text>
        {amount != null ? (
          <MoneyText
            amount={amount}
            style={[Type.display, { color: theme.success }]}
          />
        ) : null}
        {message ? (
          <Text style={[Type.body, styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
        ) : null}
      </View>

      <Button title={actionLabel} size="lg" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 11, 15, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  header: { alignItems: 'center', gap: Spacing.two },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center' },
  details: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.twoHalf,
  },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});

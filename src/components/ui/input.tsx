import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, style, onFocus, onBlur, secureTextEntry, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isPassword = !!secureTextEntry;
  const borderColor = error ? theme.danger : focused ? theme.tint : theme.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <View style={styles.field}>
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword && hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor },
            isPassword && styles.inputWithToggle,
            style,
          ]}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((v) => !v)}
            style={styles.toggle}>
            <Icon
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text selectable style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one, alignSelf: 'stretch' },
  label: { fontSize: 13, fontWeight: '600' },
  field: { position: 'relative', justifyContent: 'center' },
  input: {
    height: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    fontSize: 16,
  },
  inputWithToggle: { paddingRight: 48 },
  toggle: {
    position: 'absolute',
    right: Spacing.one,
    height: '100%',
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 13 },
});

import { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { SearchField } from '@/components/ui/search-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DropdownOption {
  id: string;
  label: string;
  icon?: IconName;
}

interface SearchableDropdownProps {
  label?: string;
  title?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  value: string | null;
  options: readonly DropdownOption[];
  onSelect: (id: string) => void;
  error?: string | null;
}

export function SearchableDropdown({
  label,
  title,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  value,
  options,
  onSelect,
  error,
}: SearchableDropdownProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const triggerBorderColor = error
    ? theme.danger
    : visible
    ? theme.tint
    : theme.border;

  return (
    <View style={styles.triggerWrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: triggerBorderColor,
          },
        ]}>
        <View style={styles.triggerContent}>
          {selectedOption ? (
            <>
              {selectedOption.icon ? (
                <Icon
                  name={selectedOption.icon}
                  size={20}
                  color={theme.tint}
                />
              ) : null}
              <Text style={[styles.triggerText, { color: theme.text }]}>
                {selectedOption.label}
              </Text>
            </>
          ) : (
            <Text style={[styles.triggerText, { color: theme.textSecondary }]}>
              {placeholder}
            </Text>
          )}
        </View>
        <Icon name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setVisible(false);
          setSearchQuery('');
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              setVisible(false);
              setSearchQuery('');
            }}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            <View style={styles.header}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {title || label || 'Select Option'}
              </Text>
              <Pressable
                onPress={() => {
                  setVisible(false);
                  setSearchQuery('');
                }}
                hitSlop={12}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <SearchField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
              />
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.list,
                { paddingBottom: Spacing.four },
              ]}
              renderItem={({ item }) => {
                const isSelected = value === item.id;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.id);
                      setVisible(false);
                      setSearchQuery('');
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: isSelected
                          ? theme.backgroundSelected
                          : pressed
                          ? theme.backgroundElement
                          : 'transparent',
                      },
                    ]}>
                    <View style={styles.optionLeft}>
                      {item.icon ? (
                        <Icon
                          name={item.icon}
                          size={20}
                          color={isSelected ? theme.tint : theme.textSecondary}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: theme.text,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Icon name="checkmark" size={20} color={theme.tint} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerWrap: {
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  trigger: {
    height: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  triggerText: {
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    marginTop: Spacing.one,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    minHeight: '45%',
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    marginVertical: Spacing.half,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
  },
  optionLabel: {
    fontSize: 16,
  },
});

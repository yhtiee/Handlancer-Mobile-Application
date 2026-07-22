import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DEFAULT_SUGGESTIONS = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'AC Repair',
  'Roofing',
  'Tiling',
  'Cleaning',
  'Generator Repair',
  'Welding',
];

type SkillsInputProps = {
  label?: string;
  skills: string[];
  onChangeSkills: (skills: string[]) => void;
  suggestions?: string[];
};

export function SkillsInput({
  label = 'Services & Skills',
  skills = [],
  onChangeSkills,
  suggestions = DEFAULT_SUGGESTIONS,
}: SkillsInputProps) {
  const theme = useTheme();
  const [inputText, setInputText] = useState('');
  const [focused, setFocused] = useState(false);

  function addSkill(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Check duplicate case-insensitively
    const exists = skills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      onChangeSkills([...skills, trimmed]);
    }
    setInputText('');
  }

  function removeSkill(indexToRemove: number) {
    onChangeSkills(skills.filter((_, idx) => idx !== indexToRemove));
  }

  const unusedSuggestions = suggestions.filter(
    (sug) => !skills.some((s) => s.toLowerCase() === sug.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>

      {/* Active Skills Tag List */}
      {skills.length > 0 ? (
        <View style={styles.chipsRow}>
          {skills.map((skill, index) => (
            <View
              key={`${skill}-${index}`}
              style={[
                styles.skillChip,
                { backgroundColor: theme.tint + '1F', borderColor: theme.tint + '40' },
              ]}>
              <Text style={[styles.skillChipText, { color: theme.tint }]}>{skill}</Text>
              <Pressable
                hitSlop={6}
                onPress={() => removeSkill(index)}
                style={styles.removeBtn}>
                <Icon name="close" size={13} color={theme.tint} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Input Row for adding new skill */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: focused ? theme.tint : theme.border,
          },
        ]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => addSkill(inputText)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Type a skill and tap Add..."
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable
          onPress={() => addSkill(inputText)}
          disabled={!inputText.trim()}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: inputText.trim() ? theme.tint : theme.border,
              opacity: pressed || !inputText.trim() ? 0.7 : 1,
            },
          ]}>
          <Icon name="add" size={16} color={inputText.trim() ? theme.tintText : theme.textSecondary} />
          <Text
            style={[
              styles.addBtnText,
              { color: inputText.trim() ? theme.tintText : theme.textSecondary },
            ]}>
            Add
          </Text>
        </Pressable>
      </View>

      {/* Quick Add Suggestions */}
      {unusedSuggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestLabel, { color: theme.textSecondary }]}>
            Popular Suggestions (tap to add):
          </Text>
          <View style={styles.chipsRow}>
            {unusedSuggestions.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => addSkill(sug)}
                style={({ pressed }) => [
                  styles.suggestChip,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Icon name="add" size={12} color={theme.textSecondary} />
                <Text style={[styles.suggestChipText, { color: theme.textSecondary }]}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingRight: Spacing.one,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsContainer: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  suggestLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  suggestChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

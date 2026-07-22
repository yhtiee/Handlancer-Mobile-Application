import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { Button, Icon, Input, SearchableDropdown } from '@/components/ui';
import { Categories, type CategoryId } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import { useCreateJob } from '@/queries/use-jobs';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { uploadJobMedia, type MediaAsset } from '@/services/media';

export default function PostJob() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createJob = useCreateJob();
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const isDirect = !!provider;
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function addMedia(source: 'library' | 'camera') {
    setMediaError(null);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setMediaError('Permission needed to add media.');
        return;
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images', 'videos'],
        quality: 0.7,
        videoMaxDuration: 60,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (result.canceled || !result.assets?.length) return;

      const newAssets: MediaAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        kind: a.type === 'video' ? 'video' : 'photo',
        mimeType: a.mimeType,
      }));

      setSelectedMedia((prev) => [...prev, ...newAssets]);
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : 'Failed to select media.');
    }
  }

  async function submit(publish: boolean) {
    setError(null);
    setTitleError(null);
    setCategoryError(null);

    let hasError = false;
    if (!title.trim()) {
      setTitleError('Give your job a title');
      hasError = true;
    }
    if (!category) {
      setCategoryError('Pick a category');
      hasError = true;
    }
    if (hasError) return;

    try {
      setUploading(true);
      const job = await createJob.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        category,
        budget: budget ? Number(budget.replace(/[^0-9.]/g, '')) : null,
        location: location.trim() || null,
        publish,
        directProviderId: provider ?? null,
      });

      // Upload selected media if any
      if (selectedMedia.length > 0) {
        for (const asset of selectedMedia) {
          await uploadJobMedia({
            providerId: session!.user.id,
            jobId: job.id,
            phase: 'before',
            asset,
          });
        }
      }

      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post the job.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: isDirect ? 'Invite to a Job' : 'Post a Job' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <ScrollView
          keyboardDismissMode="interactive"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Input
          label="Title"
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            if (val.trim()) setTitleError(null);
          }}
          error={titleError}
          placeholder="e.g. Fix leaking kitchen sink"
          autoFocus
        />

        <SearchableDropdown
          label="Category"
          placeholder="Select a category"
          searchPlaceholder="Search categories..."
          value={category}
          options={Categories}
          onSelect={(id) => {
            setCategory(id as CategoryId);
            setCategoryError(null);
            setError(null);
          }}
          error={categoryError}
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the work, materials and any details providers should know."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[
              styles.textArea,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />
        </View>

        <Input
          label="Budget (optional)"
          value={budget}
          onChangeText={setBudget}
          placeholder="₦ 50,000"
          keyboardType="number-pad"
        />

        <Input
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Lekki, Lagos"
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Photos & Videos (Optional)</Text>
          <View style={styles.mediaRow}>
            {selectedMedia.map((asset, index) => (
              <View key={index} style={[styles.mediaThumbWrap, { backgroundColor: theme.backgroundSelected }]}>
                <Image source={asset.uri} style={styles.mediaThumb} contentFit="cover" />
                {asset.kind === 'video' ? (
                  <View style={styles.playOverlay}>
                    <Icon name="play" size={14} color="#fff" />
                  </View>
                ) : null}
                <Pressable
                  onPress={() => {
                    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
                  }}
                  style={[styles.removeBadge, { backgroundColor: theme.danger }]}
                  hitSlop={8}
                >
                  <Icon name="close" size={12} color="#ffffff" />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => addMedia('library')}
              onLongPress={() => addMedia('camera')}
              style={[
                styles.addTile,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            >
              <Icon name="camera-outline" size={20} color={theme.tint} />
              <Text style={[styles.addText, { color: theme.tint }]}>Add</Text>
            </Pressable>
          </View>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            Tip: tap to pick from gallery, long-press to use the camera.
          </Text>
          {mediaError ? (
            <Text style={[styles.error, { color: theme.danger }]}>
              {mediaError}
            </Text>
          ) : null}
        </View>

        {error ? (
          <Text selectable style={[styles.error, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {isDirect ? (
            <Button
              title="Send invite"
              size="lg"
              icon="send"
              loading={createJob.isPending || uploading}
              onPress={() => submit(false)}
            />
          ) : (
            <>
              <Button
                title="Post publicly"
                size="lg"
                loading={createJob.isPending || uploading}
                onPress={() => submit(true)}
              />
              <Button
                title="Save as draft"
                variant="ghost"
                disabled={createJob.isPending || uploading}
                onPress={() => submit(false)}
              />
            </>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.four },
  field: { gap: Spacing.one, alignSelf: 'stretch' },
  label: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  chipIcon: { width: 15, height: 15 },
  chipText: { fontSize: 14, fontWeight: '600' },
  textArea: {
    minHeight: 110,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: { fontSize: 14 },
  actions: { gap: Spacing.two },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  mediaThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  removeBadge: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
});

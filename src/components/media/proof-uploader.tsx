import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { MediaThumb } from '@/components/media/media-gallery';
import { MediaViewer } from '@/components/media/media-viewer';
import { Radius, Spacing } from '@/constants/theme';
import { useUploadMedia } from '@/queries/use-media';
import type { JobMedia, MediaPhase } from '@/services/database.types';
import type { MediaAsset } from '@/services/media';
import { useTheme } from '@/hooks/use-theme';

export function ProofUploader({ jobId, media }: { jobId: string; media: JobMedia[] }) {
  const theme = useTheme();
  const upload = useUploadMedia(jobId);
  const [busyPhase, setBusyPhase] = useState<MediaPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Same before-then-after order the tiles render in, so tapping the third
  // thumbnail opens the third photo rather than whatever the query returned.
  const ordered = [
    ...media.filter((m) => m.phase === 'before'),
    ...media.filter((m) => m.phase === 'after'),
  ];

  async function add(phase: MediaPhase, source: 'library' | 'camera') {
    setError(null);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Permission needed to add media.');
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

      const a = result.assets[0];
      const asset: MediaAsset = {
        uri: a.uri,
        kind: a.type === 'video' ? 'video' : 'photo',
        mimeType: a.mimeType,
      };
      setBusyPhase(phase);
      await upload.mutateAsync({ phase, asset });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusyPhase(null);
    }
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <Text style={[styles.title, { color: theme.text }]}>Proof of work</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Upload before & after photos or videos. These build your profile résumé.
      </Text>

      {(['before', 'after'] as MediaPhase[]).map((phase) => {
        const items = ordered.filter((m) => m.phase === phase);
        const busy = busyPhase === phase;
        return (
          <View key={phase} style={{ gap: Spacing.two }}>
            <Text style={[styles.phaseLabel, { color: theme.textSecondary }]}>
              {phase === 'before' ? 'Before' : 'After'}
            </Text>
            <View style={styles.row}>
              {items.map((m) => (
                <MediaThumb
                  key={m.id}
                  item={m}
                  size={84}
                  onPress={() => setViewerIndex(ordered.findIndex((x) => x.id === m.id))}
                />
              ))}
              <Pressable
                onPress={() => add(phase, 'library')}
                onLongPress={() => add(phase, 'camera')}
                disabled={busy}
                style={[styles.addTile, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                {busy ? (
                  <ActivityIndicator color={theme.tint} />
                ) : (
                  <>
                    <Icon name="add" size={20} color={theme.tint} />
                    <Text style={[styles.addText, { color: theme.tint }]}>Add</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={[styles.tip, { color: theme.textSecondary }]}>
        Tip: tap to pick from library, long-press to use the camera.
      </Text>
      {error ? (
        <Text selectable style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}

      <MediaViewer
        media={ordered}
        startIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 14, lineHeight: 20, marginTop: -Spacing.one },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  phaseLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  addTile: {
    width: 84,
    height: 84,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { fontSize: 12, fontWeight: '600' },
  tip: { fontSize: 12 },
  error: { fontSize: 14 },
});

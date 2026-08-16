import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import type { JobMedia } from '@/services/database.types';

/**
 * Full-screen viewer for job photos and videos.
 *
 * Always dark regardless of theme — a light chrome around a photo washes it out,
 * and every gallery convention users already know is dark.
 */
export function MediaViewer({
  media,
  startIndex = 0,
  visible,
  onClose,
}: {
  media: JobMedia[];
  startIndex?: number;
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible || !media.length) return null;
  return (
    <MediaViewerBody media={media} startIndex={startIndex} onClose={onClose} />
  );
}

function MediaViewerBody({
  media,
  startIndex,
  onClose,
}: {
  media: JobMedia[];
  startIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(Math.min(startIndex, media.length - 1));
  const current = media[index];

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startIndex * width, y: 0 }}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            if (next !== index) setIndex(next);
          }}>
          {media.map((item, i) => (
            <View key={item.id} style={{ width, height }}>
              {item.kind === 'video' ? (
                // Only the visible page gets a player; mounting one per item
                // would decode every video at once.
                i === index ? (
                  <VideoPage uri={item.url} />
                ) : (
                  <View style={styles.center}>
                    <Icon name="videocam" size={40} color="rgba(255,255,255,0.5)" />
                  </View>
                )
              ) : (
                <Image
                  source={item.url}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  transition={150}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Close sits opposite the thumb so it is not hit while swiping. */}
        <Animated.View entering={FadeIn} style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Icon name="close" size={22} color="#fff" />
          </Pressable>
          {media.length > 1 ? (
            <View style={styles.counter}>
              <Text style={[Type.caption, { color: '#fff' }]}>
                {index + 1} / {media.length}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {current ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.three }]}>
            <Text style={[Type.caption, { color: 'rgba(255,255,255,0.7)' }]}>
              {current.phase === 'before' ? 'Before' : 'After'}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function VideoPage({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  // No `allowsFullscreen`: it was replaced by `fullscreenOptions` in SDK 56, and
  // this view already fills the screen.
  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="contain"
      nativeControls
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

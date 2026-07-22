import { type Href, Link, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TouchableOpacity } from 'react-native';

/** Brand gradient promo banner with a call-to-action. */
export function HeroBanner({
  title,
  subtitle,
  ctaLabel,
  href,
  icon = 'construct',
  bgImage,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: Href;
  icon?: IconName;
  bgImage?: string;
}) {
  const theme = useTheme();
  const router = useRouter();
  const gradient = {
    experimental_backgroundImage: `linear-gradient(135deg, ${theme.tint} 0%, ${theme.accent} 130%)`,
  } as unknown as ViewStyle;

  return (
    <TouchableOpacity 
      style={[styles.card, !bgImage && gradient]}
      onPress={() => router.push(href)}
      >
      {bgImage ? (
        <>
          <Image source={{ uri: bgImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </>
      ) : null}
      <View style={styles.body}>
        <Text style={[Type.h3, styles.title]}>{title}</Text>
        <Text style={[Type.callout, styles.subtitle]}>{subtitle}</Text>
        <Pressable onPress={() => router.push(href)} style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[styles.ctaText, { color: theme.tint }]}>{ctaLabel}</Text>
          <Icon name="arrow-forward" size={15} color={theme.tint} />
        </Pressable>
      </View>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={64} color="rgba(255,255,255,0.9)" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.four,
    overflow: 'hidden',
    // boxShadow: '0 10px 24px rgba(15, 181, 164, 0.30)',
  },
  body: { flex: 1, gap: Spacing.two },
  title: { color: '#fff' },
  subtitle: { color: 'rgba(255,255,255,0.88)' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
  iconWrap: { marginLeft: Spacing.two, opacity: 0.9 },
});

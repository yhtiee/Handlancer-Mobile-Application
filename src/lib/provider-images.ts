/**
 * Deterministic placeholder photos for providers that have no `avatar_url`.
 *
 * We theme the image to the Nigerian artisan scenario by tagging the request
 * with the provider's primary skill. LoremFlickr returns a real (Flickr-sourced)
 * photo per tag set, and the `lock` seed — derived from the provider id — keeps
 * the same provider showing the same photo across renders. Swap the base URL for
 * a self-hosted asset set later without touching call sites.
 */

/** Maps free-text skills onto a tag LoremFlickr is likely to have photos for. */
const SKILL_KEYWORDS: Record<string, string> = {
  plumber: 'plumber',
  plumbing: 'plumber',
  electrician: 'electrician',
  electrical: 'electrician',
  carpenter: 'carpenter',
  carpentry: 'carpenter',
  mechanic: 'mechanic',
  painter: 'painter',
  painting: 'painter',
  cleaner: 'cleaning',
  cleaning: 'cleaning',
  tailor: 'tailor',
  fashion: 'tailor',
  barber: 'barber',
  hairdresser: 'hairdresser',
  hair: 'hairdresser',
  mason: 'bricklayer',
  bricklayer: 'bricklayer',
  welder: 'welder',
  driver: 'driver',
  cook: 'chef',
  chef: 'chef',
  catering: 'chef',
  gardener: 'gardener',
  farmer: 'farmer',
  general: 'general'
};
const SKILL_IMAGES: Record<string, any> = {
  plumber: require('@/assets/images/providers/plumber.png'),
  electrician: require('@/assets/images/providers/electrician.png'),
  carpenter: require('@/assets/images/providers/carpenter.png'),
  mechanic: require('@/assets/images/providers/mechanic.png'),
  painter: require('@/assets/images/providers/painter.png'),
  cleaning: require('@/assets/images/providers/cleaning.png'),
  tailor: require('@/assets/images/providers/tailor.png'),
  barber: require('@/assets/images/providers/barber.png'),
  hairdresser: require('@/assets/images/providers/hairdresser.png'),
  bricklayer: require('@/assets/images/providers/bricklayer.png'),
  welder: require('@/assets/images/providers/welder.png'),
  driver: require('@/assets/images/providers/driver.png'),
  chef: require('@/assets/images/providers/chef.png'),
  gardener: require('@/assets/images/providers/gardener.png'),
  farmer: require('@/assets/images/providers/farmer.png'),
  general: require('@/assets/images/providers/general.png'),
  artisan: require('@/assets/images/providers/artisan.png'),
};

/**
 * Returns a stable, skill-themed placeholder image URL or local asset for a provider.
 * Use only when `provider.avatar_url` is missing.
 */
export function providerImageFallback(provider: { id: string; services?: string[] | null }): any {
  const skill = provider.services?.[0]?.toLowerCase().trim() ?? 'general';
  const keyword = SKILL_KEYWORDS[skill] ?? 'artisan';
  return SKILL_IMAGES[keyword] ?? SKILL_IMAGES['artisan'];
}

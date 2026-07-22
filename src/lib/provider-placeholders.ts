/**
 * Deterministic dummy "About me" and reviews for providers who have none on the
 * server yet, so the profile screen never looks empty during early adoption.
 * Everything is seeded off the provider id, so the same provider always shows
 * the same placeholder copy. Real data, when present, always takes precedence.
 */

import type { Profile } from '@/services/database.types';

export type DisplayReview = {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  reviewerAvatar: string | null;
};

/** Stable non-negative hash of a string (djb2-ish). */
function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // keep 32-bit
  }
  return Math.abs(hash);
}

const REVIEWER_NAMES = [
  'Chinedu Okafor',
  'Aisha Bello',
  'Tunde Adeyemi',
  'Ngozi Eze',
  'Emeka Nwosu',
  'Fatima Yusuf',
  'Bola Akinyemi',
  'Yusuf Ibrahim',
  'Amaka Obi',
  'Segun Balogun',
];

const REVIEW_COMMENTS = [
  'A true professional. Showed up on time and finished the job faster than I expected. Highly recommend!',
  'Very skilled and neat — cleaned up everything after the work. Will definitely hire again.',
  'Great communication throughout, fair pricing and excellent quality of work.',
  'Solved a problem two others could not. Really knows the trade. Good job!',
  'Polite, punctual and very thorough. My go-to artisan from now on.',
  'Honest about the cost and delivered exactly what was promised. Five stars.',
];

/** A believable "About me" paragraph built from the provider's trade. */
export function providerBioFallback(provider: Profile): string {
  const skill = (provider.services?.[0] ?? 'artisan').toLowerCase();
  const years = provider.years_experience ?? 8;
  const firstName = provider.name?.split(' ')[0];
  const opener = firstName ? `I'm ${firstName}, a` : 'A';
  return (
    `${opener} dedicated ${skill} with ${years} years of hands-on experience. ` +
    `I specialize in everything from routine maintenance to complex installations, ` +
    `always delivering clean, reliable work. Customer satisfaction is my top priority, ` +
    `and I take pride in getting every job done right the first time.`
  );
}

/** A small set of believable reviews, stable per provider. */
export function providerReviewsFallback(provider: Profile, count = 3): DisplayReview[] {
  const seed = hashSeed(provider.id || 'seed');
  return Array.from({ length: count }).map((_, i) => {
    const nameIdx = (seed + i * 3) % REVIEWER_NAMES.length;
    const textIdx = (seed + i * 5) % REVIEW_COMMENTS.length;
    return {
      id: `dummy-${provider.id}-${i}`,
      rating: i === 0 ? 5 : 4 + ((seed + i) % 2), // lead review 5★, rest 4–5★
      comment: REVIEW_COMMENTS[textIdx],
      reviewerName: REVIEWER_NAMES[nameIdx],
      reviewerAvatar: null,
    };
  });
}

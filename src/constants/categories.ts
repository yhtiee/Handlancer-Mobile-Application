import type { IconName } from '@/components/ui/icon';

/** Service categories used for jobs and provider skills. Icons are Ionicons names. */
export const Categories = [
  { id: 'plumbing', label: 'Plumbing', icon: 'water' },
  { id: 'electrical', label: 'Electrical', icon: 'flash' },
  { id: 'carpentry', label: 'Carpentry', icon: 'hammer' },
  { id: 'painting', label: 'Painting', icon: 'brush' },
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkles' },
  { id: 'appliance', label: 'Appliance Repair', icon: 'construct' },
  { id: 'masonry', label: 'Masonry', icon: 'business' },
  { id: 'ac', label: 'AC & Cooling', icon: 'snow' },
  { id: 'auto', label: 'Auto Repair', icon: 'car-sport' },
  { id: 'gardening', label: 'Gardening', icon: 'leaf' },
  { id: 'moving', label: 'Moving & Haulage', icon: 'cube' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type CategoryId = (typeof Categories)[number]['id'];

export function categoryLabel(id?: string | null): string {
  return Categories.find((c) => c.id === id)?.label ?? 'General';
}

export function categoryIcon(id?: string | null): IconName {
  return Categories.find((c) => c.id === id)?.icon ?? 'briefcase';
}

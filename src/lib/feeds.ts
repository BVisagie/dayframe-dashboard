import type { Story } from './types.ts';

/** Settings and the Feeds view list categories in this order. */
export const FEED_CATEGORIES = [
  'bootstrap',
  'technology',
  'design',
  'science',
] as const;

export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Bootstrap stories take the primary role; each fictional publication keeps one
 * chart series so its colour is stable across pages and views. Series 1 is
 * skipped because every theme aliases it to primary.
 */
export function storyRole(
  story: Pick<Story, 'category' | 'publication' | 'live'>,
): string {
  if (story.live || story.category === 'bootstrap') return 'primary';
  const roles: Record<string, string> = {
    'Lanternbyte Journal': 'series-2',
    'Willowglass Review': 'series-3',
    'Mosslight Observer': 'series-4',
    'Bramble Circuit': 'series-5',
  };
  return roles[story.publication] ?? 'series-6';
}

/**
 * Simulated Bootstrap stories stand in for the live blog and releases, so they
 * are labelled; other publications are covered by the footer's disclosure.
 */
export function isDemoFallback(
  story: Pick<Story, 'category' | 'live'>,
): boolean {
  return story.category === 'bootstrap' && !story.live;
}

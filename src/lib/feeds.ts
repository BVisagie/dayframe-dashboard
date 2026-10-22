import type { Story } from './types.ts';

/** Live Bootstrap sources take the primary role; fictional publications share the chart series. */
export function storyRole(
  story: Pick<Story, 'category' | 'publication' | 'live'>,
): string {
  if (story.live || story.category === 'bootstrap') return 'primary';
  const roles: Record<string, string> = {
    'Lanternbyte Journal': 'series-1',
    'Willowglass Review': 'series-2',
    'Mosslight Observer': 'series-3',
    'Bramble Circuit': 'series-4',
  };
  return roles[story.publication] ?? 'series-5';
}

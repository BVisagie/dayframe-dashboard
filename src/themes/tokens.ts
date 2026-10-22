export const roleNames = [
  'primary', 'accent', 'secondary', 'success', 'warning', 'danger', 'info', 'inverse',
  'codex', 'claude', 'cursor', 'grok', 'opencode', 'antigravity',
  'series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6',
] as const;

export const roleKeys = [
  'base', 'fg', 'fg-emphasis', 'bg', 'bg-subtle', 'bg-muted', 'border', 'focus-ring', 'contrast',
] as const;

export const requiredTokens: readonly string[] = [
  '--bg-body', '--bg-1', '--bg-2', '--bg-3', '--bg-4',
  '--fg-body', '--fg-1', '--fg-2', '--fg-3', '--fg-4',
  '--border-color', '--border-color-translucent', '--border-body', '--border-muted',
  '--border-subtle', '--border-emphasized', '--border-width', '--border-style',
  '--body-font-family', '--body-font-size', '--body-line-height', '--font-mono',
  '--radius-1', '--radius-2', '--radius-3', '--radius-4', '--radius-5',
  '--radius-6', '--radius-7', '--radius-8', '--radius-9',
  '--box-shadow', '--box-shadow-sm', '--box-shadow-lg', '--box-shadow-inset',
  '--focus-ring-color', '--focus-ring-width', '--focus-ring-offset',
  '--calendar-weekend-bg', '--calendar-outside-bg', '--clock-face',
  '--display-font-family',
  ...roleNames.flatMap((role) => roleKeys.map((key) => `--${role}-${key}`)),
];

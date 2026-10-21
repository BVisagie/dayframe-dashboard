import { defineTheme } from '../define.ts';

/** @type {import('../define.ts').Theme} */
const theme = {
  id: 'default',
  name: 'Default',
  description: 'Cool porcelain, midnight navy and clear cobalt instruments.',
  schemes: ['light', 'dark'],
  layout: 'standard',
  options: {},
  preview: { canvas: '#f3f6fa', surface: '#ffffff', ink: '#13243b', accent: '#224cbb' },
};

export default defineTheme(theme);

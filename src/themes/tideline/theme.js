import { defineTheme } from '../define.ts';

/** @type {import('../define.ts').Theme} */
const theme = {
  id: 'tideline',
  name: 'Tideline',
  description: 'Salt-white daylight and deep-ocean instruments with teal and coral.',
  schemes: ['light', 'dark'],
  layout: 'standard',
  options: {},
  preview: { canvas: '#f0f8f8', surface: '#ffffff', ink: '#092e3a', accent: '#086a70' },
};

export default defineTheme(theme);

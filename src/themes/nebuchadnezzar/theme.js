import { defineTheme } from '../define.ts';

/** @type {import('../define.ts').Theme} */
const theme = {
  id: 'nebuchadnezzar',
  name: 'Nebuchadnezzar',
  description: 'Phosphor green, void black and olive glass.',
  schemes: ['dark'],
  layout: 'console',
  options: {
    crt: { type: 'boolean', label: 'CRT finish', default: true },
  },
  preview: { canvas: '#010301', surface: '#141b0c', ink: '#d6edc9', accent: '#3cbf5c' },
};

export default defineTheme(theme);

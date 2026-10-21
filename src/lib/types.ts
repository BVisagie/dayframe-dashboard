export type View = 'summary' | 'agents' | 'calendar' | 'weather' | 'feeds';
export type Scenario =
  'steady' | 'running-low' | 'reconnect' | 'reminder-due' | 'stale' | 'offline';
export type SourceStatus = 'loading' | 'fresh' | 'stale' | 'offline' | 'reconnect';
export interface Agent {
  id: string;
  name: string;
  plan: string;
  initials: string;
  used: number;
  limit: number;
  unit: string;
  window: string;
  resetsAt: string;
  status: SourceStatus;
  history: number[];
}
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendar: string;
  location: string;
  attendees: string[];
  description: string;
}
export interface Story {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publication: string;
  publishedAt: string;
  url?: string;
  live?: boolean;
}
export interface WeatherDay {
  date: string;
  low: number;
  high: number;
  code: number;
  precipitation: number;
  sunrise: string;
  sunset: string;
}
export interface WeatherHour {
  time: string;
  temperature: number;
  code: number;
  precipitation: number;
}
export interface Weather {
  city: string;
  timezone?: string;
  temperature: number;
  feelsLike: number;
  code: number;
  wind: number;
  humidity: number;
  days: WeatherDay[];
  hours: WeatherHour[];
}
export interface Location {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}
export interface Settings {
  version: 1;
  theme: string;
  scheme: 'light' | 'dark' | 'system' | 'auto';
  scale: number;
  startupView: View;
  rotation: boolean;
  rotationSeconds: number;
  keyboardShortcuts: boolean;
  locale: string;
  dateFormat: 'locale' | 'day-month' | 'month-day' | 'iso';
  hourCycle: 'locale' | 'h12' | 'h23';
  firstDay: 0 | 1;
  units: 'celsius' | 'fahrenheit';
  reminders: boolean;
  reminderMinutes: number;
  categories: string[];
  scenario: Scenario;
  location: Location | null;
  themeOptions: Record<string, Record<string, boolean>>;
  lens: boolean;
}

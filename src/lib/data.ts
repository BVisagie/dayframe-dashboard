import type { Agent, AgentAllowance, CalendarEvent, Scenario, SourceStatus, Story, Weather, WeatherDay } from './types.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function timestamp(now: Date): number {
  const value = now.getTime();
  if (!Number.isFinite(value)) throw new RangeError('Simulation requires a valid date.');
  return value;
}

function utcOffset(offsetMinutes: number): number {
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < -840 || offsetMinutes > 720) {
    throw new RangeError('Simulation requires an integer UTC offset from -840 to 720 minutes.');
  }
  return offsetMinutes * MINUTE;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function fraction(seed: string): number {
  return hash(seed) / 0x1_0000_0000;
}

function dayStart(time: number): number {
  return Math.floor(time / DAY) * DAY;
}

function monday(time: number): number {
  const day = dayStart(time);
  return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
}

function isoWeek(time: number): string {
  const thursday = new Date(monday(time) + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const firstMonday = monday(Date.UTC(year, 0, 4));
  return `${year}-W${String(1 + Math.floor((monday(time) - firstMonday) / (7 * DAY))).padStart(2, '0')}`;
}

type WindowKind = 'session' | 'weekly' | 'monthly';
interface AllowanceProfile {
  id: string;
  label: string;
  scope: AgentAllowance['scope'];
  kind: WindowKind;
  hours?: number;
}
interface AgentProfile {
  id: string;
  name: string;
  initials: string;
  plan: string;
  primaryAllowanceId: string;
  allowances: [AllowanceProfile, ...AllowanceProfile[]];
}

// These illustrate allowance shapes, not contractual limits or provider integrations.
const PROFILES: AgentProfile[] = [
  { id: 'codex', name: 'Codex', initials: 'CX', plan: 'Pro', primaryAllowanceId: 'weekly', allowances: [
    { id: 'session', label: 'Session', scope: 'shared', kind: 'session', hours: 5 },
    { id: 'weekly', label: 'Weekly', scope: 'shared', kind: 'weekly' },
  ] },
  { id: 'claude', name: 'Claude', initials: 'CL', plan: 'Max', primaryAllowanceId: 'weekly', allowances: [
    { id: 'session', label: 'Session', scope: 'shared', kind: 'session', hours: 5 },
    { id: 'weekly', label: 'Weekly', scope: 'shared', kind: 'weekly' },
    { id: 'fable', label: 'Weekly · Fable', scope: 'model', kind: 'weekly' },
  ] },
  { id: 'cursor', name: 'Cursor', initials: 'CU', plan: 'Pro', primaryAllowanceId: 'monthly', allowances: [
    { id: 'monthly', label: 'Monthly', scope: 'shared', kind: 'monthly' },
    { id: 'other', label: 'Other models', scope: 'model', kind: 'monthly' },
    { id: 'cursor', label: 'Cursor models', scope: 'model', kind: 'monthly' },
  ] },
  { id: 'grok', name: 'Grok', initials: 'GR', plan: 'SuperGrok', primaryAllowanceId: 'weekly', allowances: [
    { id: 'weekly', label: 'Weekly', scope: 'shared', kind: 'weekly' },
  ] },
  { id: 'opencode', name: 'OpenCode', initials: 'OC', plan: 'Go', primaryAllowanceId: 'monthly', allowances: [
    { id: 'session', label: 'Session', scope: 'shared', kind: 'session', hours: 5 },
    { id: 'weekly', label: 'Weekly', scope: 'shared', kind: 'weekly' },
    { id: 'monthly', label: 'Monthly', scope: 'shared', kind: 'monthly' },
  ] },
  { id: 'antigravity', name: 'Antigravity', initials: 'AG', plan: 'Model quotas', primaryAllowanceId: 'pro', allowances: [
    { id: 'pro', label: 'Pro model', scope: 'model', kind: 'session', hours: 5 },
    { id: 'fast', label: 'Fast model', scope: 'model', kind: 'session', hours: 5 },
    { id: 'reasoning', label: 'Reasoning model', scope: 'model', kind: 'weekly' },
  ] },
];

function quotaWindow(time: number, profile: AllowanceProfile): { start: number; end: number } {
  if (profile.kind === 'weekly') {
    const start = monday(time);
    return { start, end: start + 7 * DAY };
  }
  if (profile.kind === 'monthly') {
    const date = new Date(time);
    return {
      start: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
      end: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    };
  }
  const duration = (profile.hours ?? 5) * HOUR;
  const start = Math.floor(time / duration) * duration;
  return { start, end: start + duration };
}

function quotaRemaining(time: number, seed: string, profile: AllowanceProfile): number {
  const { start, end } = quotaWindow(time, profile);
  // Keep the opening week's seed so Monday cannot replenish a monthly allowance.
  const key = `${isoWeek(start)}:${seed}:${profile.id}:${start}`;
  const eventualUse = 0.72 + fraction(`${key}:pace`) * 0.42;
  const progress = (time - start) / (end - start);
  return Math.max(0, 100 - Math.floor(100 * eventualUse * progress ** 0.9));
}

function agentStatus(time: number, seed: string, profile: AgentProfile, scenario: Scenario, index: number): SourceStatus {
  if (scenario === 'offline') return 'offline';
  if (scenario === 'stale') return 'stale';
  if (scenario === 'reconnect' && index < 2) return 'reconnect';
  if (scenario !== 'steady') return 'fresh';
  const roll = hash(`${isoWeek(time)}:${seed}:${profile.id}:${dayStart(time)}:status`) % 89;
  return roll === 0 ? 'reconnect' : roll === 1 ? 'stale' : 'fresh';
}

function simulateAgents(time: number, seed: string, scenario: Scenario): Agent[] {
  return PROFILES.map((profile, index) => {
    const allowances = profile.allowances.map((allowance) => ({
      id: allowance.id,
      label: allowance.label,
      scope: allowance.scope,
      remainingPercent: scenario === 'running-low'
        ? Math.min(quotaRemaining(time, `${seed}:${profile.id}`, allowance), 2 + index)
        : quotaRemaining(time, `${seed}:${profile.id}`, allowance),
      resetsAt: new Date(quotaWindow(time, allowance).end).toISOString(),
    })) as Agent['allowances'];
    const age = scenario === 'stale' || scenario === 'offline' ? 2 * HOUR : 3 * MINUTE;
    return {
      id: profile.id,
      name: profile.name,
      initials: profile.initials,
      plan: profile.plan,
      primaryAllowanceId: profile.primaryAllowanceId,
      allowances,
      ...(profile.id === 'codex' ? { resetCredits: hash(`${isoWeek(time)}:${seed}:reset-credits`) % 4 } : {}),
      updatedAt: new Date(Math.floor(time / (5 * MINUTE)) * 5 * MINUTE - age).toISOString(),
      status: agentStatus(time, seed, profile, scenario, index),
    };
  });
}

function simulateEvents(time: number, seed: string, scenario: Scenario, offset: number): CalendarEvent[] {
  const wallTime = time - offset;
  const today = dayStart(wallTime);
  const weekStart = monday(wallTime);
  const events: CalendarEvent[] = [];
  const add = (id: string, title: string, start: number, duration: number, calendar: string, location: string, attendees: string[], description: string, allDay = false) => {
    // All-day membership uses the calendar date; only timed events need an offset.
    if (!allDay) start += offset;
    events.push({ id, title, start: new Date(start).toISOString(), end: new Date(start + duration).toISOString(), allDay, calendar, location, attendees, description });
  };
  const crew = ['Pip Mosswing', 'Tavi Cloudfern', 'Neri Pebblebrook'];
  const planningHour = 13 + hash(`${isoWeek(wallTime)}:${seed}:planning`) % 3;

  // Explicit wall dates keep recurrence deterministic without reading the viewer's zone.
  for (let offset = -7; offset < 14; offset += 1) {
    const date = today + offset * DAY;
    const weekday = new Date(date).getUTCDay();
    if (weekday > 0 && weekday < 6) {
      add(`standup-${date}`, 'Daily build check', date + 9 * HOUR + 15 * MINUTE, 20 * MINUTE, 'Studio', 'Cloudfern room', crew, 'Recurring weekday check-in for the next small release.');
    }
    if (weekday === 3) {
      add(`design-${date}`, 'Interface workshop', date + planningHour * HOUR, 75 * MINUTE, 'Studio', 'Willowglass studio', crew.slice(0, 2), 'Weekly review of the prototype and its keyboard flow.');
      add(`review-${date}`, 'Component review', date + planningHour * HOUR + 30 * MINUTE, 45 * MINUTE, 'Research', 'Mosslight lab', crew.slice(1), 'A parallel review slot; choose an attendee to cover the overlap.');
    }
  }

  add(`focus-${today}`, 'Quiet build time', today + 10 * HOUR, 90 * MINUTE, 'Focus', 'Fernlight nook', [], 'Protect a little uninterrupted time for the current prototype.');
  add(`critique-${today}`, 'Prototype critique', today + 10 * HOUR + 45 * MINUTE, 45 * MINUTE, 'Studio', 'Cloudfern room', crew.slice(0, 2), 'Review two alternative approaches before the next build.');
  add(`release-${weekStart}`, 'Release week', weekStart, 5 * DAY, 'Milestones', 'Willowglass studio', [], 'A multi-day milestone with an exclusive end on Saturday.', true);
  add(`field-${today}`, 'Open sketch day', today + DAY, DAY, 'Research', 'Mosslight lab', [crew[2]], 'Bring an unfinished idea for an informal all-day workshop.', true);
  add(`next-week-${weekStart}`, 'Next cycle planning', weekStart + 7 * DAY + 11 * HOUR, HOUR, 'Studio', 'Cloudfern room', crew, 'Choose a small, testable goal for the coming week.');

  const reminderStart = scenario === 'reminder-due'
    ? Math.floor(wallTime / MINUTE) * MINUTE + 3 * MINUTE
    : (Math.floor(wallTime / (15 * MINUTE)) + 1) * 15 * MINUTE;
  add(`reminder-${today}`, scenario === 'reminder-due' ? 'Release readiness check' : 'Pause and plan', reminderStart, 15 * MINUTE, 'Reminders', 'Fernlight nook', [], scenario === 'reminder-due' ? 'A reminder is due now: gather the checklist for the short release review.' : 'A short reminder to stretch, review progress and choose the next step.');

  return events.sort((left, right) => left.start.localeCompare(right.start) || left.id.localeCompare(right.id));
}

const STORIES = [
  { title: 'A tiny compiler makes room for better error messages', excerpt: 'The Lanternbyte team trades a little speed for diagnostics that explain the next useful step.', category: 'technology', publication: 'Lanternbyte Journal' },
  { title: 'Designing a dashboard around the next decision', excerpt: 'A Willowglass study explores how density and quiet space change what people notice first.', category: 'design', publication: 'Willowglass Review' },
  { title: 'A greenhouse sensor learns the rhythm of its canopy', excerpt: 'Researchers at Mosslight Lab compare small changes in light with the movement of leaves.', category: 'science', publication: 'Mosslight Observer' },
  { title: 'Exploring colour roles in Bootstrap 6', excerpt: 'Demo field notes follow a fictional interface from seed colours to readable component states.', category: 'bootstrap', publication: 'Component Fieldbook' },
  { title: 'Small local tools find a place beside coding agents', excerpt: 'The Brambleworks crew shares a simulated workflow built around short feedback loops.', category: 'technology', publication: 'Lanternbyte Journal' },
  { title: 'A calendar that makes overlap easier to scan', excerpt: 'An imaginary studio tests clearer labels, quieter all-day rows and a little more breathing room.', category: 'design', publication: 'Willowglass Review' },
  { title: 'Mapping the soft glow of a miniature tide pool', excerpt: 'A fictional field study asks what a low-power camera can reveal after sunset.', category: 'science', publication: 'Mosslight Observer' },
  { title: 'Putting Bootstrap menus to work in a compact header', excerpt: 'A simulated component notebook explores overflow, focus return and keyboard navigation.', category: 'bootstrap', publication: 'Component Fieldbook' },
  { title: 'A build queue that explains why work is waiting', excerpt: 'An experimental status view makes room for plain-language explanations alongside progress.', category: 'technology', publication: 'Bramble Circuit' },
  { title: 'What survives when an interface loses its colour', excerpt: 'The Cloudfern workshop sketches stronger shapes and labels for high-contrast viewing.', category: 'design', publication: 'Willowglass Review' },
  { title: 'Listening for rain with a paper-thin sensor', excerpt: 'A fictional materials team measures how a flexible surface responds to scattered droplets.', category: 'science', publication: 'Mosslight Observer' },
  { title: 'A field guide to Bootstrap theme tokens', excerpt: 'Imaginary release notes connect body surfaces, emphasis and focus colours in one small theme.', category: 'bootstrap', publication: 'Component Fieldbook' },
] satisfies Omit<Story, 'id' | 'publishedAt'>[];

function simulateStories(time: number, seed: string): Story[] {
  const anchor = Math.floor(time / HOUR) * HOUR;
  return STORIES.map((story, index) => ({
    ...story,
    id: `story-${index + 1}`,
    publishedAt: new Date(anchor - (index * 173 + 8 + hash(`${isoWeek(time)}:${seed}:story:${index}`) % 41) * MINUTE).toISOString(),
    live: false,
  }));
}

function solarTime(wallTime: number, offset: number): string {
  const local = new Date(wallTime).toISOString();
  if (offset === 0) return local;
  const minutes = Math.abs(offset) / MINUTE;
  const suffix = `${offset > 0 ? '-' : '+'}${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  // The encoded local date lets auto-scheme freshness checks recognize both solar boundaries.
  return `${local.slice(0, -1)}${suffix}`;
}

function weatherDay(day: number, seed: string, offset: number): WeatherDay {
  const date = new Date(day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const season = Math.sin(((day - yearStart) / DAY - 80) / 365.25 * 2 * Math.PI);
  const key = `${isoWeek(day)}:${seed}:weather:${day}`;
  const low = Math.round(8 + season * 9 + fraction(`${key}:low`) * 5);
  const high = low + 6 + Math.floor(fraction(`${key}:high`) * 5);
  const codes = [0, 1, 2, 3, 51, 61, 80];
  const code = codes[hash(`${key}:code`) % codes.length];
  const sunriseMinutes = Math.round(7 * 60 - season * 65);
  const sunsetMinutes = Math.round(18 * 60 + season * 95);
  return {
    date: date.toISOString().slice(0, 10),
    low,
    high,
    code,
    precipitation: code >= 50 ? 40 + hash(`${key}:rain`) % 56 : hash(`${key}:rain`) % 24,
    sunrise: solarTime(day + sunriseMinutes * MINUTE, offset),
    sunset: solarTime(day + sunsetMinutes * MINUTE, offset),
  };
}

/** Fictional metric weather; fixed offsetMinutes uses Date#getTimezoneOffset's sign (UTC+2 is -120). */
export function simulateWeather(now: Date, seed: string, offsetMinutes = 0): Weather {
  const offset = utcOffset(offsetMinutes);
  const time = timestamp(now) - offset;
  const today = dayStart(time);
  const days = Array.from({ length: 7 }, (_, index) => weatherDay(today + index * DAY, seed, offset));
  const hourStart = Math.floor(time / HOUR) * HOUR;
  const hours = Array.from({ length: 24 }, (_, index) => {
    const hour = hourStart + index * HOUR;
    const day = weatherDay(dayStart(hour), seed, offset);
    const hourOfDay = new Date(hour).getUTCHours();
    const warmth = (1 + Math.cos((hourOfDay - 15) / 24 * 2 * Math.PI)) / 2;
    return {
      time: new Date(hour + offset).toISOString(),
      temperature: Math.round((day.low + (day.high - day.low) * warmth) * 10) / 10,
      code: day.code,
      precipitation: day.precipitation,
    };
  });
  const key = `${isoWeek(time)}:${seed}:${today}:conditions`;
  const wind = 5 + hash(`${key}:wind`) % 19;
  const temperature = hours[0].temperature;
  return {
    city: 'Willowmere',
    temperature,
    feelsLike: Math.round((temperature - wind / 16) * 10) / 10,
    code: days[0].code,
    wind,
    humidity: 42 + hash(`${key}:humidity`) % 49,
    days,
    hours,
  };
}

/** Fixed offsetMinutes follows Date#getTimezoneOffset (UTC+2 is -120); replay callers use zero. */
export function simulate(now: Date, seed: string, scenario: Scenario, offsetMinutes = 0): { agents: Agent[]; events: CalendarEvent[]; weather: Weather; stories: Story[] } {
  const time = timestamp(now);
  const offset = utcOffset(offsetMinutes);
  return {
    agents: simulateAgents(time, seed, scenario),
    events: simulateEvents(time, seed, scenario, offset),
    weather: simulateWeather(now, seed, offsetMinutes),
    stories: simulateStories(time, seed),
  };
}

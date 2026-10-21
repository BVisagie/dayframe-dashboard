import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReplayClock } from '../src/lib/clock.ts';

test('replay clocks use UTC for offset-free ISO date-times in every viewer timezone', () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'America/New_York', 'Asia/Kolkata', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.equal(parseReplayClock('2026-11-03T09:30')?.toISOString(), '2026-11-03T09:30:00.000Z');
      assert.equal(parseReplayClock('2028-02-29T23:59:59.123')?.toISOString(), '2028-02-29T23:59:59.123Z');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('replay clocks honor Z and signed offsets across day and year boundaries', () => {
  for (const [input, expected] of [
    ['2026-11-03T09:30Z', '2026-11-03T09:30:00.000Z'],
    ['2026-11-03T09:30:15.5Z', '2026-11-03T09:30:15.500Z'],
    ['2026-01-01T00:15+05:45', '2025-12-31T18:30:00.000Z'],
    ['2026-12-31T23:30:00-08:00', '2027-01-01T07:30:00.000Z'],
    ['0000-02-29T00:00Z', '0000-02-29T00:00:00.000Z'],
  ]) assert.equal(parseReplayClock(input)?.toISOString(), expected);
});

test('replay clocks reject invalid calendar dates, out-of-range times and lenient date strings', () => {
  for (const value of [
    null, '', 'foo 5', '2026-11-03', '2026-11-03 09:30', '2026-1-03T09:30',
    '2026-11-3T09:30', '2026-11-03T9:30', '2026-11-03t09:30z',
    '2026-02-29T09:30', '2028-02-30T09:30Z', '2026-04-31T09:30+01:00',
    '1900-02-29T09:30', '2026-00-03T09:30', '2026-13-03T09:30', '2026-11-00T09:30',
    '2026-11-03T24:00', '2026-11-03T09:60', '2026-11-03T09:30:60',
    '2026-11-03T09:30+24:00', '2026-11-03T09:30-01:60', '2026-11-03T09:30+0100',
    '2026-11-03T09:30.5', '2026-11-03T09:30Z extra', ' 2026-11-03T09:30Z',
    '2026-11-03T09:30Z ', '2026-11-03T09:30Z\n',
  ]) assert.equal(parseReplayClock(value), null, String(value));
});

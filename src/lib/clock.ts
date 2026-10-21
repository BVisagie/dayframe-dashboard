/** Replay clocks accept ISO date-times; an omitted offset means UTC. */
export function parseReplayClock(value: string | null): Date | null {
  if (value === null) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(value);
  if (!match || match[0] !== value) return null;
  // Date parsing otherwise normalizes impossible month days, such as February 30.
  const day = new Date(`${match[1]}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== match[1]) return null;
  const clock = new Date(match[2] ? value : `${value}Z`);
  return Number.isFinite(clock.getTime()) ? clock : null;
}

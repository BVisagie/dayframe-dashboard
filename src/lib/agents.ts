import type { Agent, AgentAllowance, SourceStatus } from './types.ts';

export function primaryAllowance(agent: Agent): AgentAllowance {
  return agent.allowances.find(({ id }) => id === agent.primaryAllowanceId) ?? agent.allowances[0];
}

/** Optional model pools do not prevent use of the other models. */
export function limitingAllowance(agent: Agent): AgentAllowance {
  const shared = agent.allowances.filter(({ scope }) => scope === 'shared');
  return shared.reduce((lowest, allowance) => allowance.remainingPercent < lowest.remainingPercent ? allowance : lowest,
    shared[0] ?? primaryAllowance(agent));
}

export function capacityRole(remainingPercent: number, status: SourceStatus = 'fresh'): 'secondary' | 'danger' | 'warning' | 'success' {
  return status !== 'fresh' ? 'secondary' : remainingPercent <= 10 ? 'danger' : remainingPercent <= 25 ? 'warning' : 'success';
}

export type AgentCondition = 'used-up' | 'nearly-exhausted' | 'running-low' | 'available' | 'stale' | 'offline' | 'reconnect';

export interface ConditionCue {
  label: string;
  /** A Bootstrap Icons name, so the badge keeps a shape cue under forced colours. */
  icon: string;
  role: ReturnType<typeof capacityRole>;
  /** Whether the whole card takes the role's subtle surface. */
  graded: boolean;
  /** The avatar-status modifier describes the connection, not the capacity. */
  presence: 'online' | 'away' | 'offline';
}

const cues: Record<AgentCondition, ConditionCue> = {
  'used-up': { label: 'Used up', icon: 'battery', role: 'danger', graded: true, presence: 'online' },
  'nearly-exhausted': { label: 'Nearly exhausted', icon: 'battery-low', role: 'danger', graded: true, presence: 'online' },
  'running-low': { label: 'Running low', icon: 'battery-half', role: 'warning', graded: true, presence: 'online' },
  available: { label: 'Available', icon: 'battery-full', role: 'success', graded: false, presence: 'online' },
  stale: { label: 'Last known usage', icon: 'clock-history', role: 'secondary', graded: true, presence: 'away' },
  offline: { label: 'Offline', icon: 'wifi-off', role: 'secondary', graded: true, presence: 'offline' },
  reconnect: { label: 'Reconnect needed', icon: 'plug', role: 'secondary', graded: true, presence: 'offline' },
};

/** Connection problems outrank capacity, because the readings behind them are not current. */
export function agentCondition(agent: Agent): AgentCondition {
  if (agent.status === 'reconnect' || agent.status === 'offline') return agent.status;
  if (agent.status !== 'fresh') return 'stale';
  const { remainingPercent } = limitingAllowance(agent);
  return remainingPercent <= 0 ? 'used-up' : remainingPercent <= 10 ? 'nearly-exhausted' : remainingPercent <= 25 ? 'running-low' : 'available';
}

export function conditionCue(agent: Agent): ConditionCue {
  return cues[agentCondition(agent)];
}

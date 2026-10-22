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

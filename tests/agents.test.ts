import test from 'node:test';
import assert from 'node:assert/strict';
import { capacityRole, limitingAllowance, primaryAllowance } from '../src/lib/agents.ts';
import { simulate } from '../src/lib/data.ts';

const NOW = new Date('2026-11-03T09:30:00Z');

test('the primary allowance remains stable while the most constrained shared window drives attention', () => {
  const agent = simulate(NOW, 'allowances', 'steady').agents.find(({ id }) => id === 'claude')!;
  agent.allowances[0].remainingPercent = 4;
  agent.allowances[1].remainingPercent = 82;
  agent.allowances[2].remainingPercent = 0;
  assert.equal(primaryAllowance(agent).id, 'weekly');
  assert.equal(primaryAllowance(agent).remainingPercent, 82);
  assert.equal(limitingAllowance(agent).id, 'session');
  assert.equal(capacityRole(limitingAllowance(agent).remainingPercent), 'danger');
});

test('an exhausted optional model pool does not exhaust the agent or change its main reading', () => {
  const agent = simulate(NOW, 'allowances', 'steady').agents.find(({ id }) => id === 'cursor')!;
  agent.allowances[0].remainingPercent = 75;
  agent.allowances[1].remainingPercent = 0;
  agent.allowances[2].remainingPercent = 83;
  assert.equal(primaryAllowance(agent).remainingPercent, 75);
  assert.equal(limitingAllowance(agent).remainingPercent, 75);
  assert.equal(capacityRole(limitingAllowance(agent).remainingPercent), 'success');
  assert.equal(capacityRole(agent.allowances[1].remainingPercent), 'danger');
});

test('independent model quotas use the selected model rather than an unrelated exhausted model', () => {
  const agent = simulate(NOW, 'allowances', 'steady').agents.find(({ id }) => id === 'antigravity')!;
  agent.allowances[0].remainingPercent = 42;
  agent.allowances[1].remainingPercent = 0;
  assert.equal(limitingAllowance(agent).id, 'pro');
  assert.equal(capacityRole(limitingAllowance(agent).remainingPercent), 'success');
  agent.allowances[0].remainingPercent = 0;
  assert.equal(capacityRole(limitingAllowance(agent).remainingPercent), 'danger');
});

test('remaining capacity thresholds include empty and full allowances and mute stale values', () => {
  assert.equal(capacityRole(100), 'success');
  assert.equal(capacityRole(26), 'success');
  assert.equal(capacityRole(25), 'warning');
  assert.equal(capacityRole(11), 'warning');
  assert.equal(capacityRole(10), 'danger');
  assert.equal(capacityRole(0), 'danger');
  for (const status of ['stale', 'offline', 'reconnect', 'loading'] as const) {
    assert.equal(capacityRole(0, status), 'secondary');
  }
});

test('a session reset does not replenish the weekly, monthly or independent model pools', () => {
  const before = simulate(new Date('2026-11-03T09:59:59Z'), 'allowances', 'reminder-due').agents;
  const after = simulate(new Date('2026-11-03T10:00:00Z'), 'allowances', 'reminder-due').agents;
  assert.ok([...before, ...after].every(({ status }) => status === 'fresh'));
  for (const id of ['codex', 'claude', 'opencode']) {
    const prior = before.find(agent => agent.id === id)!;
    const current = after.find(agent => agent.id === id)!;
    assert.equal(current.allowances.find(allowance => allowance.id === 'session')!.remainingPercent, 100);
    for (const allowance of prior.allowances.filter(allowance => allowance.id !== 'session')) {
      const next = current.allowances.find(candidate => candidate.id === allowance.id)!;
      assert.equal(next.resetsAt, allowance.resetsAt);
      assert.ok(next.remainingPercent <= allowance.remainingPercent);
    }
  }
});

test('unavailable readings reflect their recorded update time across session, weekly and monthly resets', () => {
  for (const clock of [NOW, new Date('2026-11-03T10:01:00Z'), new Date('2026-11-02T00:01:00Z'), new Date('2026-11-01T00:01:00Z')]) {
    const current = simulate(clock, 'snapshots', 'reminder-due').agents;
    for (const scenario of ['stale', 'offline', 'reconnect'] as const) {
      const unavailable = simulate(clock, 'snapshots', scenario).agents.filter(({ status }) => status !== 'fresh');
      assert.ok(unavailable.length > 0);
      for (const agent of unavailable) {
        const recorded = simulate(new Date(agent.updatedAt), 'snapshots', 'reminder-due').agents.find(({ id }) => id === agent.id)!;
        const latest = current.find(({ id }) => id === agent.id)!;
        assert.deepEqual(agent.allowances.map(({ remainingPercent }) => remainingPercent), recorded.allowances.map(({ remainingPercent }) => remainingPercent));
        assert.deepEqual(agent.allowances.map(({ resetsAt }) => resetsAt), latest.allowances.map(({ resetsAt }) => resetsAt));
        assert.equal(agent.resetCredits, recorded.resetCredits);
      }
    }
  }
});

test('unavailable percentages stay fixed until the recorded update instant changes', () => {
  for (const scenario of ['stale', 'offline', 'reconnect'] as const) {
    const before = simulate(NOW, 'snapshots', scenario).agents.filter(({ status }) => status !== 'fresh');
    const after = simulate(new Date(NOW.getTime() + 60_000), 'snapshots', scenario).agents;
    for (const agent of before) {
      const next = after.find(({ id }) => id === agent.id)!;
      assert.equal(next.updatedAt, agent.updatedAt);
      assert.deepEqual(next.allowances, agent.allowances);
    }
  }
});

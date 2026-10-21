import { readFileSync } from 'node:fs';

try {
  const { workflow_run: run } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || run?.repository?.full_name !== repository || !/^[a-f0-9]{40}$/.test(run?.head_sha)) throw new Error();
  const response = await fetch(`https://api.github.com/repos/${repository}/statuses/${run.head_sha}`, {
    method: 'POST', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: process.env.PRIVACY_RESULT === 'success' ? 'success' : 'failure', context: 'Privacy / private history', description: 'Trusted full-history privacy and secret checks', target_url: `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` }),
  });
  if (!response.ok) throw new Error();
  console.log('Published privacy status for the tested commit.');
} catch {
  console.error('Unable to publish the privacy result.');
  process.exitCode = 1;
}

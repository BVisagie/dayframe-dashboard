import { readFileSync } from 'node:fs';

try {
  const { workflow_run: run } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || run?.repository?.full_name !== repository || run.event !== 'push' || run.head_branch !== 'main' || run.conclusion !== 'success' || !/^[a-f0-9]{40}$/.test(run.head_sha) || !Number.isSafeInteger(run.id)) throw new Error();
  /** @param {string} path */
  const get = async path => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error();
    return response.json();
  };
  const [branch, jobs, workflow] = await Promise.all([get('branches/main'), get(`actions/runs/${run.id}/jobs?per_page=100&filter=latest`), get(`actions/workflows/${run.workflow_id}`)]);
  if (branch.commit?.sha !== run.head_sha || workflow.path !== '.github/workflows/ci.yml' || jobs.total_count > 100) throw new Error();
  for (const name of ['Type and lint', 'Unit tests', 'Production build', 'Browser and screenshots', 'Secret history']) {
    if (!jobs.jobs.some(/** @param {{name:string, conclusion:string}} job */ job => job.name === name && job.conclusion === 'success')) throw new Error();
  }
  console.log('All required checks succeeded for the current main commit.');
} catch {
  console.error('Deployment blocked: all checks must pass on the current main commit.');
  process.exitCode = 1;
}

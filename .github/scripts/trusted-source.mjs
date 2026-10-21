import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  const run = event.workflow_run;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = run?.head_sha;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || run?.repository?.full_name !== repository || !/^[a-f0-9]{40}$/.test(sha) || !process.env.GH_TOKEN) throw new Error();
  const directory = mkdtempSync(join(process.env.RUNNER_TEMP ?? '', 'privacy-'));
  const authorization = Buffer.from(`x-access-token:${process.env.GH_TOKEN}`).toString('base64');
  const env = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1' };
  /** @param {string[]} args */
  const git = args => {
    const result = spawnSync('git', args, { env, timeout: 120_000, maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status !== 0 || result.error) throw new Error();
  };
  git(['init', '--bare', directory]);
  git(['-C', directory, '-c', 'gc.auto=0', '-c', 'fetch.fsckObjects=true', '-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${authorization}`, 'fetch', '--no-recurse-submodules', '--no-write-fetch-head', `https://github.com/${repository}.git`, '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*', `+${sha}:refs/heads/privacy-candidate`]);
  appendFileSync(process.env.GITHUB_ENV ?? '', `SCAN_REPOSITORY=${directory}\nSCAN_SHA=${sha}\n`);
  console.log('Fetched candidate and full history as passive Git objects.');
} catch {
  console.error('Unable to fetch complete candidate history safely. Details are withheld.');
  process.exitCode = 1;
}

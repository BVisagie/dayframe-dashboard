import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporary = mkdtempSync(join(tmpdir(), 'dayframe-maintenance-'));
try {
  const kind = process.env.MAINTENANCE_KIND;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!['skill', 'bootstrap'].includes(kind ?? '') || !repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !process.env.GH_TOKEN) throw new Error();
  const candidate = process.env.BOOTSTRAP_CANDIDATE ?? '';
  if (kind === 'bootstrap' && !/^6\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(candidate)) throw new Error();
  const revision = kind === 'skill' ? createHash('sha256').update(readFileSync('.agents/skills/frontend-design/SKILL.md')).update(readFileSync('.agents/skills/frontend-design/LICENSE.txt')).digest('hex').slice(0, 12) : candidate;
  const branch = `maintenance/${kind === 'skill' ? 'frontend-design' : 'bootstrap'}-${revision}`;
  /** @param {string} command @param {string[]} args */
  const run = (command, args) => {
    const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120_000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status !== 0 || result.error) throw new Error();
    return result.stdout;
  };
  const existing = JSON.parse(run('gh', ['pr', 'list', '--repo', repository, '--base', 'main', '--head', branch, '--state', 'open', '--json', 'number']));
  if (existing.length) {
    console.log('A maintenance pull request is already open; its branch is unchanged.');
  } else {
    let title = 'Sync canonical frontend design skill';
    let body = 'Updates the unmodified canonical skill and licence and records their upstream revision.\n\n- [ ] Review upstream changes and licence provenance.\n- [ ] Run CI on this branch and require the trusted full-history secret check.\n';
    const paths = kind === 'skill' ? ['.agents/skills/frontend-design/SKILL.md', '.agents/skills/frontend-design/LICENSE.txt', '.agents/skills/frontend-design/UPSTREAM.md'] : ['package.json', 'package-lock.json', 'docs/bootstrap-log.md', 'docs/roadmap.md'];
    if (kind === 'bootstrap') {
      if (JSON.parse(readFileSync('package.json', 'utf8')).dependencies.bootstrap !== candidate) throw new Error();
      title = `Upgrade Bootstrap to ${candidate}`;
      body = `Pins Bootstrap ${candidate} for a dedicated upgrade review. This draft still requires implementation and visual review before merge.\n\n- [ ] Review every entry in the feature map against the release.\n- [ ] Record renamed tokens, adopted components, removed workarounds and the custom CSS footprint.\n- [ ] Run check, unit, build, full browser and screenshot matrix, and the trusted full-history secret check.\n- [ ] Keep the CSS browser target at Bootstrap's support floor.\n`;
      appendFileSync('docs/bootstrap-log.md', `\n## ${candidate} — review pending\n\nCandidate pin prepared by the weekly registry check. Before merge, record token\nchanges, component adoption, workarounds and the app CSS footprint, and review\nthe feature map and full screenshot matrix.\n`);
      const roadmap = readFileSync('docs/roadmap.md', 'utf8');
      const marker = '### Feature map\n';
      if (!roadmap.includes(marker)) throw new Error();
      writeFileSync('docs/roadmap.md', roadmap.replace(marker, `${marker}\nBootstrap \`${candidate}\` upgrade review is pending. Review every mapping below\nbefore merging the candidate pin.\n`));
    }
    run('git', ['switch', '-c', branch]);
    run('git', ['add', '--', ...paths]);
    run('git', ['-c', 'user.name=Dayframe automation', '-c', 'user.email=automation@users.noreply.github.com', 'commit', '-m', title]);
    const authorization = Buffer.from(`x-access-token:${process.env.GH_TOKEN}`).toString('base64');
    run('git', ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${authorization}`, 'push', `https://github.com/${repository}.git`, `HEAD:refs/heads/${branch}`]);
    const file = join(temporary, 'body.md');
    writeFileSync(file, `${body}\nAutomation-created PRs need a maintainer to dispatch CI on this branch before review, because the default workflow token does not trigger another workflow.\n`);
    run('gh', ['pr', 'create', '--repo', repository, '--base', 'main', '--head', branch, '--title', title, '--body-file', file, '--draft']);
    console.log('Opened a dedicated maintenance draft pull request.');
  }
} catch {
  console.error('Maintenance pull request preparation failed. Review the run securely.');
  process.exitCode = 1;
} finally { rmSync(temporary, { recursive: true, force: true }); }

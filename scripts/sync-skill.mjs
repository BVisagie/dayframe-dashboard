import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = '.agents/skills/frontend-design';
/** Fetch only canonical upstream bytes; never save API author metadata.
 * @param {string} url @param {number} maximum @returns {Promise<Buffer>} */
async function download(url, maximum) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok || Number(response.headers.get('content-length') ?? 0) > maximum || !response.body) throw new Error('Cannot read canonical skill source.');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximum) throw new Error('Canonical skill source exceeds the safety limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** @param {string} path */
function safePath(path) {
  let current = root;
  for (const segment of path.split('/')) {
    current = resolve(current, segment);
    if (!current.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) throw new Error('Invalid sync path.');
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error('Skill sync refuses symlinks.');
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}

/** @param {boolean} [check] */
export async function syncSkill(check = false) {
  const metadata = JSON.parse((await download('https://api.github.com/repos/anthropics/skills/commits/main', 1024 * 1024)).toString('utf8'));
  const sha = metadata.sha;
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Canonical skill revision is invalid.');
  const names = ['SKILL.md', 'LICENSE.txt'];
  const files = await Promise.all(names.map(async name => ({ name, data: await download(`https://raw.githubusercontent.com/anthropics/skills/${sha}/skills/frontend-design/${name}`, 512 * 1024) })));
  if (!files[0].data.toString('utf8').startsWith('---\n') || !files[1].data.toString('utf8').includes('Apache License')) throw new Error('Review the upstream skill or licence format before syncing.');
  const changed = files.some(({ name, data }) => !existsSync(safePath(`${folder}/${name}`)) || !readFileSync(safePath(`${folder}/${name}`)).equals(data));
  if (changed && !check) {
    const manifestPath = safePath('.github/privacy-exceptions.json');
    /** @type {{path: string, sha256: string, kind: string}[]} */
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest)) throw new Error('Invalid legal exception manifest.');
    for (const { name, data } of files) {
      const path = `${folder}/${name}`;
      const sha256 = createHash('sha256').update(data).digest('hex');
      if (!manifest.some(entry => entry.path === path && entry.sha256 === sha256)) manifest.push({ path, sha256, kind: name === 'SKILL.md' ? 'vendored-skill' : 'legal-notice' });
    }
    // Historical digests remain valid for full-history scans after a sync.
    for (const { name, data } of files) {
      const path = safePath(`${folder}/${name}`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, data);
    }
    writeFileSync(safePath(`${folder}/UPSTREAM.md`), `# Upstream\n\n\`SKILL.md\` and \`LICENSE.txt\` are unmodified copies of the canonical\nfrontend-design skill.\n\n- Source: https://github.com/anthropics/skills/tree/${sha}/skills/frontend-design\n- Commit: \`${sha}\`\n- Licence: Apache License 2.0, see \`LICENSE.txt\`\n\nDo not edit these two upstream files. The weekly sync opens a reviewable pull\nrequest when their bytes change.\n`);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  console.log(changed ? 'Canonical skill update is available.' : 'Vendored skill matches canonical upstream bytes.');
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Use sync-skill [--check].');
    await syncSkill(process.argv.includes('--check'));
  } catch {
    console.error('Skill sync failed. Review canonical source availability and licence provenance.');
    process.exitCode = 1;
  }
}

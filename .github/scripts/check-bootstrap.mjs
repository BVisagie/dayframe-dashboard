import { appendFileSync, readFileSync } from 'node:fs';

/** @param {string} value */
function version(value) {
  const match = value.match(/^6\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
  return match ? { core: [6n, BigInt(match[1]), BigInt(match[2])], pre: match[3]?.split('.') ?? [] } : null;
}
/** @param {string} left @param {string} right */
function compare(left, right) {
  const a = version(left);
  const b = version(right);
  if (!a || !b) throw new Error();
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  if (!a.pre.length || !b.pre.length) return Number(!a.pre.length) - Number(!b.pre.length);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === b.pre[i]) continue;
    if (a.pre[i] === undefined || b.pre[i] === undefined) return a.pre[i] === undefined ? -1 : 1;
    const numericA = /^\d+$/.test(a.pre[i]);
    const numericB = /^\d+$/.test(b.pre[i]);
    if (numericA && numericB) return BigInt(a.pre[i]) > BigInt(b.pre[i]) ? 1 : -1;
    if (numericA !== numericB) return numericA ? -1 : 1;
    return a.pre[i] > b.pre[i] ? 1 : -1;
  }
  return 0;
}

try {
  const current = JSON.parse(readFileSync('package.json', 'utf8')).dependencies.bootstrap;
  if (typeof current !== 'string' || !version(current)) throw new Error();
  const response = await fetch('https://registry.npmjs.org/bootstrap', { signal: AbortSignal.timeout(30_000), redirect: 'error', headers: { Accept: 'application/vnd.npm.install-v1+json' } });
  if (!response.ok || !response.body) throw new Error();
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error();
    chunks.push(chunk);
  }
  const versions = Object.keys(JSON.parse(Buffer.concat(chunks).toString('utf8')).versions).filter(value => version(value) && compare(value, current) > 0).sort(compare);
  const candidate = versions.at(-1) ?? '';
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${candidate}\n`);
  console.log(candidate ? `Bootstrap ${candidate} is available for a dedicated review.` : 'The exact Bootstrap 6 pin is current.');
} catch {
  console.error('Bootstrap prerelease check failed; the current exact pin is unchanged.');
  process.exitCode = 1;
}

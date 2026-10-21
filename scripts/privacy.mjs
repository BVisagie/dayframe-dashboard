import { spawnSync } from 'node:child_process';
import { constants, fstatSync, lstatSync, openSync, closeSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const limit = { bytes: 32 * 1024 * 1024, total: 512 * 1024 * 1024, entries: 500_000, commits: 20_000, rules: 4096, time: 180_000 };
const exceptionFile = fileURLToPath(new URL('../.github/privacy-exceptions.json', import.meta.url));
/** @typedef {{path: string, sha256: string, kind: string}} Exception */
/** @typedef {{text: string, name: boolean}} Rule */
/** @param {string} message @returns {never} */
function fail(message) { throw new Error(message); }
/** @param {string} value */
function normalize(value) { return value.normalize('NFKC').toLocaleLowerCase('en-US'); }
/** @param {string} parent @param {string} child */
function inside(parent, child) { const path = relative(parent, child); return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path)); }

/** Load literal rules; only explicitly classified names qualify for legal exceptions.
 * @param {string} value @returns {Rule[]} */
export function parseDenylist(value) {
  if (Buffer.byteLength(value) > 1024 * 1024) fail('Denylist exceeds the safety limit.');
  const rules = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const name = line.startsWith('name:');
    const text = normalize(name ? line.slice(5).trim() : line);
    if (!text || text.includes('\0')) fail('Denylist has an invalid entry.');
    return { text, name };
  });
  if (!rules.length || rules.length > limit.rules) fail('A nonempty private denylist is required.');
  return rules;
}

/** @param {string} repository @param {NodeJS.ProcessEnv} environment */
export function loadDenylist(repository, environment) {
  const inline = environment.DAYFRAME_DENYLIST;
  const file = environment.DAYFRAME_DENYLIST_FILE;
  if (inline !== undefined && file !== undefined) fail('Choose one private denylist source.');
  if (inline !== undefined) return parseDenylist(inline);
  if (!file || !isAbsolute(file)) fail('An external private denylist is required.');
  try {
    const result = spawnSync('git', ['-c', 'core.fsmonitor=false', '-C', repository, 'rev-parse', '--show-toplevel'], { env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }, timeout: 5000, maxBuffer: 8192, stdio: ['ignore', 'pipe', 'pipe'] });
    const boundary = result.status === 0 ? realpathSync(result.stdout.toString().trim()) : realpathSync(repository);
    const actual = realpathSync(file);
    if (inside(boundary, actual) || inside(boundary, resolve(file))) fail('Private denylist must be outside the repository.');
    const info = statSync(actual);
    if (!info.isFile() || info.size > 1024 * 1024) fail('Invalid private denylist file.');
    return parseDenylist(readFileSync(actual, 'utf8'));
  } catch { return fail('Cannot load the external private denylist.'); }
}

/** Scan without invoking a shell, diff driver, filter, hook, or candidate code.
 * @param {{repository: string, rules: Rule[], history?: boolean, tree?: string, exceptions?: Exception[]}} options */
export function scanRepository({ repository, rules, history = false, tree = 'worktree', exceptions }) {
  const start = Date.now();
  let total = 0;
  let entries = 0;
  let findings = false;
  const root = realpathSync(repository);
  const env = { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' };
  /** @param {string[]} args @param {number} [maxBuffer] */
  function git(args, maxBuffer = limit.bytes) {
    const remaining = limit.time - (Date.now() - start);
    if (remaining <= 0) fail('Privacy scan exceeded the safety limit.');
    const result = spawnSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', root, ...args], { env, timeout: Math.min(remaining, 30_000), maxBuffer, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status !== 0 || result.error) fail('Cannot inspect all Git data safely.');
    return result.stdout;
  }
  if (history && git(['rev-parse', '--is-shallow-repository']).toString().trim() !== 'false') fail('Full Git history is required.');
  /** @type {Exception[]} */
  const approved = exceptions ?? JSON.parse(readFileSync(exceptionFile, 'utf8'));
  if (!Array.isArray(approved) || approved.some(item => !item || typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) || !['project-license', 'legal-notice', 'vendored-skill'].includes(item.kind))) fail('Invalid legal exception manifest.');
  /** @param {Buffer} data @param {boolean} [permitNames] */
  function inspect(data, permitNames = false) {
    total += data.length;
    if (data.length > limit.bytes || total > limit.total || Date.now() - start > limit.time) fail('Privacy scan exceeded the safety limit.');
    // No binary extension is skipped. UTF-16 views also expose interleaved text.
    const swapped = Buffer.from(data);
    if (swapped.length % 2) swapped[swapped.length - 1] = 0;
    swapped.subarray(0, swapped.length - swapped.length % 2).swap16();
    const text = [data.toString('utf8'), data.toString('utf16le'), swapped.toString('utf16le')].map(normalize);
    if (rules.some(rule => !(permitNames && rule.name) && text.some(value => value.includes(rule.text)))) findings = true;
  }
  /** @param {string} path @param {Buffer} data */
  function permitted(path, data) {
    return approved.some(item => item.path === path && item.sha256 === createHash('sha256').update(data).digest('hex'));
  }
  const seen = new Set();
  /** @param {string} path @param {string} oid */
  function blob(path, oid) {
    inspect(Buffer.from(path));
    const exemption = approved.some(item => item.path === path);
    const key = `${oid}:${exemption ? path : ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    const size = Number(git(['cat-file', '-s', oid]).toString().trim());
    if (!Number.isSafeInteger(size) || size > limit.bytes || size < 0) fail('Git object exceeds the safety limit.');
    const data = git(['cat-file', 'blob', oid]);
    inspect(data, exemption && permitted(path, data));
  }
  /** @param {string} revision */
  function scanTree(revision) {
    if (!/^[a-f0-9]{40,64}$/.test(revision)) fail('Invalid Git revision.');
    for (const record of git(['ls-tree', '-r', '-z', revision]).toString('utf8').split('\0').filter(Boolean)) {
      if (++entries > limit.entries) fail('Git tree exceeds the safety limit.');
      const match = record.match(/^(\d+) (blob|commit) ([a-f0-9]{40,64})\t([\s\S]+)$/);
      if (!match || match[2] !== 'blob') fail('Submodules and unknown Git entries are not permitted.');
      blob(match[4], match[3]);
    }
  }
  if (tree === 'worktree') {
    for (const record of git(['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean)) {
      if (++entries > limit.entries) fail('Git tree exceeds the safety limit.');
      const match = record.match(/^(\d+) ([a-f0-9]{40,64}) 0\t([\s\S]+)$/);
      if (!match || match[1] === '160000') fail('Resolve Git conflicts and submodules before scanning.');
      const path = match[3];
      inspect(Buffer.from(path));
      const absolute = resolve(root, path);
      if (!inside(root, absolute)) fail('Tracked path escapes the repository.');
      let current = root;
      for (const part of relative(root, absolute).split(sep)) {
        current = resolve(current, part);
        if (lstatSync(current).isSymbolicLink()) fail('Tracked working-tree symlinks are not permitted; scan a Git tree instead.');
      }
      const descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const info = fstatSync(descriptor);
        if (!info.isFile() || info.size > limit.bytes) fail('Tracked file exceeds the safety limit.');
        const data = readFileSync(descriptor);
        inspect(data, permitted(path, data));
      } finally { closeSync(descriptor); }
    }
  } else {
    const revision = git(['rev-parse', '--verify', '--end-of-options', `${tree}^{commit}`]).toString().trim();
    scanTree(revision);
  }
  if (history) {
    const commits = git(['rev-list', '--all']).toString().trim().split('\n').filter(Boolean);
    if (!commits.length || commits.length > limit.commits) fail('Git history exceeds the safety limit.');
    const trees = new Set();
    for (const oid of commits) {
      const commit = git(['cat-file', 'commit', oid]);
      const split = commit.indexOf('\n\n');
      if (split < 0) fail('Invalid Git commit.');
      inspect(commit.subarray(split + 2));
      const treeId = commit.toString('utf8', 0, split).match(/^tree ([a-f0-9]{40,64})\n/)?.[1];
      if (!treeId) fail('Invalid Git commit tree.');
      if (!trees.has(treeId)) { trees.add(treeId); scanTree(treeId); }
    }
    // Annotated tag messages are project text too.
    for (const line of git(['for-each-ref', '--format=%(objecttype) %(objectname)', 'refs/tags']).toString().trim().split('\n')) {
      if (line.startsWith('tag ')) inspect(git(['cat-file', 'tag', line.slice(4)]));
    }
  }
  if (findings) fail('Private denylist check failed. Sensitive details are withheld.');
  return { entries };
}

/** @param {string[]} args */
export function main(args) {
  try {
    let repository = process.cwd();
    let history = false;
    let tree = 'worktree';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--history') history = true;
      else if (args[i] === '--tree') tree = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'HEAD';
      else if (args[i] === '--repository' && args[i + 1]) repository = resolve(args[++i]);
      else fail('Usage: privacy [--history] [--tree [revision]] [--repository directory]');
    }
    scanRepository({ repository, history, tree, rules: loadDenylist(repository, process.env) });
    console.log('Private denylist check passed.');
    return 0;
  } catch {
    // Errors from Git and the filesystem can contain private paths or matches.
    console.error('Private denylist check failed. Configure a nonempty external denylist and inspect locally. Details are withheld.');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main(process.argv.slice(2));

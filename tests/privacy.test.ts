import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseDenylist, loadDenylist, scanRepository } from '../scripts/privacy.mjs';

const cli = resolve('scripts/privacy.mjs');
const forbidden = 'imaginary-cobalt-private-token';

function fixture() {
  const outer = mkdtempSync(join(tmpdir(), 'dayframe-privacy-test-'));
  const repository = join(outer, 'repository');
  mkdirSync(repository);
  const git = (...args: string[]) => {
    const result = spawnSync('git', ['-C', repository, '-c', 'user.name=Fixture Bot', '-c', 'user.email=fixture@example.invalid', ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });
    assert.equal(result.status, 0, 'fixture Git command must succeed');
    return result.stdout.trim();
  };
  git('init', '--initial-branch=main');
  writeFileSync(join(repository, 'sample.txt'), 'Invented sample.');
  git('add', '.');
  git('commit', '-m', 'Create invented fixture');
  const scan = (options: Partial<Parameters<typeof scanRepository>[0]> = {}) => scanRepository({ repository, rules: parseDenylist(forbidden), exceptions: [], ...options });
  return { outer, repository, git, scan, close: () => rmSync(outer, { recursive: true, force: true }) };
}

test('denylist must be explicit, nonempty, bounded and unambiguous', () => {
  for (const input of ['', '\n \n', 'name:', 'invalid\0entry', 'x'.repeat(1024 * 1024 + 1)]) assert.throws(() => parseDenylist(input));
  assert.deepEqual(parseDenylist('  Fictitious Token\nname:Invented Legal Name\r\n'), [{ text: 'fictitious token', name: false }, { text: 'invented legal name', name: true }]);
  const f = fixture();
  try {
    for (const environment of [{}, { DAYFRAME_DENYLIST: '' }, { DAYFRAME_DENYLIST_FILE: 'relative-list.txt' }, { DAYFRAME_DENYLIST: forbidden, DAYFRAME_DENYLIST_FILE: '/unused' }]) assert.throws(() => loadDenylist(f.repository, environment));
    const external = join(f.outer, 'private-list.txt');
    writeFileSync(external, forbidden);
    assert.equal(loadDenylist(f.repository, { DAYFRAME_DENYLIST_FILE: external }).length, 1);
    const internal = join(f.repository, 'private-list.txt');
    writeFileSync(internal, forbidden);
    assert.throws(() => loadDenylist(f.repository, { DAYFRAME_DENYLIST_FILE: internal }));
    const alias = join(f.outer, 'alias.txt');
    symlinkSync(internal, alias);
    assert.throws(() => loadDenylist(f.repository, { DAYFRAME_DENYLIST_FILE: alias }));
    mkdirSync(join(f.repository, 'nested'));
    assert.throws(() => loadDenylist(join(f.repository, 'nested'), { DAYFRAME_DENYLIST_FILE: internal }));
  } finally { f.close(); }
});

test('tracked working contents include dirty files, binary data and Unicode variants', () => {
  const f = fixture();
  try {
    assert.doesNotThrow(() => f.scan());
    for (const contents of [Buffer.from(forbidden.toUpperCase()), Buffer.concat([Buffer.from([0, 255, 0]), Buffer.from(forbidden)]), Buffer.from(forbidden, 'utf16le'), Buffer.from(forbidden, 'utf16le').swap16(), Buffer.from('ｉmaginary-cobalt-private-token')]) {
      writeFileSync(join(f.repository, 'sample.txt'), contents);
      assert.throws(() => f.scan(), /Sensitive details are withheld/);
    }
    assert.doesNotThrow(() => f.scan({ tree: 'HEAD' }));
  } finally { f.close(); }
});

test('history finds deleted contents, historical paths and messages across branches', () => {
  for (const location of ['blob', 'path', 'message', 'branch', 'tag']) {
    const f = fixture();
    try {
      if (location === 'branch') f.git('checkout', '-b', 'old-fixture');
      if (location === 'blob' || location === 'branch') writeFileSync(join(f.repository, 'sample.txt'), forbidden);
      if (location === 'path') writeFileSync(join(f.repository, `${forbidden}.txt`), 'Invented sample.');
      f.git('add', '.');
      f.git('commit', '--allow-empty', '-m', location === 'message' ? forbidden : 'Change invented fixture');
      if (location === 'tag') f.git('tag', '-a', 'fixture-tag', '-m', forbidden);
      if (location === 'branch') f.git('checkout', 'main');
      else {
        writeFileSync(join(f.repository, 'sample.txt'), 'Invented sample.');
        rmSync(join(f.repository, `${forbidden}.txt`), { force: true });
        f.git('add', '-A');
        f.git('commit', '--allow-empty', '-m', 'Remove invented token');
      }
      assert.doesNotThrow(() => f.scan({ tree: 'HEAD' }));
      assert.throws(() => f.scan({ history: true, tree: 'HEAD' }), /Sensitive details are withheld/);
    } finally { f.close(); }
  }
});

test('legal name exception requires exact bytes and path and never exempts general tokens', () => {
  const f = fixture();
  try {
    const legal = Buffer.from(`Mandatory notice for ${forbidden}.`);
    const exceptions = [{ path: 'sample.txt', sha256: createHash('sha256').update(legal).digest('hex'), kind: 'legal-notice' }];
    writeFileSync(join(f.repository, 'sample.txt'), legal);
    const options = { exceptions, rules: parseDenylist(`name:${forbidden}`) };
    assert.doesNotThrow(() => f.scan(options));
    assert.throws(() => f.scan({ exceptions }));
    writeFileSync(join(f.repository, 'sample.txt'), Buffer.concat([legal, Buffer.from('\nChanged') ]));
    assert.throws(() => f.scan(options));
    writeFileSync(join(f.repository, 'sample.txt'), legal);
    writeFileSync(join(f.repository, 'authored.txt'), legal);
    f.git('add', '.');
    f.git('commit', '-m', 'Duplicate legal text in authored content');
    assert.throws(() => f.scan({ ...options, tree: 'HEAD', history: true }));
  } finally { f.close(); }
});

test('Git object scan treats symlink targets as data and working scan refuses symlinks', () => {
  const f = fixture();
  try {
    const external = join(f.outer, 'outside.txt');
    writeFileSync(external, forbidden);
    symlinkSync(external, join(f.repository, 'link.txt'));
    f.git('add', '.');
    f.git('commit', '-m', 'Add invented symlink fixture');
    assert.throws(() => f.scan(), /symlink/);
    assert.doesNotThrow(() => f.scan({ tree: 'HEAD', history: true }));
    symlinkSync(forbidden, join(f.repository, 'private-link.txt'));
    f.git('add', '.');
    f.git('commit', '-m', 'Add invented target fixture');
    assert.throws(() => f.scan({ tree: 'HEAD', history: true }));
  } finally { f.close(); }
});

test('shallow history, oversized files and malformed arguments fail closed', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repository, 'sample.txt'), Buffer.alloc(32 * 1024 * 1024 + 1));
    assert.throws(() => f.scan(), /safety limit/);
    const shallow = join(f.outer, 'shallow');
    const clone = spawnSync('git', ['clone', '--depth=1', `file://${f.repository}`, shallow], { stdio: 'ignore' });
    assert.equal(clone.status, 0);
    assert.throws(() => f.scan({ repository: shallow, tree: 'HEAD', history: true }), /Full Git history/);
    for (const args of [[], ['--unknown'], ['--repository'], ['--tree', '--bad']]) {
      const output = spawnSync(process.execPath, [cli, ...args], { cwd: f.repository, encoding: 'utf8', env: { PATH: process.env.PATH } });
      assert.equal(output.status, 1);
      assert.doesNotMatch(output.stderr + output.stdout, new RegExp(forbidden));
      assert.ok(!(output.stderr + output.stdout).includes(f.outer));
    }
  } finally { f.close(); }
});

test('CLI with a valid denylist never prints sensitive matches or filenames', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repository, `${forbidden}.txt`), forbidden);
    f.git('add', '.');
    const output = spawnSync(process.execPath, [cli, '--history'], { cwd: f.repository, encoding: 'utf8', env: { PATH: process.env.PATH, DAYFRAME_DENYLIST: forbidden } });
    assert.equal(output.status, 1);
    assert.doesNotMatch(output.stderr + output.stdout, new RegExp(forbidden));
    assert.ok(!(output.stderr + output.stdout).includes(f.outer));
  } finally { f.close(); }
});

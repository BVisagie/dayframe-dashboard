import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const policy = mkdtempSync(join(tmpdir(), 'dayframe-secret-policy-'));
try {
  writeFileSync(join(policy, 'gitleaks.toml'), '[extend]\nuseDefault = true\n');
  writeFileSync(join(policy, 'empty'), '');
  const result = spawnSync('docker', [
    'run', '--rm', '--network=none', '--read-only', '--memory=512m', '--cpus=2', '--pids-limit=128', `--user=${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    '-v', `${resolve(process.argv[2] ?? '.')}:/scan:ro`, '-v', `${policy}:/policy:ro`,
    'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f',
    'git', '/scan', '--log-opts=--all --full-history', '--config=/policy/gitleaks.toml', '--gitleaks-ignore-path=/policy/empty',
    '--ignore-gitleaks-allow', '--redact=100', '--no-banner', '--timeout=180', '--max-decode-depth=5', '--max-archive-depth=3',
  ], { timeout: 240_000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0 || result.error) throw new Error();
  console.log('Secret history check passed.');
} catch {
  console.error('Secret history check failed. Details are withheld; inspect securely with gitleaks locally.');
  process.exitCode = 1;
} finally { rmSync(policy, { recursive: true, force: true }); }

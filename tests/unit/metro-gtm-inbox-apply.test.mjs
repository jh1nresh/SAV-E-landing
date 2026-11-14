import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const applyScript = join(repoRoot, 'scripts/metro-gtm-inbox-apply.mjs');

function writeFakeGh(binDir) {
  const ghPath = join(binDir, 'gh');
  const source = [
    '#!/usr/bin/env node',
    "import { appendFileSync } from 'node:fs';",
    'const log = process.env.GH_CALL_LOG;',
    "if (log) appendFileSync(log, process.argv.slice(2).join(' ') + '\\n');",
    "const mode = process.env.GH_FAKE_MODE || 'fail';",
    "if (mode === 'fail') {",
    "  process.stdout.write('{\"not\":\"the diagnostic\"}\\n');",
    "  process.stderr.write('simulated api failure\\n');",
    '  process.exit(2);',
    '}',
    "if (mode === 'large') {",
    '  const repo = process.env.GH_REPO;',
    '  const pr = {',
    '    number: 7,',
    "    title: 'landed',",
    "    body: '<!-- metro-inbox-delivery: test-key-1 -->\\n| Dedupe key | `test-key-1` |',",
    "    merged_at: '2026-11-01T00:00:00Z',",
    "    head: { ref: 'content/metro-inbox/test', repo: { full_name: repo } },",
    '  };',
    '  const pad = {',
    '    number: 8,',
    "    title: 'pad',",
    "    body: 'x'.repeat(1024 * 1024 + 8192),",
    '    merged_at: null,',
    "    head: { ref: 'nope', repo: null },",
    '  };',
    "  const payload = JSON.stringify(pr) + '\\n' + JSON.stringify(pad) + '\\n';",
    '  process.stdout.write(payload, () => process.exit(0));',
    '} else {',
    "  process.stderr.write('unexpected GH_FAKE_MODE ' + mode + '\\n');",
    '  process.exit(1);',
    '}',
    '',
  ].join('\n');
  writeFileSync(ghPath, source);
  chmodSync(ghPath, 0o755);
}

function runApply(dir, plan, env) {
  const planPath = join(dir, 'plan.json');
  writeFileSync(planPath, JSON.stringify(plan));
  return spawnSync(process.execPath, [
    applyScript,
    '--plan', planPath,
    '--work-root', join(dir, 'pr-work'),
  ], {
    encoding: 'utf8',
    cwd: dir,
    env,
    maxBuffer: 4 * 1024 * 1024,
  });
}

test('empty plan exits 0 and does not call gh', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inbox-apply-empty-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFakeGh(bin);
    const callLog = join(dir, 'gh-calls.log');
    writeFileSync(callLog, '');
    const result = runApply(dir, { generated_at: '', packages: [] }, {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GH_CALL_LOG: callLog,
      GH_FAKE_MODE: 'fail',
      GH_TOKEN: '',
      GH_REPO: '',
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, /0 packages, nothing to apply/);
    assert.equal(readFileSync(callLog, 'utf8'), '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pull listing larger than 1MB does not throw and still reads delivery keys', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inbox-apply-large-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFakeGh(bin);
    const callLog = join(dir, 'gh-calls.log');
    writeFileSync(callLog, '');
    const result = runApply(dir, {
      packages: [{
        action: 'content_pr',
        packageDir: '2026-11-01',
        branch: 'content/metro-inbox/test',
        deliveryKey: 'test-key-1',
        title: 't',
        body: 'b',
        files: [],
      }],
    }, {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GH_CALL_LOG: callLog,
      GH_FAKE_MODE: 'large',
      GH_TOKEN: 'test-token',
      GH_REPO: 'example/repo',
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, /Delivery test-key-1 already landed/);
    const calls = readFileSync(callLog, 'utf8').trim().split('\n').filter(Boolean);
    assert.equal(calls.length, 2, calls.join('\n'));
    assert.match(calls[0], /pulls\?state=open/);
    assert.match(calls[1], /pulls\?state=closed/);
    assert.equal(calls.some(line => line.includes('pr create') || line.includes('issue')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh failure surfaces stderr instead of the response body', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inbox-apply-fail-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    writeFakeGh(bin);
    const result = runApply(dir, {
      packages: [{ action: 'skip', packageDir: '2026-11-01', reason: 'test' }],
    }, {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GH_FAKE_MODE: 'fail',
      GH_TOKEN: 'test-token',
      GH_REPO: 'example/repo',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /simulated api failure/);
    assert.match(result.stderr, /exit 2/);
    assert.equal(result.stderr.includes('the diagnostic'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

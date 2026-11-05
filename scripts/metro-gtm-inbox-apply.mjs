#!/usr/bin/env node
/**
 * Apply an inbox-sync plan: upsert one blocking issue per failed package,
 * open/update content-only PRs for ready packages. Invoked from Actions.
 *
 * Requires env: GH_TOKEN, GH_REPO
 * Args: --plan inbox-sync-plan.json --work-root pr-work
 */
import { readFileSync, mkdirSync, cpSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { contentOnly } from './metro-content-gate.mjs';

function argValue(argv, name, fallback = null) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  return argv[i + 1] ?? fallback;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')}\n${res.stderr || res.stdout}`);
  }
  return (res.stdout || '').trim();
}

function gh(args) {
  return run('gh', args);
}

const argv = process.argv.slice(2);
const planPath = resolve(argValue(argv, '--plan', 'inbox-sync-plan.json'));
const workRoot = resolve(argValue(argv, '--work-root', 'pr-work'));
const repo = process.env.GH_REPO;
const token = process.env.GH_TOKEN;
if (!repo || !token) throw new Error('GH_REPO and GH_TOKEN required');

const plan = JSON.parse(readFileSync(planPath, 'utf8'));

function upsertIssue(title, body) {
  const existingRaw = gh([
    'issue', 'list', '--state', 'open', '--limit', '50',
    '--json', 'number,title',
  ]);
  const hits = JSON.parse(existingRaw).filter(i => i.title === title);
  if (hits[0]) {
    gh(['issue', 'edit', String(hits[0].number), '--body', body]);
    console.log(`Updated issue #${hits[0].number}`);
    return hits[0].number;
  }
  const url = gh(['issue', 'create', '--title', title, '--body', body]);
  console.log(`Opened issue ${url}`);
  return url;
}

function findOpenContentPr(branch) {
  const json = gh(['pr', 'list', '--state', 'open', '--head', branch, '--json', 'number,body,url']);
  return JSON.parse(json)[0] || null;
}

for (const entry of plan.packages || []) {
  if (entry.action === 'skip') {
    console.log(`skip ${entry.packageDir}: ${entry.reason}`);
    continue;
  }
  if (entry.action === 'issue') {
    upsertIssue(entry.issueTitle, entry.issueBody);
    continue;
  }
  if (entry.action !== 'content_pr') continue;

  const existing = findOpenContentPr(entry.branch);
  if (existing?.body?.includes(entry.deliveryKey)) {
    console.log(`PR #${existing.number} already has delivery ${entry.deliveryKey}; skip`);
    continue;
  }

  rmSync(workRoot, { recursive: true, force: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
  run('git', ['clone', '--depth', '1', '--branch', 'main', cloneUrl, workRoot]);
  run('git', ['-C', workRoot, 'config', 'user.name', 'savvy-landing-metro-inbox']);
  run('git', ['-C', workRoot, 'config', 'user.email', 'metro-inbox[bot]@users.noreply.github.com']);
  run('git', ['-C', workRoot, 'checkout', '-B', entry.branch]);

  for (const file of entry.files) {
    const dest = resolve(workRoot, file.dest);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    cpSync(file.src, dest);
  }
  run('git', ['-C', workRoot, 'add', '--', ...entry.files.map(f => f.dest)]);
  const porcelain = run('git', ['-C', workRoot, 'status', '--porcelain']);
  if (!porcelain) {
    console.log(`No file changes for ${entry.branch}`);
    continue;
  }
  const staged = run('git', ['-C', workRoot, 'diff', '--cached', '--name-only'])
    .split('\n').filter(Boolean);
  if (!contentOnly(staged)) {
    throw new Error(`Refusing to push non-content paths for ${entry.branch}: ${staged.join(', ')}`);
  }
  run('git', ['-C', workRoot, 'commit', '-m', entry.title]);
  run('git', ['-C', workRoot, 'push', '-u', 'origin', `HEAD:${entry.branch}`]);

  if (existing) {
    gh(['pr', 'edit', String(existing.number), '--title', entry.title, '--body', entry.body]);
    console.log(`Updated PR #${existing.number} ${existing.url}`);
  } else {
    const url = gh([
      'pr', 'create', '--base', 'main', '--head', entry.branch,
      '--title', entry.title, '--body', entry.body,
    ]);
    console.log(`Opened PR ${url}`);
  }
}

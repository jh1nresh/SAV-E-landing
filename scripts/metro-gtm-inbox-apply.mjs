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
  // Paginate via REST so a blocked issue beyond the first page is updated, not duplicated.
  // `gh issue list` has no --page; `gh api --paginate --slurp` returns every page.
  const pages = JSON.parse(gh([
    'api', '--paginate', '--slurp',
    `repos/${repo}/issues?state=open&per_page=100`,
  ]));
  const issues = pages.flat().filter(i => !i.pull_request);
  const hits = issues.filter(i => i.title === title);
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

function extractDeliveryKeys(body, keys) {
  for (const m of (body || '').matchAll(/<!-- metro-inbox-delivery:\s*([^\s]+)\s*-->/g)) {
    keys.add(m[1]);
  }
  for (const m of (body || '').matchAll(/\| Dedupe key \| `([^`]+)` \|/g)) {
    keys.add(m[1]);
  }
}

/** Collect delivery keys from open PRs and merged PRs only (paginated). Closed-unmerged must not count as landed. */
function knownDeliveryKeys() {
  const keys = new Set();
  for (const state of ['open', 'closed']) {
    const pages = JSON.parse(gh([
      'api', '--paginate', '--slurp',
      `repos/${repo}/pulls?state=${state}&per_page=100`,
    ]));
    for (const pr of pages.flat()) {
      if (state === 'closed' && !pr.merged_at) continue;
      // Same-repo only: fork PR bodies must not poison the replay guard.
      const headRepo = pr.head?.repo?.full_name;
      if (!headRepo || headRepo !== repo) continue;
      extractDeliveryKeys(pr.body || '', keys);
    }
  }
  return keys;
}

function ensureContentPr(existing, entry) {
  if (existing) {
    gh(['pr', 'edit', String(existing.number), '--title', entry.title, '--body', entry.body]);
    console.log(`Updated PR #${existing.number} ${existing.url}`);
    return;
  }
  const url = gh([
    'pr', 'create', '--base', 'main', '--head', entry.branch,
    '--title', entry.title, '--body', entry.body,
  ]);
  console.log(`Opened PR ${url}`);
}

const landedDeliveries = knownDeliveryKeys();
const failures = [];

for (const entry of plan.packages || []) {
  try {
  if (entry.action === 'skip') {
    console.log(`skip ${entry.packageDir}: ${entry.reason}`);
    continue;
  }
  if (entry.action === 'issue') {
    upsertIssue(entry.issueTitle, entry.issueBody);
    continue;
  }
  if (entry.action !== 'content_pr') continue;

  if (entry.deliveryKey && landedDeliveries.has(entry.deliveryKey)) {
    console.log(`Delivery ${entry.deliveryKey} already landed (open or merged PR); skip`);
    continue;
  }

  const existing = findOpenContentPr(entry.branch);
  if (existing?.body?.includes(entry.deliveryKey)) {
    console.log(`PR #${existing.number} already has delivery ${entry.deliveryKey}; skip`);
    continue;
  }

  rmSync(workRoot, { recursive: true, force: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
  // Prefer an existing remote content branch (open PR, or retained after squash-merge).
  // Recreating from main alone cannot fast-forward a retained tip and aborts the whole sync.
  const remoteTips = run('git', ['ls-remote', '--heads', cloneUrl, entry.branch]);
  const retainedRemote = Boolean(remoteTips);
  if (existing || retainedRemote) {
    run('git', ['clone', '--branch', entry.branch, cloneUrl, workRoot]);
  } else {
    run('git', ['clone', '--depth', '1', '--branch', 'main', cloneUrl, workRoot]);
    run('git', ['-C', workRoot, 'checkout', '-B', entry.branch]);
  }
  // Identity must be set before any merge/commit that creates a commit object.
  run('git', ['-C', workRoot, 'config', 'user.name', 'savvy-landing-metro-inbox']);
  run('git', ['-C', workRoot, 'config', 'user.email', 'metro-inbox[bot]@users.noreply.github.com']);

  let mergedMain = false;
  if (existing || retainedRemote) {
    run('git', ['-C', workRoot, 'fetch', 'origin', 'main']);
    const before = run('git', ['-C', workRoot, 'rev-parse', 'HEAD']);
    run('git', ['-C', workRoot, 'merge', '--no-edit', 'origin/main']);
    const after = run('git', ['-C', workRoot, 'rev-parse', 'HEAD']);
    mergedMain = before !== after;
  }

  for (const file of entry.files) {
    const dest = resolve(workRoot, file.dest);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    cpSync(file.src, dest);
  }
  run('git', ['-C', workRoot, 'add', '--', ...entry.files.map(f => f.dest)]);
  const porcelain = run('git', ['-C', workRoot, 'status', '--porcelain']);
  if (!porcelain) {
    // Merge-only: still push so an open/retained branch tracks current main.
    if ((existing || retainedRemote) && mergedMain) {
      run('git', ['-C', workRoot, 'push', '-u', 'origin', `HEAD:${entry.branch}`]);
      console.log(`Pushed main-merge (no delivery file changes) for ${entry.branch}`);
      ensureContentPr(existing, entry);
    } else if (!existing && retainedRemote) {
      // Push succeeded earlier but PR create failed/interrupted: recover the missing PR.
      run('git', ['-C', workRoot, 'fetch', 'origin', 'main']);
      const ahead = Number(run('git', ['-C', workRoot, 'rev-list', '--count', 'origin/main..HEAD']) || '0');
      if (ahead > 0) {
        ensureContentPr(null, entry);
      } else {
        console.log(`No file changes for ${entry.branch}`);
      }
    } else {
      console.log(`No file changes for ${entry.branch}`);
    }
    if (entry.deliveryKey) landedDeliveries.add(entry.deliveryKey);
    continue;
  }
  const staged = run('git', ['-C', workRoot, 'diff', '--cached', '--name-only'])
    .split('\n').filter(Boolean);
  if (!contentOnly(staged)) {
    throw new Error(`Refusing to push non-content paths for ${entry.branch}: ${staged.join(', ')}`);
  }
  run('git', ['-C', workRoot, 'commit', '-m', entry.title]);
  run('git', ['-C', workRoot, 'push', '-u', 'origin', `HEAD:${entry.branch}`]);

  ensureContentPr(existing, entry);
  if (entry.deliveryKey) landedDeliveries.add(entry.deliveryKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed ${entry.packageDir || entry.branch || entry.action}: ${msg}`);
    failures.push({ packageDir: entry.packageDir, branch: entry.branch, error: msg });
  }
}

if (failures.length) {
  throw new Error(`metro-gtm-inbox-apply failed ${failures.length} package(s): ${failures.map(f => f.packageDir || f.branch).join(', ')}`);
}

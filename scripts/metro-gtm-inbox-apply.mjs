#!/usr/bin/env node
/**
 * Apply an inbox-sync plan: upsert one blocking issue per failed package,
 * open/update content-only PRs for ready packages. Invoked from Actions.
 *
 * Requires env: GH_TOKEN, GH_REPO when the plan has packages.
 * An empty plan logs and exits 0 before any GitHub API call.
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

// Closed pull listings are full objects: 58 PRs were 1,063,401 bytes on
// 2026-11-13, just over spawnSync's 1MB default. That kills gh with
// status null / SIGPIPE / ENOBUFS and an empty stderr. Keep headroom for
// bodies to grow; the pulls query itself is also narrowed with --jq.
const SPAWN_MAX_BUFFER = 32 * 1024 * 1024;

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: SPAWN_MAX_BUFFER,
    ...opts,
  });
  if (res.error || res.status !== 0) {
    const status = res.status == null
      ? `status null${res.signal ? ` signal ${res.signal}` : ''}`
      : `exit ${res.status}`;
    const spawnError = res.error
      ? `${res.error.code || 'error'}: ${res.error.message}`
      : '';
    const stderr = (res.stderr || '').trim();
    const detail = [status, spawnError, stderr].filter(Boolean).join('\n');
    throw new Error(`${cmd} ${args.join(' ')}\n${detail}`);
  }
  return (res.stdout || '').trim();
}

// `gh api --paginate --jq` prints one JSON value per line. `--slurp` cannot
// be combined with `--jq`. A single JSON array (or an array of pages) is
// accepted too, so a fixture can feed the same parser.
function parseGhJsonList(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.flat();
    return [parsed];
  } catch {
    const items = [];
    for (const line of trimmed.split('\n')) {
      const row = line.trim();
      if (!row) continue;
      const parsed = JSON.parse(row);
      if (Array.isArray(parsed)) items.push(...parsed);
      else items.push(parsed);
    }
    return items;
  }
}

function gh(args) {
  return run('gh', args);
}

const argv = process.argv.slice(2);
const planPath = resolve(argValue(argv, '--plan', 'inbox-sync-plan.json'));
const workRoot = resolve(argValue(argv, '--work-root', 'pr-work'));
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.packages) || plan.packages.length === 0) {
  console.log('0 packages, nothing to apply');
  process.exit(0);
}

const repo = process.env.GH_REPO;
const token = process.env.GH_TOKEN;
if (!repo || !token) throw new Error('GH_REPO and GH_TOKEN required');

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

// Fields the replay guard reads. Full pull payloads repeat head.repo and
// base.repo on every row; that, not the bodies, pushed the closed list
// past 1MB. merged_at drops closed-unmerged PRs. head.repo.full_name drops forks.
const PULL_FIELDS_JQ = '.[] | {number, title, body, merged_at, head: {ref: .head.ref, repo: (if .head.repo == null then null else {full_name: .head.repo.full_name} end)}}';

/** Collect delivery keys from open PRs and merged PRs only (paginated). Closed-unmerged must not count as landed. */
function knownDeliveryKeys() {
  const keys = new Set();
  for (const state of ['open', 'closed']) {
    const pulls = parseGhJsonList(gh([
      'api', '--paginate',
      `repos/${repo}/pulls?state=${state}&per_page=100`,
      '--jq', PULL_FIELDS_JQ,
    ]));
    for (const pr of pulls) {
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

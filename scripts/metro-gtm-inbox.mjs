/** GTM inbox contract: package shape, hashing, readiness, and content-PR planning. */
import { createHash } from 'node:crypto';
import {
  existsSync, readdirSync, readFileSync, lstatSync,
  mkdirSync, cpSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { isCalendarDate } from '../lib/metro-logic.mjs';
import { isAllowedMetroContentPath } from './metro-content-gate.mjs';

const error = (message) => { throw new Error(`gtm-inbox: ${message}`); };

export const INBOX_BRANCH = 'gtm/inbox';
export const CONTENT_PR_BRANCH_PREFIX = 'content/metro-inbox/';
export const ISSUE_TITLE_PREFIX = '[metro-inbox] blocked:';

export function folderForStation(n, slug) {
  return `${String(n).padStart(2, '0')}-${slug}`;
}

export function hashFile(path) {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

export function hashBuffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Stable content hash over sorted relative paths + file digests (and manifest identity). */
export function computePackageContentHash(packageDir, fileRelPaths) {
  const hash = createHash('sha256');
  for (const rel of [...fileRelPaths].sort()) {
    hash.update(rel);
    hash.update('\0');
    hash.update(readFileSync(resolve(packageDir, rel)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function readManifest(packageDir) {
  const path = resolve(packageDir, 'manifest.json');
  if (!existsSync(path)) error(`missing manifest.json in ${packageDir}`);
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  validateManifest(manifest);
  return manifest;
}

export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') error('manifest must be an object');
  if (manifest.schema_version !== 1) error('manifest.schema_version must be 1');
  if (typeof manifest.delivery_version !== 'string' || !manifest.delivery_version.trim()) {
    error('manifest.delivery_version required');
  }
  if (!isCalendarDate(manifest.date)) error('manifest.date must be YYYY-MM-DD');
  if (!Number.isSafeInteger(manifest.station_n) || manifest.station_n < 1) error('manifest.station_n invalid');
  if (typeof manifest.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.slug)) {
    error('manifest.slug invalid');
  }
  if (typeof manifest.station !== 'string' || !manifest.station) error('manifest.station required');
  if (typeof manifest.ready_for_site !== 'boolean') error('manifest.ready_for_site must be boolean');
  if (!manifest.files || typeof manifest.files !== 'object') error('manifest.files required');
  if (manifest.files.web_json !== 'web.json') error('manifest.files.web_json must be "web.json"');
  for (const kind of ['photos', 'slides']) {
    const list = manifest.files[kind];
    if (!Array.isArray(list) || list.length === 0) error(`manifest.files.${kind} must be a nonempty array`);
    for (const rel of list) {
      if (typeof rel !== 'string' || !rel.startsWith(`${kind}/`)) error(`bad ${kind} path: ${rel}`);
      if (rel.includes('..') || rel.includes('\0')) error(`unsafe ${kind} path: ${rel}`);
    }
  }
}

export function listInboxPackages(inboxRoot) {
  if (!existsSync(inboxRoot)) return [];
  return readdirSync(inboxRoot).filter(isCalendarDate).sort().map(date => resolve(inboxRoot, date));
}

export function inspectPackage(packageDir, designByN, { requireReady = true } = {}) {
  const manifest = readManifest(packageDir);
  if (requireReady && manifest.ready_for_site !== true) {
    return { ok: false, reason: 'not_ready', message: 'manifest.ready_for_site is false (draft)', manifest, skip: true };
  }
  const webPath = resolve(packageDir, 'web.json');
  if (!existsSync(webPath)) error(`missing web.json in ${packageDir}`);
  const web = JSON.parse(readFileSync(webPath, 'utf8'));
  if (web.n !== manifest.station_n) error(`web.json n ${web.n} != manifest.station_n ${manifest.station_n}`);
  if (web.slug !== manifest.slug) error(`web.json slug mismatch`);
  if (web.date !== manifest.date) error(`web.json date mismatch`);
  if ('map' in web || 'map_id' in web) error('web.json must not include map/map_id; DESIGN owns coordinates');

  const approved = designByN.get(manifest.station_n);
  if (!approved) {
    return {
      ok: false,
      reason: 'missing_design_coords',
      message: `station ${manifest.station_n} (${manifest.slug}) has no DESIGN-approved entry in content/metro/design-stations.json`,
      manifest,
    };
  }
  if (approved.slug !== manifest.slug) {
    return {
      ok: false,
      reason: 'design_slug_mismatch',
      message: `DESIGN slug for n=${manifest.station_n} is ${approved.slug}, package has ${manifest.slug}`,
      manifest,
    };
  }

  const fileRels = ['web.json', 'manifest.json', ...manifest.files.photos, ...manifest.files.slides];
  for (const rel of fileRels) {
    const abs = resolve(packageDir, rel);
    if (!existsSync(abs)) {
      return { ok: false, reason: 'missing_file', message: `missing file ${rel}`, manifest };
    }
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) {
      return { ok: false, reason: 'symlink', message: `symlink not allowed: ${rel}`, manifest };
    }
    if (!st.isFile()) {
      return { ok: false, reason: 'not_file', message: `not a regular file: ${rel}`, manifest };
    }
  }

  const folder = folderForStation(manifest.station_n, manifest.slug);
  for (const rel of [...manifest.files.photos, ...manifest.files.slides]) {
    if (!/^(photos|slides)\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(rel)) {
      return { ok: false, reason: 'bad_image_name', message: `unsafe image name: ${rel}`, manifest };
    }
  }

  const hashed = [...new Set(['web.json', ...manifest.files.photos, ...manifest.files.slides])];
  const digest = computePackageContentHash(packageDir, hashed);

  return {
    ok: true,
    manifest,
    contentHash: digest,
    deliveryKey: `${manifest.delivery_version}::${digest}`,
    folder,
    packageDir,
  };
}

/** Plan which paths a content PR should write for a valid package. Images copied as-is. */
export function planContentFiles(inspection) {
  if (!inspection.ok) error('cannot plan from failed inspection');
  const { manifest, folder, packageDir } = inspection;
  const files = [];
  files.push({
    dest: `content/metro/daily/${manifest.date}/web.json`,
    src: resolve(packageDir, 'web.json'),
  });
  for (const rel of [...manifest.files.photos, ...manifest.files.slides]) {
    files.push({
      dest: `content/metro/images/${folder}/${rel}`,
      src: resolve(packageDir, rel),
    });
  }
  for (const f of files) {
    if (!isAllowedMetroContentPath(f.dest)) error(`planned path not gate-allowed: ${f.dest}`);
  }
  return files;
}

export function loadDesignIndex(repoRoot) {
  const path = resolve(repoRoot, 'content/metro/design-stations.json');
  if (!existsSync(path)) error('missing design-stations.json on trusted main');
  const design = JSON.parse(readFileSync(path, 'utf8'));
  return new Map(design.map(entry => [entry.n, entry]));
}

export function buildIssueBody({ manifest, reason, message, packageDir }) {
  return [
    '## Metro GTM inbox — delivery blocked',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Station | ${manifest?.station_n ?? '?'} ${manifest?.station ?? ''} |`,
    `| Slug | ${manifest?.slug ?? '?'} |`,
    `| Date | ${manifest?.date ?? '?'} |`,
    `| Delivery | ${manifest?.delivery_version ?? '?'} |`,
    `| Package | \`${packageDir ?? '?'}\` |`,
    `| Reason | \`${reason}\` |`,
    '',
    '### What failed',
    message,
    '',
    '### How to fix',
    fixHint(reason),
    '',
    'Live site was left unchanged. Re-run the inbox sync after fixing; this issue will be updated instead of duplicated.',
  ].join('\n');
}

function fixHint(reason) {
  switch (reason) {
    case 'missing_design_coords':
      return '1. Ask DESIGN to review coordinates.\n2. Open a human PR that only adds the station to `content/metro/design-stations.json` (and any map SVG work if needed).\n3. Merge that PR to main.\n4. Leave the GTM package on `gtm/inbox`; the next schedule will retry.';
    case 'missing_file':
      return 'Re-upload the package with every file listed in `manifest.json` present as a regular file (no symlinks).';
    case 'symlink':
      return 'Replace symlinks with real image/JSON files and re-upload.';
    case 'bad_data':
    case 'design_slug_mismatch':
      return 'Fix `web.json` / manifest identity fields to match DESIGN, then re-upload with a new `delivery_version`.';
    default:
      return 'Fix the package or DESIGN config, then re-upload or wait for the next scheduled sync.';
  }
}

export function issueTitle(manifest) {
  return `${ISSUE_TITLE_PREFIX} station ${manifest.station_n} ${manifest.station}`;
}

export function contentPrBranch(manifest) {
  return `${CONTENT_PR_BRANCH_PREFIX}${manifest.date}-${manifest.slug}`;
}

export function contentPrTitle(manifest) {
  return `content(metro): sync ${manifest.station} ${manifest.date} (inbox)`;
}

export function contentPrBody(inspection) {
  const { manifest, contentHash, deliveryKey } = inspection;
  return [
    '## Metro content from GTM inbox',
    '',
    'Automated content-only PR. No renderer/test/DESIGN changes.',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Station | ${manifest.station_n} ${manifest.station} |`,
    `| Date | ${manifest.date} |`,
    `| Delivery | \`${manifest.delivery_version}\` |`,
    `| Content hash | \`${contentHash}\` |`,
    `| Dedupe key | \`${deliveryKey}\` |`,
    '',
    '<!-- metro-inbox-delivery: ' + deliveryKey + ' -->',
    '',
    'After CI is green, squash auto-merge should enable via the content gate. Vercel production deploy is separate from CI green — confirm the live site after merge.',
  ].join('\n');
}

/** Materialize planned files into a worktree directory (for tests / local dry-run). */
export function materializePlan(plan, destRoot) {
  for (const { src, dest } of plan) {
    const out = resolve(destRoot, dest);
    mkdirSync(resolve(out, '..'), { recursive: true });
    cpSync(src, out);
  }
}

/** GTM inbox contract: package shape, hashing, readiness, and content-PR planning. */
import { createHash } from 'node:crypto';
import {
  existsSync, readdirSync, readFileSync, lstatSync,
  mkdirSync, cpSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { isCalendarDate } from '../lib/metro-logic.mjs';
import { isAllowedMetroContentPath } from './metro-content-gate.mjs';
import { loadDesignStations, resolveCity, stationKey } from './metro-content.mjs';

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

const IMAGE_REL = /^(photos|slides|slides_zh|slides_en)\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/;
const IMAGE_FIELDS = ['photos', 'slides', 'slides_zh', 'slides_en'];

export function manifestImageRels(files) {
  if (!files || typeof files !== 'object') error('manifest.files required');
  const rels = [];
  for (const field of IMAGE_FIELDS) {
    if (!Object.hasOwn(files, field) || files[field] == null) continue;
    const list = files[field];
    if (!Array.isArray(list)) error(`manifest.files.${field} must be an array or null`);
    for (const rel of list) {
      if (typeof rel !== 'string' || !IMAGE_REL.test(rel) || rel.includes('..') || rel.includes('\0')) {
        error(`bad ${field} path: ${rel}`);
      }
      rels.push(rel);
    }
  }
  return rels;
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
  if (manifest.city != null && manifest.city !== '' && manifest.city !== 'taipei' && manifest.city !== 'shanghai') {
    error('manifest.city must be taipei | shanghai');
  }
  if (typeof manifest.station !== 'string' || !manifest.station) error('manifest.station required');
  if (typeof manifest.ready_for_site !== 'boolean') error('manifest.ready_for_site must be boolean');
  if (!manifest.files || typeof manifest.files !== 'object') error('manifest.files required');
  if (manifest.files.web_json !== 'web.json') error('manifest.files.web_json must be "web.json"');
  manifestImageRels(manifest.files);
}

export function listInboxPackages(inboxRoot) {
  if (!existsSync(inboxRoot)) return [];
  return readdirSync(inboxRoot).filter(isCalendarDate).sort().map(date => resolve(inboxRoot, date));
}

export function resolvePackageCity(manifest, web, designIndex) {
  const declared = (value, label) => (value == null || value === '' ? null : resolveCity(value, label));
  const fromManifest = declared(manifest?.city, 'manifest.city');
  const fromWeb = declared(web?.city, 'web.json city');
  if (fromManifest && fromWeb && fromManifest !== fromWeb) error(`web.json city ${fromWeb} != manifest city ${fromManifest}`);
  if (fromManifest || fromWeb) return fromManifest || fromWeb;
  const cities = new Set();
  if (designIndex && typeof designIndex.entries === 'function') {
    for (const [key, entry] of designIndex) {
      if (typeof key !== 'string' || !key.includes(':')) continue;
      if (entry?.slug === manifest?.slug) cities.add(resolveCity(entry.city));
    }
  }
  if (cities.size === 1) return [...cities][0];
  return 'taipei';
}

export function lookupDesign(index, n, city) {
  if (!index || typeof index.get !== 'function') return null;
  return index.get(stationKey(city, n)) ?? null;
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
  const city = resolvePackageCity(manifest, web, designByN);
  const tagged = { ...manifest, city };

  const approved = lookupDesign(designByN, manifest.station_n, city);
  if (!approved) {
    return {
      ok: false,
      reason: 'missing_design_coords',
      message: `station ${city}:${manifest.station_n} (${manifest.slug}) has no DESIGN-approved entry in content/metro/design-stations.json`,
      manifest: tagged,
    };
  }
  if (approved.slug !== manifest.slug) {
    return {
      ok: false,
      reason: 'design_slug_mismatch',
      message: `DESIGN slug for ${city}:${manifest.station_n} is ${approved.slug}, package has ${manifest.slug}`,
      manifest: tagged,
    };
  }

  const imageRels = manifestImageRels(manifest.files);
  const fileRels = ['web.json', 'manifest.json', ...imageRels];
  for (const rel of fileRels) {
    const abs = resolve(packageDir, rel);
    if (!existsSync(abs)) {
      return { ok: false, reason: 'missing_file', message: `missing file ${rel}`, manifest: tagged };
    }
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) {
      return { ok: false, reason: 'symlink', message: `symlink not allowed: ${rel}`, manifest: tagged };
    }
    if (!st.isFile()) {
      return { ok: false, reason: 'not_file', message: `not a regular file: ${rel}`, manifest: tagged };
    }
  }

  const folder = folderForStation(manifest.station_n, manifest.slug);
  const hashed = [...new Set(['web.json', ...imageRels])];
  const digest = computePackageContentHash(packageDir, hashed);

  return {
    ok: true,
    manifest: tagged,
    city,
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
  const city = inspection.city ?? resolveCity(manifest.city);
  const files = [];
  files.push({
    dest: city === 'taipei'
      ? `content/metro/daily/${manifest.date}/web.json`
      : `content/metro/daily/${city}/${manifest.date}/web.json`,
    src: resolve(packageDir, 'web.json'),
  });
  const imageRoot = city === 'taipei' ? `content/metro/images/${folder}` : `content/metro/images/${city}/${folder}`;
  for (const rel of manifestImageRels(manifest.files)) {
    files.push({
      dest: `${imageRoot}/${rel}`,
      src: resolve(packageDir, rel),
    });
  }
  for (const f of files) {
    if (!isAllowedMetroContentPath(f.dest)) error(`planned path not gate-allowed: ${f.dest}`);
  }
  return files;
}

export function loadDesignIndex(repoRoot) {
  const design = loadDesignStations(resolve(repoRoot, 'content/metro'));
  const index = new Map();
  for (const entry of design) {
    index.set(stationKey(entry.city, entry.n), entry);
    if (entry.city === 'taipei') index.set(entry.n, entry);
  }
  return index;
}

export function buildIssueBody({ manifest, reason, message, packageDir }) {
  return [
    '## Metro GTM inbox — delivery blocked',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Station | ${manifest?.station_n ?? '?'} ${manifest?.station ?? ''} |`,
    `| City | ${manifest?.city ?? 'taipei'} |`,
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
  const city = manifest?.city === 'shanghai' ? 'shanghai ' : '';
  return `${ISSUE_TITLE_PREFIX} ${city}station ${manifest.station_n} ${manifest.station}`;
}

export function contentPrBranch(manifest) {
  const city = manifest?.city === 'shanghai' ? 'shanghai-' : '';
  return `${CONTENT_PR_BRANCH_PREFIX}${city}${manifest.date}-${manifest.slug}`;
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

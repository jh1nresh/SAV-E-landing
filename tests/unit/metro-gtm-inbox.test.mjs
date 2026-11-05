import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateManifest, inspectPackage, planContentFiles, computePackageContentHash,
  loadDesignIndex, listInboxPackages,
} from '../../scripts/metro-gtm-inbox.mjs';

const designByN = loadDesignIndex('.');
const sample = designByN.get(14);

function writePackage(root, { ready = true, withMap = false, missingPhoto = false, n = 14, slug = sample.slug } = {}) {
  mkdirSync(root, { recursive: true });
  const photos = missingPhoto ? ['photos/missing.webp'] : ['photos/zhuji.webp'];
  const slides = ['slides/01-cover.webp'];
  const manifest = {
    schema_version: 1,
    delivery_version: 'test-1',
    date: '2026-11-03',
    station_n: n,
    slug,
    station: sample.station,
    ready_for_site: ready,
    files: { web_json: 'web.json', photos, slides },
  };
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const web = {
    n, slug, station: sample.station, date: '2026-11-03', tagline: 't',
    shops: [], images: { photos, slides }, posts: {},
  };
  if (withMap) web.map = { line: 'L_red', at: [1, 2] };
  writeFileSync(join(root, 'web.json'), JSON.stringify(web));
  mkdirSync(join(root, 'photos'), { recursive: true });
  mkdirSync(join(root, 'slides'), { recursive: true });
  if (!missingPhoto) writeFileSync(join(root, 'photos/zhuji.webp'), 'fake');
  writeFileSync(join(root, 'slides/01-cover.webp'), 'fake');
  return manifest;
}

test('manifest requires schema and ready flag type', () => {
  assert.throws(() => validateManifest({}), /schema_version/);
  const good = {
    schema_version: 1, delivery_version: 'v', date: '2026-11-03', station_n: 14,
    slug: 'daqiaotou', station: '大橋頭', ready_for_site: true,
    files: { web_json: 'web.json', photos: ['photos/a.webp'], slides: ['slides/a.webp'] },
  };
  validateManifest(good);
  assert.throws(() => validateManifest({ ...good, ready_for_site: 'yes' }), /boolean/);
});

test('inspect accepts ready package with DESIGN coords and plans gate-safe paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-ok-'));
  try {
    writePackage(root);
    const inspection = inspectPackage(root, designByN);
    assert.equal(inspection.ok, true);
    assert.ok(inspection.contentHash);
    const plan = planContentFiles(inspection);
    assert.ok(plan.some(f => f.dest === 'content/metro/daily/2026-11-03/web.json'));
    assert.ok(plan.every(f => f.dest.startsWith('content/metro/')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('duplicate delivery hash is stable', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-hash-'));
  try {
    writePackage(root);
    const a = inspectPackage(root, designByN).contentHash;
    const b = inspectPackage(root, designByN).contentHash;
    assert.equal(a, b);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing DESIGN coords blocks without planning a PR', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-nodesign-'));
  try {
    writePackage(root, { n: 99, slug: 'nope' });
    // rewrite slug-related files identity already set; inspect uses manifest n
    const inspection = inspectPackage(root, designByN);
    assert.equal(inspection.ok, false);
    assert.equal(inspection.reason, 'missing_design_coords');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('package map coordinates are rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-map-'));
  try {
    writePackage(root, { withMap: true });
    assert.throws(() => inspectPackage(root, designByN), /must not include map/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing image blocks', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-miss-'));
  try {
    writePackage(root, { missingPhoto: true });
    const inspection = inspectPackage(root, designByN);
    assert.equal(inspection.ok, false);
    assert.equal(inspection.reason, 'missing_file');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('symlink is rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-sym-'));
  try {
    writePackage(root);
    rmSync(join(root, 'photos/zhuji.webp'));
    writeFileSync(join(root, 'photos/real.webp'), 'x');
    symlinkSync('real.webp', join(root, 'photos/zhuji.webp'));
    const inspection = inspectPackage(root, designByN);
    assert.equal(inspection.ok, false);
    assert.equal(inspection.reason, 'symlink');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('not ready packages are skipped', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-draft-'));
  try {
    writePackage(root, { ready: false });
    const inspection = inspectPackage(root, designByN);
    assert.equal(inspection.skip, true);
    assert.equal(inspection.reason, 'not_ready');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('listInboxPackages returns dated folders only', () => {
  const root = mkdtempSync(join(tmpdir(), 'inbox-list-'));
  try {
    mkdirSync(join(root, '2026-11-01'), { recursive: true });
    mkdirSync(join(root, 'notes'), { recursive: true });
    assert.deepEqual(listInboxPackages(root).map(p => p.endsWith('2026-11-01')), [true]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

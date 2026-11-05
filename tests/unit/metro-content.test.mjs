import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations, stripInternal, loadDesignStations, applyDesignMaps } from '../../scripts/metro-content.mjs';
import { contentOnly, contentOnlyFromNameStatus, isAllowedMetroContentPath } from '../../scripts/metro-content-gate.mjs';
import { foodShopRows, FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
const base = JSON.parse(readFileSync('content/metro/stations.json', 'utf8'));
const daily = readdirSync('content/metro/daily').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  .map(d => `content/metro/daily/${d}/web.json`).filter(existsSync).map(p => JSON.parse(readFileSync(p, 'utf8')));
const expected = mergeFoodStations(base, daily);
test('all content stations preserve source display fields; served image paths exist', () => {
  const stations = buildFoodStations(resolve('.'));
  assert.equal(stations.length, expected.length);
  for (let n = 1; n <= expected.length; n++) assert.ok(stations.some(s => s.n === n));
  for (const s of stations) {
    const raw = expected.find(b => b.n === s.n);
    for (const key of ['n', 'date', 'station', 'slug', 'tagline', 'posts']) assert.deepEqual(s[key], raw[key]);
    for (const [i, shop] of s.shops.entries()) {
      for (const key of Object.keys(shop)) assert.deepEqual(shop[key], raw.shops[i][key] ?? null);
    }
    for (const image of [...s.images.photos, ...s.images.slides]) assert.ok(existsSync(`public${image}`), image);
  }
});
test('null, missing and empty fields hide the entire row independently', () => {
  assert.deepEqual(foodShopRows({ dish: null, price: undefined, hours: '', address: '地址' }), [['價格', '價格待確認'], ['地址', '地址']]);
  assert.deepEqual(foodShopRows({ price: '$60', price_source: null }), [['價格', '$60']]);
});
test('internal keys are removed at every depth, including arrays', () => {
  assert.deepEqual(stripInternal({ _secret: 'x', nested: [{ _secret: 'y', good: { _hidden: 1, value: 2 } }] }), { nested: [{ good: { value: 2 } }] });
  const station = mergeFoodStations([{ ...base[0], _secret: 'x', shops: [{ _hidden: 1, name: '店' }] }])[0];
  assert.equal('_secret' in station, false);
  assert.deepEqual(station.shops, [{ name: '店' }]);
});
test('daily files add stations automatically and later daily replaces duplicate n', () => {
  const root = mkdtempSync(join(tmpdir(), 'metro-content-'));
  try {
    cpSync('content/metro', join(root, 'content/metro'), { recursive: true });
    const fixtureN = Math.max(...expected.map(s => s.n)) + 1;
    const fixture = { ...base[0], n: fixtureN, slug: 'fixture', images: null, shops: [], posts: {} };
    const designPath = join(root, 'content/metro/design-stations.json');
    const design = JSON.parse(readFileSync(designPath, 'utf8'));
    design.push({ n: fixtureN, slug: 'fixture', station: fixture.station, map: structuredClone(base[0].map) });
    writeFileSync(designPath, JSON.stringify(design));
    for (const [date, tagline] of [['9999-11-02', 'first'], ['9999-11-03', 'later']]) {
      const dir = join(root, 'content/metro/daily', date);
      mkdirSync(dir, { recursive: true });
      const { map, map_id, ...daily } = fixture;
      writeFileSync(join(dir, 'web.json'), JSON.stringify({ ...daily, tagline }));
    }
    const result = buildFoodStations(root);
    assert.equal(result.length, expected.length + 1);
    assert.equal(result.filter(s => s.n === fixtureN).length, 1);
    assert.equal(result.at(-1).tagline, 'later');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('base duplicates and daily corrections use the latest supplied fields', () => {
  assert.deepEqual(mergeFoodStations([base[0], base[0]], [(({ map: _m, map_id: _id, ...rest }) => ({ ...rest, tagline: null }))(base[0])]).map(s => s.tagline), [null]);
});
test('unsafe content fails closed', () => {
  assert.throws(() => mergeFoodStations([{ ...base[0], slug: '../escape' }]));
  assert.throws(() => mergeFoodStations([{ ...base[0], posts: { instagram: 'javascript:alert(1)' } }]));
});
test('changed-file gate allows only daily JSON and station images', () => {
  assert.equal(contentOnly([
    'content/metro/daily/2026-11-02/web.json',
    'content/metro/images/13-zhongshan/photos/chuanyu.webp',
  ]), true);
  assert.equal(isAllowedMetroContentPath('content/metro/stations.json'), false);
  assert.equal(isAllowedMetroContentPath('content/metro/design-stations.json'), false);
  assert.equal(isAllowedMetroContentPath('content/metro/build.py'), false);
  assert.equal(isAllowedMetroContentPath('.github/workflows/ci.yml'), false);
  for (const files of [
    [],
    ['README.md'],
    ['content/metro/stations.json'],
    ['content/metro/daily/2026-11-02/web.json', 'package.json'],
    ['content/metro-fake/file'],
    ['content/metro/../file'],
  ]) assert.equal(contentOnly(files), false);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'A', path: 'content/metro/daily/2026-11-02/web.json' },
  ]), true);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'D', path: 'content/metro/daily/2026-11-02/web.json' },
  ]), false);
});

test('DESIGN catalog is required and overrides package coordinates', () => {
  const design = loadDesignStations(resolve('content/metro'));
  // DESIGN may ship ahead of stations.json (next-station coords); every live station must still match.
  assert.ok(design.length >= base.length, 'DESIGN catalog must cover every live station');
  for (const station of base) {
    assert.ok(design.some(d => d.n === station.n), `missing DESIGN map for station n=${station.n}`);
  }
  const applied = mergeFoodStations(base, [{ n: base[0].n, slug: base[0].slug, station: base[0].station, date: base[0].date, tagline: 'y' }], design);
  const designForFirst = design.find(d => d.n === base[0].n);
  assert.deepEqual(applied[0].map, designForFirst.map);
  assert.equal(applied[0].tagline, 'y');
  assert.throws(() => applyDesignMaps([{ ...base[0], n: 999, slug: 'missing-design' }], design), /no DESIGN-approved map/);
});
test('both pages use the exact disclaimer', () => {
  assert.equal(FOOD_DISCLAIMER, '營業時間、價格可能調整，出發前再確認');
  for (const path of ['app/metro/page.tsx', 'app/metro/[slug]/page.tsx']) assert.match(readFileSync(path, 'utf8'), /\{FOOD_DISCLAIMER\}/);
});


test('image traversal and missing images stop the build', () => {
  const root = mkdtempSync(join(tmpdir(), 'metro-images-'));
  try {
    const dir = join(root, 'content/metro');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'design-stations.json'), JSON.stringify([
      { n: base[0].n, slug: base[0].slug, station: base[0].station, map: base[0].map, ...(base[0].map_id ? { map_id: base[0].map_id } : {}) },
    ]));
    for (const path of ['../secret.webp', 'photos/missing.webp']) {
      writeFileSync(join(dir, 'stations.json'), JSON.stringify([{ ...base[0], images: { photos: [path] } }]));
      assert.throws(() => buildFoodStations(root), /unsafe image path|missing image/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('F-6: daily web.json carrying map or map_id fails validation instead of being stripped', () => {
  const clean = { n: base[0].n, slug: base[0].slug, station: base[0].station, date: base[0].date, tagline: 'ok' };
  assert.throws(() => mergeFoodStations(base, [{ ...clean, map: { line: 'L_red', at: [0, 0] } }]), /must not include map; DESIGN owns coordinates/);
  assert.throws(() => mergeFoodStations(base, [{ ...clean, map_id: 'arena' }]), /must not include map_id; DESIGN owns coordinates/);
  assert.doesNotThrow(() => mergeFoodStations(base, [clean]));
  const root = mkdtempSync(join(tmpdir(), 'metro-f6-'));
  try {
    cpSync('content', join(root, 'content'), { recursive: true });
    mkdirSync(join(root, 'content/metro/daily/2099-01-01'), { recursive: true });
    writeFileSync(join(root, 'content/metro/daily/2099-01-01/web.json'), JSON.stringify({ ...clean, map: base[0].map }));
    assert.throws(() => buildFoodStations(root), /content\/metro\/daily\/2099-01-01\/web\.json \(station 1\) must not include map/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

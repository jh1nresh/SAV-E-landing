import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations, stripInternal } from '../../scripts/metro-content.mjs';
import { contentOnly } from '../../scripts/metro-content-gate.mjs';
import { foodShopRows, FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
const base = JSON.parse(readFileSync('content/metro/stations.json', 'utf8'));
const daily = readdirSync('content/metro/daily').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  .map(d => `content/metro/daily/${d}/web.json`).filter(existsSync).map(p => JSON.parse(readFileSync(p, 'utf8')));
const expected = mergeFoodStations(base, daily);
test('all 12 stations preserve source display fields; served image paths exist', () => {
  const stations = buildFoodStations(resolve('.'));
  assert.equal(stations.length, expected.length);
  for (let n = 1; n <= 12; n++) assert.ok(stations.some(s => s.n === n));
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
    for (const [date, tagline] of [['9999-11-02', 'first'], ['9999-11-03', 'later']]) {
      const dir = join(root, 'content/metro/daily', date);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'web.json'), JSON.stringify({ ...fixture, tagline }));
    }
    const result = buildFoodStations(root);
    assert.equal(result.length, expected.length + 1);
    assert.equal(result.filter(s => s.n === fixtureN).length, 1);
    assert.equal(result.at(-1).tagline, 'later');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('base duplicates and daily corrections use the last whole record', () => {
  assert.deepEqual(mergeFoodStations([base[0], base[0]], [{ ...base[0], tagline: null }]).map(s => s.tagline), [null]);
});
test('unsafe content fails closed', () => {
  assert.throws(() => mergeFoodStations([{ ...base[0], slug: '../escape' }]));
  assert.throws(() => mergeFoodStations([{ ...base[0], posts: { instagram: 'javascript:alert(1)' } }]));
});
test('changed-file gate requires a nonempty exclusively content diff', () => {
  assert.equal(contentOnly(['content/metro/stations.json', 'content/metro/daily/2026-11-02/web.json']), true);
  for (const files of [[], ['README.md'], ['content/metro/stations.json', 'package.json'], ['content/metro-fake/file'], ['content/metro/../file']]) assert.equal(contentOnly(files), false);
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
    for (const path of ['../secret.webp', 'photos/missing.webp']) {
      writeFileSync(join(dir, 'stations.json'), JSON.stringify([{ ...base[0], images: { photos: [path] } }]));
      assert.throws(() => buildFoodStations(root), /unsafe image path|missing image/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { articleMapStores } from '../../lib/metro-articles.mjs';
import { buildFoodStations } from '../../scripts/metro-content.mjs';
import { foodShopRows, footNote, imageAlt, isNewStore, FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';

const food = buildFoodStations(resolve('.'));

test('every article shop appears once with the right photo and exact display fields', () => {
  const stores = articleMapStores(food);
  assert.equal(stores.length, food.reduce((sum, s) => sum + s.shops.length, 0));
  assert.equal(new Set(stores.map(s => s.id)).size, stores.length);
  for (const station of food) {
    const list = stores.filter(s => s.stationId === (station.map_id ?? station.slug));
    assert.deepEqual(list.map(s => s.name), station.shops.map(s => s.name));
    for (const [i, store] of list.entries()) {
      assert.deepEqual(store.article, station.shops[i]);
      assert.equal(store.image.split('/').at(-1).split('.')[0], station.shops[i].key);
      assert.deepEqual(foodShopRows(store.article), foodShopRows(station.shops[i]));
      assert.equal(footNote(store), FOOD_DISCLAIMER);
      assert.equal(imageAlt(store), store.dish || store.name);
    }
  }
  const ximen = stores.find(s => s.id === 'article-ximen-azong');
  assert.equal(ximen.name, '阿宗麵線');
  assert.match(ximen.image, /\/10-ximen\/photos\/azong\.webp$/);
  const fuxing = stores.find(s => s.id === 'article-zhongxiao-fuxing-jiucai');
  assert.equal(fuxing.name, '江蘇菜盒店');
  assert.match(fuxing.image, /\/09-zhongxiao-fuxing\/photos\/jiucai\.webp$/);
});

test('reordered photos cannot change shop/photo identity and missing mapping fails', () => {
  const station = structuredClone(food[0]);
  const expected = articleMapStores([station]);
  station.images.photos.reverse();
  assert.deepEqual(articleMapStores([station]), expected);
  for (const change of [
    s => { s.shops[0].key = null; },
    s => { s.shops[0].name = ' '; },
    s => { s.shops[1].key = s.shops[0].key; },
    s => { s.images.photos = []; },
    s => { s.images.photos.push(s.images.photos[0]); },
  ]) {
    const invalid = structuredClone(station);
    change(invalid);
    assert.throws(() => articleMapStores([invalid]), /requires|duplicate|exactly one/);
  }
});

test('new daily article and later correction automatically update map cards without a manual store list', () => {
  const root = mkdtempSync(join(tmpdir(), 'metro-article-sync-'));
  try {
    const dir = join(root, 'content/metro');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'stations.json'), '[]');
    const station = {
      n: 15, date: '2026-11-04', slug: 'new-station', station: '新站', map: { line: 'L_red', at: [128, 116] },
      shops: [{ key: 'new-shop', name: '新店', price: '$60–80', exit_walk: '1 號出口，3–5 分鐘', address: '<地址>', hours: null }],
      images: { photos: ['photos/new-shop.webp'] }, posts: {},
    };
    const photoDir = join(dir, 'images/15-new-station/photos');
    mkdirSync(photoDir, { recursive: true });
    writeFileSync(join(photoDir, 'new-shop.webp'), 'test-only-image');
    const daily = join(dir, 'daily/2026-11-04');
    mkdirSync(daily, { recursive: true });
    writeFileSync(join(daily, 'web.json'), JSON.stringify(station));
    const [first] = articleMapStores(buildFoodStations(root));
    assert.equal(first.stationId, 'new-station');
    assert.equal(first.article.price, '$60–80');
    assert.equal(first.article.exit_walk, '1 號出口，3–5 分鐘');
    assert.equal(first.article.hours, null);
    assert.deepEqual(first.sourcePosts, []);
    assert.equal(isNewStore(first, '2026-11-04'), false); // No fabricated social post.
    station.shops[0].price = '$70–90';
    station.shops[0].hours = '11:00–20:00';
    writeFileSync(join(daily, 'web.json'), JSON.stringify(station));
    const [updated] = articleMapStores(buildFoodStations(root));
    assert.equal(updated.id, first.id);
    assert.equal(updated.article.price, '$70–90');
    assert.equal(updated.article.hours, '11:00–20:00');
    station.shops[0].key = 'missing';
    writeFileSync(join(daily, 'web.json'), JSON.stringify(station));
    assert.throws(() => buildFoodStations(root), /exactly one photo/);
  } finally { rmSync(root, { recursive: true }); }
});

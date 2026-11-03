import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations } from '../../scripts/metro-content.mjs';
import { buildPublicMetro } from '../../scripts/build-metro.mjs';
import { LINE_PATHS } from '../../scripts/metro-lines.mjs';

const root = resolve('.');
const raw = JSON.parse(readFileSync('data/metro.json', 'utf8'));
const base = JSON.parse(readFileSync('content/metro/stations.json', 'utf8'));

test('every content station has a hero marker snapped within two units of its position', () => {
  const food = buildFoodStations(root);
  const hero = buildPublicMetro(raw, food).stations;
  assert.equal(food.length, 14);
  assert.equal(hero.length, food.length);
  for (const station of food) {
    const marker = hero.find(s => s.id === (station.map_id ?? station.slug));
    assert.ok(marker, station.slug);
    assert.ok(marker.mapPos.line in LINE_PATHS);
    assert.ok(marker.mapPos.snapped.every(Number.isFinite));
    assert.ok(Math.hypot(...marker.mapPos.snapped.map((v, i) => v - station.map.at[i])) <= 2, station.slug);
    assert.equal(marker.order, station.n);
    assert.deepEqual(marker.mapPos.labelOffset, station.map.labelOffset);
  }
});

test('missing or invalid map positions fail content and hero builds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'metro-map-'));
  try {
    mkdirSync(join(dir, 'content/metro'), { recursive: true });
    const station = { ...base[0], images: {} };
    delete station.map;
    writeFileSync(join(dir, 'content/metro/stations.json'), JSON.stringify([station]));
    assert.throws(() => buildFoodStations(dir), /metro content: station 1 missing map position/);
    assert.throws(() => buildPublicMetro(raw, [station]), /missing map position/);
    for (const map of [null, { line: 'unknown', at: [0, 0] }, { line: 'L_red', at: [Infinity, 0] }, { line: 'L_red', at: [0] }]) {
      assert.throws(() => mergeFoodStations([{ ...station, map }]), /missing map position/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('daily records inherit map and legacy id while overriding content fields', () => {
  const daily = { ...base[0], tagline: 'updated' };
  delete daily.map;
  delete daily.map_id;
  const [merged] = mergeFoodStations([base[0]], [daily]);
  assert.deepEqual(merged.map, base[0].map);
  assert.equal(merged.map_id, 'arena');
  assert.equal(merged.tagline, 'updated');
});

test('stores must reference a derived station id', () => {
  assert.throws(() => buildPublicMetro({ ...raw, stores: [{ ...raw.stores[0], stationId: 'unknown' }] }), /is not a station/);
});

test('label offsets require two finite numbers', () => {
  for (const labelOffset of [[1], [1, 2, 3], ['1', 2], [NaN, 2], 'left']) {
    assert.throws(() => mergeFoodStations([{ ...base[0], map: { ...base[0].map, labelOffset } }]), /map.labelOffset must be \[dx, dy\]/);
  }
});

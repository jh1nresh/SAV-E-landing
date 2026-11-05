import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations } from '../../scripts/metro-content.mjs';
import { buildPublicMetro } from '../../scripts/build-metro.mjs';
import { LINE_PATHS, snapToLine } from '../../scripts/metro-lines.mjs';

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
    assert.deepEqual(marker.mapPos.posterLabelOffset, station.map.posterLabelOffset);
  }
});

test('missing or invalid map positions fail content and hero builds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'metro-map-'));
  try {
    mkdirSync(join(dir, 'content/metro'), { recursive: true });
    const station = { ...base[0], images: {} };
    delete station.map;
    writeFileSync(join(dir, 'content/metro/stations.json'), JSON.stringify([station]));
    // DESIGN catalog is required; without an approved entry the build fails closed.
    writeFileSync(join(dir, 'content/metro/design-stations.json'), JSON.stringify([
      { n: 2, slug: 'other', station: '其他', map: base[1].map },
    ]));
    assert.throws(() => buildFoodStations(dir), /no DESIGN-approved map/);
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
    assert.throws(() => mergeFoodStations([{ ...base[0], map: { ...base[0].map, posterLabelOffset: labelOffset } }]), /map.posterLabelOffset must be \[dx, dy\]/);
  }
});

test('interactive map labelOffset stays at the DESIGN r13 values; poster offsets are separate', () => {
  const offsets = Object.fromEntries(base.filter(s => s.map.labelOffset).map(s => [s.station, s.map.labelOffset]));
  assert.deepEqual(offsets, { 小巨蛋: [-14, 0], 雙連: [0, 12] });
  const poster = Object.fromEntries(base.filter(s => s.map.posterLabelOffset).map(s => [s.station, s.map.posterLabelOffset]));
  assert.deepEqual(poster, { 士林: [20, 0], 南京復興: [-22, 0], 忠孝復興: [0, 12], 古亭: [-22, 0] });
});


test('map ids must be simple slugs', () => {
  for (const map_id of ['bad"><img', 'Upper', 'a b', '', 123]) {
    assert.throws(() => mergeFoodStations([{ ...base[0], map_id }]), /station 1 map_id must be a simple slug/);
  }
});

test('map positions more than two units off their line fail the build', () => {
  const station = { ...base[0], map: { line: 'L_orange', at: [52, 32] } };
  assert.throws(() => mergeFoodStations([station]), /station 1 map.at is [\d.]+ units off L_orange/);
});

test('green line curve positions use a refined nearest point', () => {
  const at = [182.61, 649.08];
  const snapped = snapToLine('L_green', at);
  assert.ok(Math.hypot(...snapped.map((v, i) => v - at[i])) < 0.1);
  assert.doesNotThrow(() => mergeFoodStations([{ ...base[0], map: { line: 'L_green', at } }]));
  assert.throws(() => mergeFoodStations([{ ...base[0], map: { line: 'L_green', at: [192.61, 649.08] } }]), /station 1 map.at is [\d.]+ units off L_green/);
});

for (const [label, legacyDate, expected] of [
  ['older legacy', '2026-10-30', '2026-11-02'],
  ['newer legacy', '2026-11-03', '2026-11-03'],
  ['no legacy', null, '2026-11-02'],
]) {
  test(`public station uses the latest update date with ${label}`, () => {
    const station = { ...base[0], date: '2026-11-02' };
    const stations = legacyDate ? [{ id: station.map_id ?? station.slug, updatedAt: legacyDate }] : [];
    const result = buildPublicMetro({ ...raw, stations, stores: [] }, [station]);
    assert.equal(result.stations[0].updatedAt, expected);
  });
}

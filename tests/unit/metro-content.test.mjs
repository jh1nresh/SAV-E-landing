import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations, stripInternal, loadDesignStations, applyDesignMaps, resolvePhotoList, resolveSlideList, readWgs84, stationGeoPin } from '../../scripts/metro-content.mjs';
import { contentOnly, contentOnlyFromNameStatus, isAllowedMetroContentPath } from '../../scripts/metro-content-gate.mjs';
import { foodShopRows, FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
const base = JSON.parse(readFileSync('content/metro/stations.json', 'utf8'));
const designCatalog = loadDesignStations(resolve('content/metro'));
const daily = readdirSync('content/metro/daily').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  .map(d => `content/metro/daily/${d}/web.json`).filter(existsSync).map(p => JSON.parse(readFileSync(p, 'utf8')));
// Pass DESIGN so a daily-only new station (map omitted per F-6) can initialize tests the same way production builds.
const expected = mergeFoodStations(base, daily, designCatalog);
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
    'content/metro/daily/shanghai/2026-11-07/web.json',
    'content/metro/images/shanghai/02-shanghai-yuyuan/slides_zh/01-cover.webp',
    'content/metro/images/shanghai/02-shanghai-yuyuan/slides_en/01-cover.webp',
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
    ['content/metro/daily/beijing/2026-11-07/web.json'],
    ['content/metro/design-stations.json'],
    ['content/metro/schema.md'],
    ['scripts/metro-content.mjs'],
    ['.github/workflows/ci.yml'],
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
    assert.ok(design.some(d => (d.city ?? 'taipei') === 'taipei' && d.n === station.n && d.slug === station.slug), `missing Taipei DESIGN map for n=${station.n}`);
  }
  const applied = mergeFoodStations(base, [{ n: base[0].n, slug: base[0].slug, station: base[0].station, date: base[0].date, tagline: 'y' }], design);
  const designForFirst = design.find(d => d.n === base[0].n && (d.city ?? 'taipei') === 'taipei');
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

const TAIPEI_1_16 = [
  [1, 'xiaojudan', '小巨蛋', [440, 142]],
  [2, 'raohe-songshan', '饒河/松山', [598, 86]],
  [3, 'shuanglian', '雙連', [128, 116]],
  [4, 'dongmen', '東門', [300, 302]],
  [5, 'houshanpi', '後山埤', [500, 268]],
  [6, 'shilin', '士林', [16, -59]],
  [7, 'gongguan', '公館', [196, 440]],
  [8, 'nanjing-fuxing', '南京復興', [372, 166]],
  [9, 'zhongxiao-fuxing', '忠孝復興', [372, 234]],
  [10, 'ximen', '西門', [-40, 199]],
  [11, 'daan', '大安', [351, 363]],
  [12, 'guting', '古亭', [221, 310]],
  [13, 'zhongshan', '中山', [157, 157]],
  [14, 'daqiaotou', '大橋頭', [8, 30]],
  [15, 'chiang-kai-shek-memorial-hall', '中正紀念堂', [246, 268]],
  [16, 'taipei-city-hall', '市政府', [420, 247]],
];

test('Taipei stations 1-16 keep their identity and schematic points', () => {
  const stations = buildFoodStations(resolve('.'));
  assert.deepEqual(stations.slice(0, 16).map(s => [s.n, s.slug, s.station, s.map.at]), TAIPEI_1_16);
  assert.deepEqual(
    [stations[16].n, stations[16].slug, stations[16].station, stations[16].map.at, stations[16].city],
    [17, 'nangang', '南港', [620, 287], 'taipei'],
  );
  assert.equal(stations.length, 17);
  assert.ok(stations.every(s => s.city === 'taipei'));
  assert.equal(JSON.stringify(stations).includes('31.2303'), false);
});

test('stations are keyed by city and n, and missing geo coordinates stay pending', () => {
  const catalog = readFileSync('content/metro/design-stations.json', 'utf8');
  assert.equal(catalog.includes('31.2303'), false);
  assert.equal(catalog.includes('public_reference'), false);
  const nangang = designCatalog.find(entry => entry.slug === 'nangang');
  assert.equal(nangang?.city, 'taipei');
  assert.equal(nangang?.n, 17);
  assert.deepEqual(nangang?.map, { line: 'L_blue', at: [620, 287] });
  assert.equal(designCatalog.filter(entry => entry.city === 'taipei').length, 17);
  const shanghai = designCatalog.filter(entry => entry.city === 'shanghai');
  assert.deepEqual(shanghai.map(entry => [entry.n, entry.slug, entry.datum, entry.geoPin, entry.map.at]), [
    [1, 'shanghai-nanjing-east', 'WGS-84', true, [740, 220]],
    [2, 'shanghai-yuyuan', 'WGS-84', true, [760, 400]],
    [3, 'shanghai-jingan-temple', 'WGS-84', true, [220, 420]],
    [4, 'shanghai-south-huangpi-road', 'WGS-84', true, [520, 430]],
  ]);
  assert.deepEqual(stationGeoPin(shanghai[0]), { lat: 31.2391239, lng: 121.4792291, datum: 'WGS-84' });
  assert.equal(shanghai[0].geoStatus, 'wgs84');
  assert.deepEqual(stationGeoPin(shanghai[1]), { lat: 31.229784, lng: 121.48263, datum: 'WGS-84' });
  assert.ok(designCatalog.filter(entry => entry.city === 'taipei').every(entry => stationGeoPin(entry) == null));
  const taipei = base.find(station => station.n === 2);
  const yuyuan = {
    n: 2, city: 'shanghai', date: '2026-11-07', station: '豫園', slug: 'shanghai-yuyuan',
    shops: [{ key: 'shop', name: '店', price: null, address: '上海市黃浦區' }],
    images: { photos: null, slides: null, slides_zh: null, slides_en: null }, posts: {},
    public_reference: { lat: 31.2303, lng: 121.482 },
  };
  const merged = mergeFoodStations([taipei], [yuyuan], designCatalog);
  const kept = merged.find(station => station.city === 'taipei' && station.n === 2);
  const added = merged.find(station => station.city === 'shanghai' && station.n === 2);
  assert.equal(kept.slug, 'raohe-songshan');
  assert.deepEqual(kept.map.at, [598, 86]);
  assert.equal(added.slug, 'shanghai-yuyuan');
  assert.deepEqual(added.map, { line: 'SH_14', at: [760, 400] });
  assert.equal(added.shops[0].price, null);
  assert.equal(added.lat, undefined);
  assert.equal(added.datum, undefined);
  assert.equal(added.metro_lines, undefined);
  assert.equal(JSON.stringify(added).includes('31.2303'), false);
  const nanjing = { n: 1, city: 'shanghai', date: '2026-11-07', station: '南京東路', slug: 'shanghai-nanjing-east', shops: [], posts: {} };
  const paired = mergeFoodStations([base[0], nanjing], [], designCatalog);
  assert.deepEqual(paired.filter(station => station.n === 1).map(station => [station.city, station.slug]), [
    ['taipei', 'xiaojudan'],
    ['shanghai', 'shanghai-nanjing-east'],
  ]);
});

test('WGS-84 datum is explicit, missing shop coordinates stay pending, and metro_lines stay per city', () => {
  assert.deepEqual(readWgs84({ lat: '未取得', lng: '未取得' }), { lat: null, lng: null, datum: null, geoStatus: 'pending' });
  assert.deepEqual(readWgs84({}), { lat: null, lng: null, datum: null, geoStatus: 'pending' });
  assert.throws(() => readWgs84({ lat: 31.2, lng: 121.4 }), /explicit datum of WGS-84/);
  assert.throws(() => readWgs84({ lat: 31.2, lng: 121.4, datum: 'GCJ-02' }), /explicit datum of WGS-84/);
  const station = {
    n: 4, city: 'shanghai', date: '2026-11-09', station: '黃陂南路', slug: 'shanghai-south-huangpi-road',
    metro_lines: ['1', '14'],
    station_geo: { lat: 1.25, lng: 2.5, datum: 'WGS-84' },
    shops: [
      { key: 'known', name: '有座標', price: null, lat: 1.5, lng: 2.75, datum: 'WGS-84' },
      { key: 'missing', name: '未取得', price: null, lat: '未取得', lng: '未取得' },
    ],
    images: { photos: null, slides: null }, posts: {},
  };
  const dongmen = base.find(entry => entry.slug === 'dongmen');
  const merged = mergeFoodStations([dongmen, station], [], designCatalog);
  const shanghai = merged.find(entry => entry.city === 'shanghai' && entry.n === 4);
  const taipei = merged.find(entry => entry.city === 'taipei' && entry.n === 4);
  assert.deepEqual(shanghai.metro_lines, ['1', '14']);
  assert.equal(taipei.slug, 'dongmen');
  assert.equal(taipei.metro_lines, undefined);
  assert.deepEqual({ lat: shanghai.lat, lng: shanghai.lng, datum: shanghai.datum, geoStatus: shanghai.geoStatus }, {
    lat: 1.25, lng: 2.5, datum: 'WGS-84', geoStatus: 'wgs84',
  });
  assert.equal(shanghai.shops[1].geoStatus, 'pending');
  assert.equal(shanghai.shops[1].datum, null);
  assert.equal(shanghai.shops[1].lat, null);
  assert.equal(shanghai.shops[0].datum, 'WGS-84');
  const root = mkdtempSync(join(tmpdir(), 'metro-geo-'));
  try {
    const dir = join(root, 'content/metro');
    mkdirSync(dir, { recursive: true });
    const { map, map_id, ...dailyStation } = station;
    writeFileSync(join(dir, 'stations.json'), JSON.stringify([]));
    writeFileSync(join(dir, 'design-stations.json'), JSON.stringify([
      { n: 4, city: 'shanghai', slug: station.slug, station: station.station, map: { line: 'SH_14', at: [520, 430] } },
      { n: designCatalog.find(entry => entry.slug === 'dongmen').n, city: 'taipei', slug: 'dongmen', station: '東門', map: designCatalog.find(entry => entry.slug === 'dongmen').map },
    ]));
    mkdirSync(join(dir, 'daily/shanghai/2026-11-09'), { recursive: true });
    writeFileSync(join(dir, 'daily/shanghai/2026-11-09/web.json'), JSON.stringify(dailyStation));
    assert.deepEqual(buildFoodStations(root), []);
    const [published] = buildFoodStations(root, { city: 'shanghai' });
    assert.equal(published.datum, 'WGS-84');
    assert.deepEqual(published.metro_lines, ['1', '14']);
    assert.equal(published.shops[1].geoStatus, 'pending');
    assert.equal(published.shops[1].price, null);
    assert.equal(JSON.stringify(published).includes('31.2246'), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('slides_zh and slides_en are chosen by locale, and null image fields are empty lists', () => {
  assert.deepEqual(resolvePhotoList({ photos: null, slides: null }), []);
  assert.deepEqual(resolveSlideList({ slides: null, slides_zh: null, slides_en: null }, 'zh'), []);
  assert.deepEqual(resolveSlideList({ slides: ['slides/legacy.webp'], slides_zh: ['slides_zh/zh.webp'], slides_en: ['slides_en/en.webp'] }, 'zh'), ['slides_zh/zh.webp']);
  assert.deepEqual(resolveSlideList({ slides: ['slides/legacy.webp'], slides_zh: ['slides_zh/zh.webp'], slides_en: ['slides_en/en.webp'] }, 'en'), ['slides_en/en.webp']);
  assert.deepEqual(resolveSlideList({ slides: ['slides/legacy.webp'], slides_zh: null, slides_en: null }, 'en'), ['slides/legacy.webp']);
  const root = mkdtempSync(join(tmpdir(), 'metro-slides-'));
  try {
    const dir = join(root, 'content/metro');
    mkdirSync(dir, { recursive: true });
    const station = { ...base[0], images: { photos: null, slides: ['slides/legacy.webp'], slides_zh: ['slides_zh/zh.webp'], slides_en: ['slides_en/en.webp'] }, shops: [] };
    writeFileSync(join(dir, 'stations.json'), JSON.stringify([station]));
    writeFileSync(join(dir, 'design-stations.json'), JSON.stringify([
      { n: station.n, slug: station.slug, station: station.station, map: station.map, ...(station.map_id ? { map_id: station.map_id } : {}) },
    ]));
    const folder = join(dir, 'images/01-xiaojudan');
    mkdirSync(join(folder, 'slides'), { recursive: true });
    mkdirSync(join(folder, 'slides_zh'), { recursive: true });
    mkdirSync(join(folder, 'slides_en'), { recursive: true });
    writeFileSync(join(folder, 'slides/legacy.webp'), 'legacy');
    writeFileSync(join(folder, 'slides_zh/zh.webp'), 'zh');
    writeFileSync(join(folder, 'slides_en/en.webp'), 'en');
    const zh = buildFoodStations(root);
    const en = buildFoodStations(root, { locale: 'en' });
    assert.deepEqual(zh[0].images.photos, []);
    assert.match(zh[0].images.slides[0], /slides_zh\/zh\.webp$/);
    assert.match(en[0].images.slides[0], /slides_en\/en\.webp$/);
    station.images = { photos: null, slides: null, slides_zh: null, slides_en: null };
    writeFileSync(join(dir, 'stations.json'), JSON.stringify([station]));
    const empty = buildFoodStations(root);
    assert.deepEqual(empty[0].images, { photos: [], slides: [] });
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

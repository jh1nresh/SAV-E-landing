import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFoodStations, mergeFoodStations, stripInternal, loadDesignStations, loadDailyStations, applyDesignMaps, resolvePhotoList, resolveSlideList, readWgs84, stationGeoPin, localeForCity } from '../../scripts/metro-content.mjs';
import { contentOnly, contentOnlyFromNameStatus, isAllowedMetroContentPath } from '../../scripts/metro-content-gate.mjs';
import { foodShopRows, FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
const base = JSON.parse(readFileSync('content/metro/stations.json', 'utf8'));
const designCatalog = loadDesignStations(resolve('content/metro'));
const daily = loadDailyStations(resolve('content/metro'), resolve('.'));
// Pass DESIGN so a daily-only new station (map omitted per F-6) can initialize tests the same way production builds.
const expected = mergeFoodStations(base, daily, designCatalog);
test('all content stations preserve source display fields; served image paths exist', () => {
  const cities = [...new Set(expected.map(station => station.city ?? 'taipei'))];
  for (const city of cities) {
    const rawStations = expected.filter(station => (station.city ?? 'taipei') === city);
    const stations = buildFoodStations(resolve('.'), { city });
    assert.equal(stations.length, rawStations.length, city);
    if (city === 'taipei') {
      for (let n = 1; n <= rawStations.length; n++) assert.ok(stations.some(s => s.n === n));
    }
    for (const s of stations) {
      const raw = rawStations.find(b => b.n === s.n);
      for (const key of ['n', 'date', 'station', 'slug', 'tagline', 'posts']) assert.deepEqual(s[key], raw[key]);
      for (const [i, shop] of s.shops.entries()) {
        for (const key of Object.keys(shop)) assert.deepEqual(shop[key], raw.shops[i][key] ?? null);
      }
      for (const image of [...s.images.photos, ...s.images.slides]) assert.ok(existsSync(`public${image}`), image);
    }
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
    const taipeiCount = expected.filter(station => (station.city ?? 'taipei') === 'taipei').length;
    assert.equal(result.length, taipeiCount + 1);
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
    'content/metro/daily/taipei/2026-11-07/web.json',
    'content/metro/images/taipei/17-nangang/photos/shop.webp',
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
    ['content/metro/daily/shanghai/2026-11-07/web.json', 'app/page.tsx'],
    ['content/metro/shanghai-lines.json'],
    ['content/metro/build.py'],
    ['docs/GTM-INBOX.md'],
    ['content/metro/daily/shanghai/web.json'],
    ['content/metro/images/shanghai/02-shanghai-yuyuan/notes.md'],
  ]) assert.equal(contentOnly(files), false);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'A', path: 'content/metro/daily/2026-11-02/web.json' },
  ]), true);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'A', path: 'content/metro/daily/shanghai/2026-11-07/web.json' },
    { status: 'M', path: 'content/metro/images/shanghai/02-shanghai-yuyuan/photos/nanxiang.webp' },
  ]), true);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'D', path: 'content/metro/daily/2026-11-02/web.json' },
  ]), false);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'R', path: 'content/metro/daily/shanghai/2026-11-07/web.json' },
  ]), false);
  assert.equal(contentOnlyFromNameStatus([
    { status: 'T', path: 'content/metro/images/taipei/17-nangang/photos/shop.webp' },
  ]), false);
  assert.equal(isAllowedMetroContentPath('content/metro/design-stations.json'), false);
  assert.equal(isAllowedMetroContentPath('content/metro/schema.md'), false);
});

test('DESIGN catalog is required and overrides package coordinates', () => {
  const design = loadDesignStations(resolve('content/metro'));
  // DESIGN may ship ahead of stations.json (next-station coords); every live station must still match.
  assert.ok(design.length >= base.length, 'DESIGN catalog must cover every live station');
  for (const station of base) {
    const city = station.city ?? 'taipei';
    assert.ok(design.some(d => (d.city ?? 'taipei') === city && d.n === station.n && d.slug === station.slug), `missing DESIGN map for ${city} n=${station.n}`);
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

const TAIPEI_18_23 = [
  [18, 'taipei-101-world-trade-center', '台北101／世貿', [373, 430], 'taipei'],
  [19, 'taipei-main-station', '台北車站', [186, 200], 'taipei'],
  [20, 'longshan-temple', '龍山寺', [-85, 197], 'taipei'],
  [21, 'sun-yat-sen-memorial-hall', '國父紀念館', [397, 240], 'taipei'],
  [22, 'xiangshan', '象山', [379, 461], 'taipei'],
  [23, 'tamsui', '淡水', [-30, -150], 'taipei'],
];

test('Taipei stations 1-16 keep their identity and schematic points', () => {
  const stations = buildFoodStations(resolve('.'));
  assert.deepEqual(stations.slice(0, 16).map(s => [s.n, s.slug, s.station, s.map.at]), TAIPEI_1_16);
  assert.deepEqual(
    [stations[16].n, stations[16].slug, stations[16].station, stations[16].map.at, stations[16].city],
    [17, 'nangang', '南港', [620, 287], 'taipei'],
  );
  const taipeiPublished = expected.filter(station => (station.city ?? 'taipei') === 'taipei');
  assert.equal(stations.length, taipeiPublished.length);
  assert.equal(taipeiPublished.length, TAIPEI_1_16.length + 1 + TAIPEI_18_23.length);
  assert.equal(taipeiPublished.length, 23);
  assert.deepEqual(stations.filter(station => station.n >= 18).map(station => [station.n, station.slug, station.station, station.map.at, station.city]), TAIPEI_18_23);
  const zhongxiao = stations.find(station => station.slug === 'zhongxiao-fuxing');
  assert.equal(zhongxiao.map.labelOffset, undefined);
  assert.deepEqual(zhongxiao.map.posterLabelOffset, [-56, 40]);
  assert.ok(stations.every(s => s.city === 'taipei'));
  assert.equal(JSON.stringify(stations).includes('31.2303'), false);
});

test('published Shanghai stations use their DESIGN maps and leave station coordinates pending', () => {
  const shanghai = buildFoodStations(resolve('.'), { city: 'shanghai' });
  assert.deepEqual(shanghai.map(station => [station.n, station.slug, station.station, station.map.line, station.map.at, station.geoStatus, station.lat]), [
    [2, 'shanghai-yuyuan', '豫園', 'SH_14', [760, 400], 'pending', null],
    [3, 'shanghai-jingan-temple', '靜安寺', 'SH_14', [220, 420], 'pending', null],
    [4, 'shanghai-south-huangpi-road', '黃陂南路', 'SH_14', [520, 430], 'pending', null],
    [6, 'shanghai-jiaotong-university', '交通大學', 'SH_10', [140, 600], 'pending', null],
    [7, 'shanghai-dapuqiao', '打浦橋', 'SH_9', [470, 570], 'wgs84', 31.2075],
  ]);
  assert.equal(shanghai.some(station => station.n === 5 || station.station === '人民廣場'), false);
  const huangpi = shanghai.find(station => station.n === 4);
  assert.equal(huangpi.shops.find(shop => shop.key === 'guangmingcun').name, '光明邨大酒家');
  assert.equal(huangpi.shops.find(shop => shop.key === 'weixiang').address, '上海市黃浦區雁蕩路14號（近淮海中路）');
});

test('stations are keyed by city and n, and missing geo coordinates stay pending', () => {
  const catalog = readFileSync('content/metro/design-stations.json', 'utf8');
  assert.equal(catalog.includes('31.2303'), false);
  assert.equal(catalog.includes('public_reference'), false);
  const nangang = designCatalog.find(entry => entry.slug === 'nangang');
  assert.equal(nangang?.city, 'taipei');
  assert.equal(nangang?.n, 17);
  assert.deepEqual(nangang?.map, { line: 'L_blue', at: [620, 287] });
  const taipeiDesign = designCatalog.filter(entry => entry.city === 'taipei');
  const publishedTaipei = expected.filter(station => (station.city ?? 'taipei') === 'taipei');
  assert.equal(taipeiDesign.length, publishedTaipei.length);
  assert.equal(publishedTaipei.length, TAIPEI_1_16.length + 1 + TAIPEI_18_23.length);
  assert.equal(publishedTaipei.length, 23);
  assert.deepEqual(taipeiDesign.filter(entry => entry.n >= 18).map(entry => [entry.n, entry.slug, entry.station, entry.map]), [
    [18, 'taipei-101-world-trade-center', '台北101／世貿', { line: 'L_red', at: [373, 430], label: 'right' }],
    [19, 'taipei-main-station', '台北車站', { line: 'L_red', at: [186, 200] }],
    [20, 'longshan-temple', '龍山寺', { line: 'L_blue', at: [-85, 197], label: 'right', labelOffset: [0, -22] }],
    [21, 'sun-yat-sen-memorial-hall', '國父紀念館', { line: 'L_blue', at: [397, 240], label: 'left', labelOffset: [0, 18], posterLabelOffset: [20, 64] }],
    [22, 'xiangshan', '象山', { line: 'L_red', at: [379, 461], label: 'right' }],
    [23, 'tamsui', '淡水', { line: 'L_red', at: [-30, -150], label: 'right' }],
  ]);
  assert.equal(taipeiDesign.find(entry => entry.slug === 'zhongxiao-fuxing').map.labelOffset, undefined);
  assert.deepEqual(taipeiDesign.find(entry => entry.slug === 'zhongxiao-fuxing').map.posterLabelOffset, [-56, 40]);
  const shanghai = designCatalog.filter(entry => entry.city === 'shanghai');
  assert.deepEqual(shanghai.map(entry => [entry.n, entry.slug, entry.datum, entry.geoPin, entry.map.at]), [
    [1, 'shanghai-nanjing-east', 'WGS-84', true, [740, 220]],
    [2, 'shanghai-yuyuan', 'WGS-84', true, [760, 400]],
    [3, 'shanghai-jingan-temple', 'WGS-84', true, [220, 420]],
    [4, 'shanghai-south-huangpi-road', 'WGS-84', true, [520, 430]],
    [6, 'shanghai-jiaotong-university', 'WGS-84', true, [140, 600]],
    [7, 'shanghai-dapuqiao', 'WGS-84', true, [470, 570]],
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

test('published Shanghai stations stay inside the city and do not invent prices', () => {
  assert.equal(localeForCity('taipei'), 'zh');
  assert.equal(localeForCity('shanghai'), 'zh');
  const taipei = buildFoodStations(resolve('.'));
  const shanghai = buildFoodStations(resolve('.'), { city: 'shanghai' });
  assert.ok(taipei.every(station => station.city === 'taipei'));
  assert.equal(taipei.some(station => station.slug.startsWith('shanghai-')), false);
  assert.deepEqual(shanghai.map(station => [station.n, station.slug, station.station, station.metro_lines]), [
    [2, 'shanghai-yuyuan', '豫園', ['10', '14']],
    [3, 'shanghai-jingan-temple', '靜安寺', ['2', '7', '14']],
    [4, 'shanghai-south-huangpi-road', '黃陂南路', ['1', '14']],
    [6, 'shanghai-jiaotong-university', '交通大學', ['10', '11']],
    [7, 'shanghai-dapuqiao', '打浦橋', ['9']],
  ]);
  assert.equal(shanghai.some(station => station.slug === 'shanghai-nanjing-east'), false);
  for (const station of shanghai) {
    const scoped = `content/metro/daily/shanghai/${station.date}/web.json`;
    const legacy = `content/metro/daily/${station.date}/web.json`;
    const dailyPath = existsSync(scoped) ? scoped : legacy;
    assert.equal(JSON.parse(readFileSync(dailyPath, 'utf8')).map, undefined);
    assert.ok(station.shops.length > 0);
    for (const shop of station.shops) {
      assert.equal(typeof shop.address, 'string');
      assert.ok(shop.address.length > 0);
    }
  }
  const yuyuan = shanghai.find(station => station.slug === 'shanghai-yuyuan');
  const jingan = shanghai.find(station => station.slug === 'shanghai-jingan-temple');
  const huangpi = shanghai.find(station => station.slug === 'shanghai-south-huangpi-road');
  assert.equal(yuyuan.posts.instagram, 'https://www.instagram.com/savvysave_/p/DfcC2GKm22A/');
  assert.equal(yuyuan.posts.threads, 'https://www.threads.com/@savvysave_/post/DfcDLq7mzW7');
  assert.equal(jingan.posts.instagram, 'https://www.instagram.com/savvysave_/p/Dfenktfm82b/');
  assert.equal(jingan.posts.threads, 'https://www.threads.com/@savvysave_/post/Dfen6ILGzjh');
  const dapuqiao = shanghai.find(station => station.slug === 'shanghai-dapuqiao');
  assert.equal(dapuqiao.posts.instagram, 'https://www.instagram.com/savvysave_/p/Dfo61SiG2v1/');
  assert.equal(dapuqiao.posts.threads, 'https://www.threads.com/@savvysave_/post/Dfo7AEEm_8z');
  assert.equal(dapuqiao.posts.xiaohongshu ?? null, null);
  assert.equal(dapuqiao.shops.every(shop => shop.price == null), true);
  assert.equal(huangpi.posts.instagram, 'https://www.instagram.com/p/DfhKbw_G6WX/');
  assert.equal(huangpi.posts.threads, 'https://www.threads.com/@savvysave_/post/DfhK4TFGwQT');
  assert.equal(huangpi.shops.find(shop => shop.name === '味香齋（雁蕩路店）').price, '14元人民幣／碗');
  assert.equal(huangpi.shops.find(shop => shop.name === '春園·四如春（復興公園店）').price, '5元人民幣／只');
  assert.equal(huangpi.shops.find(shop => shop.name === '光明邨大酒家').address, '上海市黃浦區淮海中路588號');
  assert.equal(huangpi.shops.find(shop => shop.name === '味香齋（雁蕩路店）').address, '上海市黃浦區雁蕩路14號（近淮海中路）');
  assert.equal(yuyuan.shops.find(shop => shop.name === '松鶴樓麵館（豫園店）').lat ?? null, null);
  assert.equal(yuyuan.shops.find(shop => shop.name === '南翔饅頭店（豫園店）').address, '豫園路87號');
  assert.equal(jingan.shops.find(shop => shop.name === '毒蛇麵館（靜安寺店）').address, '上海市靜安區愚園路140號');
  assert.ok(shanghai.flatMap(station => station.shops).filter(shop => shop.price == null).length > 0);
  assert.deepEqual(shanghai.map(station => station.name_en), ['Yuyuan', "Jing'an Temple", 'South Huangpi Rd', 'Jiaotong University', 'Dapuqiao']);
  assert.equal(JSON.stringify(shanghai).includes('"notes"'), false);
  assert.equal(JSON.stringify(taipei).includes('"notes"'), false);
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

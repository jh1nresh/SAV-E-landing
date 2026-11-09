/** Content adapter for the existing Metro public-payload build. Never fetch remote content. */
import { readFileSync, readdirSync, existsSync, realpathSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { LINE_PATHS, SHANGHAI_LINE_PATHS, linePathsFor, snapToLine } from './metro-lines.mjs';
import { articleMapStores } from '../lib/metro-articles.mjs';
import { isCalendarDate } from '../lib/metro-logic.mjs';

export function stripInternal(value) {
  if (Array.isArray(value)) return value.map(stripInternal);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('_')).map(([key, item]) => [key, stripInternal(item)]));
  return value;
}
const optionalText = (value) => value == null || typeof value === 'string';
const error = (message) => { throw new Error(`metro content: ${message}`); };
export const CITIES = Object.freeze(['taipei', 'shanghai']);
export const DEFAULT_CITY = 'taipei';
export const LINE_IDS = new Set(Object.keys(LINE_PATHS));
export const SHANGHAI_LINE_IDS = new Set(Object.keys(SHANGHAI_LINE_PATHS));
const IMAGE_REL = /^(photos|slides|slides_zh|slides_en)\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/;

export function resolveCity(value, label = 'city') {
  if (value == null || value === '') return DEFAULT_CITY;
  if (value === 'taipei' || value === 'shanghai') return value;
  error(`${label} must be taipei | shanghai`);
}

export function stationKey(city, n) {
  return `${resolveCity(city)}:${n}`;
}

export function localeForCity(city) {
  switch (resolveCity(city)) {
    case 'taipei': return 'zh';
    case 'shanghai': return 'en';
    default: {
      const unexpected = city;
      error(`unexpected city ${unexpected}`);
    }
  }
}

function normalizeImageList(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value)) error(`${label} must be an array or null`);
  return value;
}

export function resolvePhotoList(images) {
  if (images == null) return [];
  if (typeof images !== 'object' || Array.isArray(images)) error('images must be an object or null');
  return normalizeImageList(images.photos, 'images.photos');
}

/** zh prefers slides_zh, en prefers slides_en. Null or a missing locale list falls back to legacy slides. */
export function resolveSlideList(images, locale = 'zh') {
  if (images == null) return [];
  if (typeof images !== 'object' || Array.isArray(images)) error('images must be an object or null');
  const legacy = normalizeImageList(images.slides, 'images.slides');
  if (locale === 'zh') {
    if (images.slides_zh == null) return legacy;
    return normalizeImageList(images.slides_zh, 'images.slides_zh');
  }
  if (locale === 'en') {
    if (images.slides_en == null) return legacy;
    return normalizeImageList(images.slides_en, 'images.slides_en');
  }
  error('locale must be zh | en');
}

export const WGS84 = 'WGS-84';

function isUnsetCoord(value) {
  return value == null || value === '' || value === '未取得';
}

/**
 * Geographic points are WGS-84 only, and only when the package names that datum.
 * Missing coordinates, including 未取得, stay pending. No other datum is converted or assumed.
 */
export function readWgs84(record) {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return { lat: null, lng: null, datum: null, geoStatus: 'pending' };
  }
  const lat = record.lat;
  const lng = record.lng;
  if (isUnsetCoord(lat) || isUnsetCoord(lng)) return { lat: null, lng: null, datum: null, geoStatus: 'pending' };
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    error('coordinates must be finite numbers or 未取得');
  }
  const datum = record.datum ?? record.coord_datum ?? null;
  if (datum !== WGS84) error('coordinates require an explicit datum of WGS-84');
  return { lat, lng, datum: WGS84, geoStatus: 'wgs84' };
}

export function readStationGeo(station) {
  if (station?.station_geo != null) return readWgs84(station.station_geo);
  if (station && ['lat', 'lng', 'datum', 'coord_datum', 'coord_system'].some(key => Object.hasOwn(station, key))) {
    return readWgs84({ ...station, datum: station.datum ?? station.coord_datum ?? station.coord_system ?? null });
  }
  return { lat: null, lng: null, datum: null, geoStatus: 'pending' };
}

/** A geographic pin exists only when DESIGN/GTM marked verified.geo and the point is explicit WGS-84. */
export function stationGeoPin(entry) {
  if (entry?.verified?.geo !== true) return null;
  const geo = readWgs84({ lat: entry.lat, lng: entry.lng, datum: entry.datum ?? entry.coord_system ?? null });
  if (geo.geoStatus !== 'wgs84') return null;
  return { lat: geo.lat, lng: geo.lng, datum: geo.datum };
}

export function shopSuppliesGeo(shop) {
  return !!shop && ['lat', 'lng', 'datum', 'coord_datum'].some(key => Object.hasOwn(shop, key));
}

export function readMetroLines(station) {
  if (station?.metro_lines == null) return null;
  if (!Array.isArray(station.metro_lines) || station.metro_lines.some(line => typeof line !== 'string' || !line.trim())) {
    error(`station ${station?.city ?? '?'}:${station?.n ?? '?'} metro_lines must be an array of line names`);
  }
  return station.metro_lines.map(line => line.trim());
}

export function validateStationMap(s) {
  const city = resolveCity(s.city);
  const paths = linePathsFor(city);
  if (s.map_id != null && (typeof s.map_id !== 'string' || !/^[a-z0-9-]+$/.test(s.map_id))) error(`station ${s.n} map_id must be a simple slug`);
  if (!s.map || !Object.hasOwn(paths, s.map.line) || !Array.isArray(s.map.at) ||
      s.map.at.length !== 2 || !s.map.at.every(Number.isFinite)) error(`station ${s.n} missing map position`);
  const snapped = snapToLine(s.map.line, s.map.at);
  const distance = Math.hypot(...snapped.map((v, i) => v - s.map.at[i]));
  if (distance > 2) error(`station ${s.n} map.at is ${distance.toFixed(2)} units off ${s.map.line}`);
  if (s.map.label != null && !['left', 'right'].includes(s.map.label)) error(`station ${s.n} map.label must be left | right`);
  if (s.map.labelOffset != null && !(Array.isArray(s.map.labelOffset) && s.map.labelOffset.length === 2 &&
      s.map.labelOffset.every(Number.isFinite))) error(`station ${s.n} map.labelOffset must be [dx, dy]`);
  if (s.map.posterLabelOffset != null && !(Array.isArray(s.map.posterLabelOffset) && s.map.posterLabelOffset.length === 2 &&
      s.map.posterLabelOffset.every(Number.isFinite))) error(`station ${s.n} map.posterLabelOffset must be [dx, dy]`);
}
/**
 * Daily / GTM packages must never carry map fields: DESIGN owns coordinates.
 * Fail validation (do not silently strip) so a poisoned content PR cannot merge.
 */
export function rejectPackageMap(station, label = 'daily web.json') {
  if (!station || typeof station !== 'object' || Array.isArray(station)) return station;
  for (const key of ['map', 'map_id']) {
    if (Object.hasOwn(station, key)) error(`${label} (station ${station.n ?? '?'}) must not include ${key}; DESIGN owns coordinates`);
  }
  return station;
}

export function loadDesignStations(contentRoot) {
  const path = resolve(contentRoot, 'design-stations.json');
  if (!existsSync(path)) error('missing DESIGN catalog content/metro/design-stations.json');
  const design = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(design) || design.length === 0) error('design-stations.json must be a nonempty array');
  const byKey = new Map();
  return design.map(entry => {
    if (!entry || !Number.isSafeInteger(entry.n) || entry.n < 1) error('design entry missing n');
    const city = resolveCity(entry.city, `design entry ${entry.n} city`);
    if (typeof entry.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) error(`design entry ${city}:${entry.n} bad slug`);
    if (typeof entry.station !== 'string' || !entry.station) error(`design entry ${city}:${entry.n} bad station name`);
    const cleaned = { ...entry, city };
    // Unverified Wikipedia/OSM blocks are not coordinates. Never copy them onto lat/lng.
    delete cleaned.public_reference;
    const geo = readWgs84({ lat: entry.lat, lng: entry.lng, datum: entry.datum ?? entry.coord_system ?? null });
    cleaned.lat = geo.lat;
    cleaned.lng = geo.lng;
    cleaned.datum = geo.datum;
    // verified.geo false keeps the stored point from becoming a pin. Schematic map.at is separate.
    cleaned.geoPin = stationGeoPin(cleaned) != null;
    cleaned.geoStatus = cleaned.geoPin ? 'wgs84' : 'pending';
    validateStationMap(cleaned);
    const key = stationKey(city, entry.n);
    if (byKey.has(key)) error(`duplicate DESIGN n ${entry.n}`);
    byKey.set(key, cleaned);
    return cleaned;
  });
}

/**
 * DESIGN is the only approved source of map coordinates.
 * Valid numbers in a package are not enough — the station must exist in design-stations.json.
 */
export function applyDesignMaps(stations, design) {
  if (!Array.isArray(design) || design.length === 0) error('DESIGN catalog required');
  const byKey = new Map();
  for (const entry of design) {
    const city = resolveCity(entry?.city);
    const key = stationKey(city, entry?.n);
    if (byKey.has(key)) error(`duplicate DESIGN n ${entry.n}`);
    byKey.set(key, entry);
  }
  return stations.map(station => {
    const city = resolveCity(station.city);
    const approved = byKey.get(stationKey(city, station.n));
    if (!approved) error(`station ${station.n} (${station.slug ?? '?'}) has no DESIGN-approved map`);
    if (approved.slug !== station.slug) {
      error(`station ${station.n} slug mismatch: content=${station.slug} DESIGN=${approved.slug}`);
    }
    const next = { ...station, city, map: structuredClone(approved.map) };
    if (approved.map_id != null) next.map_id = approved.map_id;
    else delete next.map_id;
    // Geographic coordinates come only from the content package. A null or missing
    // pair stays pending; DESIGN schematic map.at is not a lat/lng fallback.
    delete next.public_reference;
    const suppliedGeo = station.station_geo != null || ['lat', 'lng', 'datum', 'coord_datum'].some(key => Object.hasOwn(station, key));
    if (suppliedGeo) {
      const geo = readStationGeo(station);
      next.lat = geo.lat;
      next.lng = geo.lng;
      next.datum = geo.datum;
      next.geoStatus = geo.geoStatus;
    } else {
      delete next.lat;
      delete next.lng;
      delete next.datum;
      delete next.geoStatus;
    }
    // Line numbers such as ["1","14"] belong to the package and the city. Do not copy DESIGN `lines`.
    const metroLines = readMetroLines(station);
    if (metroLines) next.metro_lines = metroLines;
    else delete next.metro_lines;
    validateStationMap(next);
    return next;
  });
}

export function mergeFoodStations(base, daily = [], design = null) {
  if (!Array.isArray(base)) error('stations.json must be an array');
  const stations = new Map();
  const cleanedDaily = daily.map(station => rejectPackageMap(station));
  for (const raw of [...base, ...cleanedDaily]) {
    const city = resolveCity(raw?.city);
    const prev = stations.get(stationKey(city, raw?.n));
    const s = { ...prev, ...stripInternal(raw), city: resolveCity(raw?.city ?? prev?.city) };
    if (!s || !Number.isSafeInteger(s.n) || s.n < 1 || typeof s.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug ?? '') ||
        typeof s.station !== 'string' || !s.station || !isCalendarDate(s.date)) error('invalid station identity/date');
    if (!optionalText(s.tagline) || (s.shops != null && !Array.isArray(s.shops))) error(`invalid fields at ${s.n}`);
    s.shops = (s.shops ?? []).map(shop => {
      if (!shop || typeof shop !== 'object' || Array.isArray(shop)) error('invalid shop');
      for (const key of ['key', 'name', 'dish', 'price', 'price_source', 'address', 'exit_walk', 'hours']) {
        if (!optionalText(shop[key])) error(`invalid shop ${key}`);
      }
      if (!shopSuppliesGeo(shop)) return shop;
      const geo = readWgs84(shop);
      return { ...shop, lat: geo.lat, lng: geo.lng, datum: geo.datum, geoStatus: geo.geoStatus };
    });
    const metroLines = readMetroLines(s);
    if (metroLines) s.metro_lines = metroLines;
    for (const platform of ['instagram', 'threads', 'xiaohongshu']) {
      const url = s.posts?.[platform];
      if (url != null) {
        const host = { instagram: 'www.instagram.com', threads: 'www.threads.com', xiaohongshu: 'www.xiaohongshu.com' }[platform];
        let parsed;
        try { parsed = new URL(url); } catch { error('invalid post URL'); }
        if (parsed.protocol !== 'https:' || parsed.hostname !== host || parsed.username || parsed.password) error('invalid post URL');
      }
    }
    stations.set(stationKey(s.city, s.n), s);
  }
  const result = [...stations.values()].sort((a, b) => (a.city === 'shanghai') - (b.city === 'shanghai') || a.n - b.n);
  const slugs = new Set();
  for (const s of result) {
    const key = `${s.city}:${s.slug}`;
    if (slugs.has(key)) error('duplicate slug');
    slugs.add(key);
  }
  if (design != null) return applyDesignMaps(result, design);
  for (const s of result) validateStationMap(s);
  return result;
}
export function loadDailyStations(contentRoot, repoRoot = contentRoot) {
  const dailyRoot = resolve(contentRoot, 'daily');
  if (!existsSync(dailyRoot)) return [];
  const out = [];
  const push = (file, cityFromDir) => {
    const station = JSON.parse(readFileSync(file, 'utf8'));
    if (cityFromDir) {
      if (station.city == null || station.city === '') station.city = cityFromDir;
      else if (resolveCity(station.city) !== cityFromDir) error(`${relative(repoRoot, file)} city does not match directory ${cityFromDir}`);
    }
    out.push(rejectPackageMap(station, relative(repoRoot, file)));
  };
  for (const entry of readdirSync(dailyRoot).sort()) {
    if (isCalendarDate(entry)) {
      const file = resolve(dailyRoot, entry, 'web.json');
      if (existsSync(file)) push(file, null);
      continue;
    }
    if (entry !== 'taipei' && entry !== 'shanghai') continue;
    for (const date of readdirSync(resolve(dailyRoot, entry)).filter(isCalendarDate).sort()) {
      const file = resolve(dailyRoot, entry, date, 'web.json');
      if (existsSync(file)) push(file, entry);
    }
  }
  return out;
}

function imageLocation(content, station) {
  const folder = `${String(station.n).padStart(2, '0')}-${station.slug}`;
  const city = resolveCity(station.city);
  const legacy = resolve(content, 'images', folder);
  const scoped = resolve(content, 'images', city, folder);
  if (city === 'taipei' && existsSync(legacy)) return { imageRoot: legacy, publicFolder: folder };
  if (existsSync(scoped)) return { imageRoot: scoped, publicFolder: `${city}/${folder}` };
  if (city === 'taipei') return { imageRoot: legacy, publicFolder: folder };
  return { imageRoot: scoped, publicFolder: `${city}/${folder}` };
}

function publishStation(root, content, station, locale) {
  const { imageRoot, publicFolder } = imageLocation(content, station);
  const folder = `${String(station.n).padStart(2, '0')}-${station.slug}`;
  const lists = { photos: resolvePhotoList(station.images), slides: resolveSlideList(station.images, locale) };
  const images = Object.fromEntries(Object.entries(lists).map(([kind, paths]) => [kind, paths.map(path => {
    if (typeof path !== 'string') error('invalid image path');
    const local = path.startsWith(`images/${folder}/`) ? path.slice(`images/${folder}/`.length) : path;
    if (!IMAGE_REL.test(local)) error(`unsafe image path: ${path}`);
    let source = resolve(imageRoot, local);
    if (!existsSync(source)) source = source.replace(/\.[^.]+$/, '.webp');
    if (!existsSync(source)) error(`missing image: ${path}`);
    if (relative(realpathSync(content), realpathSync(source)).startsWith('..') || relative(realpathSync(imageRoot), realpathSync(source)).startsWith('..')) error('image escapes station directory');
    const target = `/metro/images/${publicFolder}/${relative(imageRoot, source)}`;
    const dest = resolve(root, 'public', target.slice(1));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(source, dest);
    return target;
  })]));
  const fields = ['key', 'name', 'dish', 'price', 'price_source', 'address', 'exit_walk', 'hours'];
  const geoFields = ['lat', 'lng', 'datum', 'geoStatus'];
  const published = {
    city: resolveCity(station.city), n: station.n, date: station.date, station: station.station, slug: station.slug,
    map: station.map, ...(station.map_id != null ? { map_id: station.map_id } : {}),
    ...(station.metro_lines ? { metro_lines: station.metro_lines } : {}),
    ...(station.geoStatus ? { lat: station.lat ?? null, lng: station.lng ?? null, datum: station.datum ?? null, geoStatus: station.geoStatus } : {}),
    tagline: station.tagline ?? null,
    shops: (station.shops ?? []).map(shop => {
      const row = Object.fromEntries(fields.map(key => [key, shop[key] ?? null]));
      if (shop.geoStatus) for (const key of geoFields) row[key] = shop[key] ?? null;
      return row;
    }),
    images, posts: station.posts ?? {},
  };
  // Taipei hero cards still require one photo per shop. Shanghai packages may omit photos;
  // those stations stay out of the Taipei payload and are not given a stand-in image.
  if (published.city === 'taipei') articleMapStores([published]);
  return published;
}

export function buildFoodStations(root, options = {}) {
  const content = resolve(root, 'content/metro');
  const design = loadDesignStations(content);
  const city = options.city == null ? DEFAULT_CITY : resolveCity(options.city);
  const stations = mergeFoodStations(JSON.parse(readFileSync(resolve(content, 'stations.json'), 'utf8')), loadDailyStations(content, root), design);
  return stations
    .map(station => publishStation(root, content, station, options.locale ?? localeForCity(station.city)))
    .filter(station => station.city === city);
}

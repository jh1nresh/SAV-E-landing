/** Content adapter for the existing Metro public-payload build. Never fetch remote content. */
import { readFileSync, readdirSync, existsSync, realpathSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { LINE_PATHS } from './metro-lines.mjs';
import { isCalendarDate } from '../lib/metro-logic.mjs';

export function stripInternal(value) {
  if (Array.isArray(value)) return value.map(stripInternal);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('_')).map(([key, item]) => [key, stripInternal(item)]));
  return value;
}
const optionalText = (value) => value == null || typeof value === 'string';
const error = (message) => { throw new Error(`metro content: ${message}`); };
export const LINE_IDS = new Set(Object.keys(LINE_PATHS));
export function validateStationMap(s) {
  if (!s.map || !LINE_IDS.has(s.map.line) || !Array.isArray(s.map.at) ||
      s.map.at.length !== 2 || !s.map.at.every(Number.isFinite)) error(`station ${s.n} missing map position`);
  if (s.map.label != null && !['left', 'right'].includes(s.map.label)) error(`station ${s.n} map.label must be left | right`);
  if (s.map.labelOffset != null && !(Array.isArray(s.map.labelOffset) && s.map.labelOffset.length === 2 &&
      s.map.labelOffset.every(Number.isFinite))) error(`station ${s.n} map.labelOffset must be [dx, dy]`);
}
export function mergeFoodStations(base, daily = []) {
  if (!Array.isArray(base)) error('stations.json must be an array');
  const stations = new Map();
  for (const raw of [...base, ...daily]) {
    const s = { ...stations.get(raw?.n), ...stripInternal(raw) };
    if (!s || !Number.isSafeInteger(s.n) || s.n < 1 || typeof s.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug ?? '') ||
        typeof s.station !== 'string' || !s.station || !isCalendarDate(s.date)) error('invalid station identity/date');
    if (!optionalText(s.tagline) || (s.shops != null && !Array.isArray(s.shops))) error(`invalid fields at ${s.n}`);
    for (const shop of s.shops ?? []) {
      if (!shop || typeof shop !== 'object' || Array.isArray(shop)) error('invalid shop');
      for (const key of ['key', 'name', 'dish', 'price', 'price_source', 'address', 'exit_walk', 'hours']) {
        if (!optionalText(shop[key])) error(`invalid shop ${key}`);
      }
    }
    for (const platform of ['instagram', 'threads', 'xiaohongshu']) {
      const url = s.posts?.[platform];
      if (url != null) {
        const host = { instagram: 'www.instagram.com', threads: 'www.threads.com', xiaohongshu: 'www.xiaohongshu.com' }[platform];
        let parsed;
        try { parsed = new URL(url); } catch { error('invalid post URL'); }
        if (parsed.protocol !== 'https:' || parsed.hostname !== host || parsed.username || parsed.password) error('invalid post URL');
      }
    }
    stations.set(s.n, s);
  }
  const result = [...stations.values()].sort((a, b) => a.n - b.n);
  for (const s of result) validateStationMap(s);
  if (new Set(result.map(s => s.slug)).size !== result.length) error('duplicate slug');
  return result;
}
export function buildFoodStations(root) {
  const content = resolve(root, 'content/metro');
  const read = path => JSON.parse(readFileSync(path, 'utf8'));
  const dailyRoot = resolve(content, 'daily');
  const daily = existsSync(dailyRoot) ? readdirSync(dailyRoot).filter(isCalendarDate).sort()
    .map(date => resolve(dailyRoot, date, 'web.json')).filter(existsSync).map(read) : [];
  const stations = mergeFoodStations(read(resolve(content, 'stations.json')), daily);
  return stations.map(s => {
    const folder = `${String(s.n).padStart(2, '0')}-${s.slug}`;
    const imageRoot = resolve(content, 'images', folder);
    const images = Object.fromEntries(['photos', 'slides'].map(kind => {
      const paths = s.images?.[kind] ?? [];
      if (!Array.isArray(paths)) error('images must be arrays');
      return [kind, paths.map(path => {
        if (typeof path !== 'string') error('invalid image path');
        const local = path.startsWith(`images/${folder}/`) ? path.slice(`images/${folder}/`.length) : path;
        if (!new RegExp(`^${kind}/[a-zA-Z0-9_-]+\\.(webp|jpg|jpeg|png)$`).test(local)) error(`unsafe image path: ${path}`);
        let source = resolve(imageRoot, local);
        if (!existsSync(source)) source = source.replace(/\.[^.]+$/, '.webp');
        if (!existsSync(source)) error(`missing image: ${path}`);
        if (relative(realpathSync(content), realpathSync(source)).startsWith('..') || relative(realpathSync(imageRoot), realpathSync(source)).startsWith('..')) error('image escapes station directory');
        const target = `/metro/images/${folder}/${relative(imageRoot, source)}`;
        const dest = resolve(root, 'public', target.slice(1));
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(source, dest);
        return target;
      })];
    }));
    // Publish display fields only; research URLs and extraction metadata stay in content/.
    const fields = ['key', 'name', 'dish', 'price', 'price_source', 'address', 'exit_walk', 'hours'];
    return { n: s.n, date: s.date, station: s.station, slug: s.slug, map: s.map, ...(s.map_id != null ? { map_id: s.map_id } : {}), tagline: s.tagline ?? null,
      shops: (s.shops ?? []).map(shop => Object.fromEntries(fields.map(key => [key, shop[key] ?? null]))),
      images, posts: s.posts ?? {} };
  });
}

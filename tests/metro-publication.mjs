import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadDailyStations, loadDesignStations } from '../scripts/metro-content.mjs';

/**
 * 南京東路 is in the design catalog without a food package, and the hero
 * leaves it off the map. The same exclusion lives in scripts/metro-content.mjs
 * as SHANGHAI_HERO_HOLDOUTS. A daily package publishes it as a normal station.
 */
export const SHANGHAI_HERO_HOLDOUTS = new Set(['shanghai-nanjing-east']);

const byStationNumber = (a, b) => a.n - b.n;

export function stationPackageKey(station) {
  const city = station?.city == null || station.city === '' ? 'taipei' : station.city;
  return `${city}:${station.n}`;
}

/** Food packages are stations.json plus every daily web.json. Content PRs add the daily file. */
export function loadStationPackages(root = '.') {
  const contentRoot = resolve(root, 'content/metro');
  const base = JSON.parse(readFileSync(resolve(contentRoot, 'stations.json'), 'utf8'));
  const daily = loadDailyStations(contentRoot, resolve(root));
  return { base, daily, keys: new Set([...base, ...daily].map(stationPackageKey)) };
}

/**
 * Published = design stations that have a food package.
 * Map-only = design stations that do not. 南京東路 stays in map-only until its package lands;
 * heroMapPins is the subset the hero actually draws.
 */
export function publicationSets(root = '.') {
  const design = loadDesignStations(resolve(root, 'content/metro'));
  const packages = loadStationPackages(root);
  const published = [];
  const mapOnly = [];
  for (const entry of design) {
    (packages.keys.has(stationPackageKey(entry)) ? published : mapOnly).push(entry);
  }
  published.sort(byStationNumber);
  mapOnly.sort(byStationNumber);
  return { design, packages, published, mapOnly };
}

export function publishedIn(sets, city) {
  return sets.published.filter(entry => entry.city === city);
}

/** Latest food package for a city. A later daily file replaces the same city and n; the newest date wins, then the larger n. */
export function newestPackage(sets, city) {
  const merged = new Map();
  for (const station of [...sets.packages.base, ...sets.packages.daily]) {
    const key = stationPackageKey(station);
    if (!key.startsWith(`${city}:`)) continue;
    merged.set(key, station);
  }
  return [...merged.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.n - a.n)[0] ?? null;
}

export function mapOnlyIn(sets, city) {
  return sets.mapOnly.filter(entry => entry.city === city);
}

/** Design stations the Shanghai hero draws before their food package exists. */
export function heroMapPins(mapOnly) {
  return mapOnly
    .filter(entry => entry.city === 'shanghai' && !SHANGHAI_HERO_HOLDOUTS.has(entry.slug))
    .sort(byStationNumber);
}

/** Public schematic fields copied from a design entry. Notes and coordinates stay out. */
export function schematicMapPin(entry) {
  const map = { line: entry.map.line, at: [entry.map.at[0], entry.map.at[1]] };
  if (entry.map.label != null) map.label = entry.map.label;
  if (entry.map.labelOffset != null) map.labelOffset = [entry.map.labelOffset[0], entry.map.labelOffset[1]];
  if (entry.map.posterLabelOffset != null) map.posterLabelOffset = [entry.map.posterLabelOffset[0], entry.map.posterLabelOffset[1]];
  return {
    n: entry.n,
    slug: entry.slug,
    station: entry.station,
    lines: entry.lines == null ? [] : entry.lines.map(line => line.trim()),
    map,
  };
}

#!/usr/bin/env node
/** Local-only importer: no network, git, PR, merge or deployment operations. */
import { readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync, existsSync, renameSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildPublicMetro } from './build-metro.mjs';
import { isAllowedSourceUrl } from './source-links.mjs';
import { isCalendarDate, taipeiDate, NEW_FLOW_START } from '../lib/metro-logic.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIELDS = new Set(['name', 'dish', 'stationSuggest', 'stationId', 'sourcePosts', 'fromPost', 'area', 'exit', 'exitWalkMin', 'hours', 'backfill']);
const POST_FIELDS = ['dish', 'area', 'exit', 'exitWalkMin', 'hours'];
const SOURCE_KINDS = new Set(['ai', 'founder', 'licensed']);
const fail = (message) => { throw new Error(`add-place: ${message}`); };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const cell = (value) => String(value ?? '未取得').replace(/[\r\n]+/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/`/g, '&#96;');

// Reject symlinks anywhere along a write path, including an existing leaf.
function safePath(root, path) {
  const rel = relative(root, path);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith(sep)) fail('path escapes repository');
  let current = root;
  for (const part of rel.split(sep)) {
    current = resolve(current, part);
    try { if (lstatSync(current).isSymbolicLink()) fail(`symlink in output path: ${rel}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return path;
}

function imageBytes(path) {
  const extension = extname(path).toLowerCase();
  if (!['.jpg', '.webp'].includes(extension)) fail('image must be a local .jpg or .webp file');
  let stat;
  try { stat = lstatSync(path); } catch { fail('missing image file'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('image must be a regular local file');
  if (stat.size > 10 * 1024 * 1024) fail('image exceeds 10 MiB input limit');
  const bytes = readFileSync(path);
  const jpeg = bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  const webp = bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) === bytes.length - 8;
  if (!(extension === '.jpg' ? jpeg : webp)) fail('image bytes do not match .jpg/.webp format');
  return { bytes, extension };
}

function reference(value) {
  return typeof value === 'string' && !!value.trim() && !/^(未取得|未驗證|未查證|沒有|待|無法|unknown|n\/a)/i.test(value.trim());
}
function versionReferences(value) {
  if (typeof value === 'string') return reference(value);
  return plain(value) && Object.keys(value).length > 0 && Object.values(value).every(reference);
}

// Read local committed history only. Refuse shallow clones rather than risk recycling IDs.
function usedIdsFromHistory(root) {
  const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding:'utf8', maxBuffer:8*1024*1024, stdio:['ignore','pipe','pipe'] });
  try {
    if (realpathSync(git(['rev-parse','--show-toplevel']).trim()) !== root || git(['rev-parse','--is-shallow-repository']).trim() !== 'false') fail('complete local Git history is required for ID allocation');
    const history = git(['log','--format=','--no-ext-diff','--no-textconv','-p','HEAD','--','data/metro.json']);
    return [...history.matchAll(/"id"\s*:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (error) {
    fail(`cannot establish retired IDs from local history: ${error.message.split('\n')[0]}`);
  }
}

function metadata(entry) {
  if (!plain(entry._f1) || entry._f1.status !== '有') fail('_f1.status must be 有 (missing/partial evidence cannot be imported)');
  if (!Array.isArray(entry._f1.evidence) || !entry._f1.evidence.length || !entry._f1.evidence.every(reference) || !versionReferences(entry._f1.factsTakenFrom)) fail('missing F-1 version/evidence references');
  const image = entry._image;
  if (!plain(image) || !SOURCE_KINDS.has(image.imageSourceSuggest)) fail('missing/invalid _image.imageSourceSuggest');
  const status = image.imageStatus ?? image.provenance?.status;
  if (typeof status !== 'string' || !/^(通過|有條件通過)/.test(status)) fail('image provenance is not accepted (圖片來源不進或未取得)');
  for (const gate of [entry._f1.entryGate, image.imageStatus, image.provenance?.status]) {
    if (typeof gate === 'string' && /不進|待證實|沒有|未驗證/.test(gate)) fail('image/entry evidence explicitly blocks import');
  }
  if (image.imageSourceSuggest === 'licensed' && !reference(image.licence)) fail('licensed image needs a written licence reference');
  return image;
}

function report(entry, store, station, files, unchanged, check, imageHash) {
  const image = entry._image;
  const source = store.sourcePosts.map((p) => `${p.platform}: ${p.url} (${p.date})`).join('; ');
  const lines = [
    `## ${unchanged ? 'No changes (already imported)' : check ? 'Dry run — no files written' : 'Added place'}`,
    '', '| id | 店名 | 站別 | 貼文來源與日期 | addedAt | 圖片來源 | 工具 | 生成日期 |',
    '|---|---|---|---|---|---|---|---|',
    `| ${[store.id, store.name, station.name, source, store.addedAt, image.imageSourceSuggest, image.tool, image.generatedDate].map(cell).join(' | ')} |`,
    '', `Files: ${files.map(cell).join(', ') || 'none'}`,
    `Image SHA-256: ${imageHash}`,
    '價格待查；verified=false。商用權利未經本工具查證；來源事實仍需人工驗收。',
    'addedAt 為預定上站日；合併延後時需另行更新並重新驗收。',
    '', '### Internal review evidence (never written into site data)',
  ];
  for (const [key, value] of Object.entries(entry)) {
    if (key.startsWith('_') || key === 'fromPost') lines.push(`- ${cell(key)}: ${cell(JSON.stringify(value))}`);
  }
  return lines.join('\n')+'\n';
}

export function addPlace({ root = ROOT, entryPath, imagePath, check = false, addedAt, id, today = taipeiDate(), allocationHistory }) {
  root = realpathSync(root);
  if (!isCalendarDate(today) || (addedAt !== undefined && (!isCalendarDate(addedAt) || addedAt > today))) fail('addedAt must be a valid non-future Asia/Taipei date');
  const entry = JSON.parse(readFileSync(entryPath, 'utf8'));
  if (!plain(entry)) fail('entry must be an object');
  for (const key of Object.keys(entry)) {
    if (key.startsWith('_')) continue;
    if (/^price/i.test(key)) fail('price fields are forbidden in entry input');
    if (!FIELDS.has(key)) fail(`unknown entry field: ${key}`);
  }
  const image = metadata(entry);
  if (typeof entry.name !== 'string' || !entry.name.trim()) fail('missing name');
  if ('backfill' in entry && typeof entry.backfill !== 'boolean') fail('backfill must be boolean');
  if (!Array.isArray(entry.fromPost) || entry.fromPost.some((k) => !POST_FIELDS.includes(k))) fail('fromPost must list only supported post fields');
  if (!Array.isArray(entry.sourcePosts) || !entry.sourcePosts.length) fail('missing sourcePosts');
  const sources = entry.sourcePosts.map((post) => {
    if (!plain(post) || Object.keys(post).some((k) => !['platform','url','date'].includes(k))) fail('unknown sourcePosts field');
    const platform = post.platform === 'instagram' ? 'ig' : post.platform;
    if (!isAllowedSourceUrl(post.url, platform)) fail('sourcePosts URL/platform does not match canonical whitelist');
    if (!isCalendarDate(post.date) || post.date > today) fail('invalid/future sourcePosts date');
    return { platform, url: post.url, date: post.date };
  });
  const dataPath = safePath(root, resolve(root, 'data/metro.json'));
  const original = readFileSync(dataPath, 'utf8');
  const data = JSON.parse(original);
  const stationId = entry.stationId ?? entry.stationSuggest;
  if (entry.stationId && entry.stationSuggest && entry.stationId !== entry.stationSuggest) fail('stationId conflicts with stationSuggest');
  const station = data.stations.find((s) => s.id === stationId);
  if (!station || !/^[a-z0-9-]+$/.test(stationId)) fail('unknown station');
  if (station.status !== 'live') fail('station is not live; station changes require a separate PR');
  const identity = (s) => s.kind === 'post' && s.stationId === stationId && s.name === entry.name && isDeepStrictEqual(s.sourcePosts, sources);
  const matches = data.stores.filter(identity);
  if (matches.length > 1) fail('ambiguous existing entry');
  const existing = matches[0];
  // allocationHistory is a dependency seam for isolated tests, never an entry/CLI option.
  const usedIds = [...data.stores.map((s) => s.id), ...(allocationHistory ?? usedIdsFromHistory(root))];
  const priorNumbers = usedIds.map((used) => Number(used.match(new RegExp(`^${stationId}-([1-9][0-9]*)$`))?.[1] ?? 0));
  const next = Math.max(0, ...priorNumbers) + 1;
  id ??= existing?.id ?? `${stationId}-${next}`;
  if (!new RegExp(`^${stationId}-[1-9][0-9]*$`).test(id)) fail('id must be <station>-<positive integer>');
  if (!existing && Number(id.slice(stationId.length + 1)) < next) fail('id must not reuse a retired/lower sequence');
  const goLive = addedAt ?? existing?.addedAt ?? today;
  const latest = sources.map((p) => p.date).sort().at(-1);
  if (goLive < latest) fail('addedAt precedes latest post date');
  const inputImage = imagePath ?? image.file;
  if (typeof inputImage !== 'string' || !inputImage || /^https?:/.test(inputImage)) fail('missing local image');
  const imgPath = resolve(dirname(resolve(entryPath)), inputImage);
  const { bytes, extension } = imageBytes(imgPath);
  const imageHash = hash(bytes);
  if (image.sha256 !== undefined && image.sha256 !== imageHash) fail('image SHA-256 differs from supplied provenance');
  const destination = safePath(root, resolve(root, `public/assets/food/${id}${extension}`));
  const store = {
    id, kind: 'post', stationId, name: entry.name,
    priceNT: null, pricePending: true, verified: false,
    sourcePosts: sources, addedAt: goLive,
    backfill: entry.backfill ?? latest < NEW_FLOW_START,
    image: `/assets/food/${id}${extension}`, imageSource: image.imageSourceSuggest,
  };
  for (const key of POST_FIELDS) {
    if (!(key in entry) || entry[key] == null) continue;
    // dish is intrinsically a post field; optional location/time details need fromPost evidence.
    if (key !== 'dish' && !entry.fromPost.includes(key)) fail(`${key} is not declared in fromPost`);
    if (key === 'exitWalkMin' ? typeof entry[key] !== 'number' || !Number.isFinite(entry[key]) || entry[key] < 0 : typeof entry[key] !== 'string') fail(`invalid ${key}`);
    if (typeof entry[key] === 'string' && !entry[key].trim()) continue;
    if (key === 'hours' && /訂位|外帶|排隊/.test(entry[key])) fail('hours contains non-time notes; correct input and record removed notes');
    store[key] = entry[key];
  }
  const collision = data.stores.find((s) => s.id === id);
  if (collision && !isDeepStrictEqual(collision, store)) fail('id exists with different content; updates require a separate correction PR');
  if (existing && existing.id !== id) fail('entry already exists under a different id');
  const destinationExists = existsSync(destination);
  if (destinationExists && hash(readFileSync(destination)) !== imageHash) fail('destination image differs; refusing overwrite');
  if (collision && !destinationExists) fail('existing entry image is missing; correction required');
  if (!collision) {
    data.stores.push(store);
    station.updatedAt = [station.updatedAt, goLive].filter(Boolean).sort().at(-1);
    data._meta.asOf = [data._meta.asOf, goLive].filter(Boolean).sort().at(-1);
  }
  // Reuse the actual build validator, including source rules and public serialization.
  buildPublicMetro(data);
  const files = collision ? [] : ['data/metro.json', ...(destinationExists ? [] : [relative(root, destination)])];
  const description = report(entry, store, station, files, !!collision, check, imageHash);
  if (check || collision) return { changed: !collision, files, description, store };

  const lockPath = safePath(root, resolve(root, 'data/.add-place.lock'));
  const tempPath = safePath(root, resolve(root, `data/.metro-${process.pid}.tmp`));
  let lock, madeImage = false, madeTemp = false;
  try {
    lock = openSync(lockPath, 'wx');
    if (readFileSync(dataPath, 'utf8') !== original) fail('metro.json changed during validation; retry against current data');
    safePath(root, destination);
    mkdirSync(dirname(destination), { recursive: true });
    if (!destinationExists) { writeFileSync(destination, bytes, { flag: 'wx' }); madeImage = true; }
    writeFileSync(tempPath, JSON.stringify(data, null, 2)+'\n', { flag: 'wx' }); madeTemp = true;
    renameSync(tempPath, dataPath); madeTemp = false;
  } catch (error) {
    if (madeImage) unlinkSync(destination);
    throw error;
  } finally {
    if (madeTemp) unlinkSync(tempPath);
    if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
  }
  return { changed: true, files, description, store };
}

function main() {
  const args = process.argv.slice(2);
  const entryPath = args.shift();
  if (!entryPath || entryPath.startsWith('--')) fail('usage: add-place.mjs <entry.json> [--image path] [--check] [--id station-N] [--added-at YYYY-MM-DD]');
  const options = { entryPath };
  const seen = new Set();
  while (args.length) {
    const flag = args.shift();
    if (seen.has(flag)) fail(`duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--check') { options.check = true; continue; }
    const key = { '--image':'imagePath', '--id':'id', '--added-at':'addedAt' }[flag];
    if (!key || !args.length || args[0].startsWith('--')) fail(`unknown/incomplete option: ${flag}`);
    options[key] = args.shift();
    if (key === 'imagePath') options[key] = resolve(options[key]);
  }
  process.stdout.write(addPlace(options).description);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

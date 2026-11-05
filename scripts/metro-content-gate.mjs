import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Daily content JSON only: content/metro/daily/YYYY-MM-DD/web.json */
export const DAILY_WEB_JSON = /^content\/metro\/daily\/\d{4}-\d{2}-\d{2}\/web\.json$/;
/** Station images only under images/<NN-slug>/{photos|slides}/<file>.(webp|jpg|jpeg|png) */
export const METRO_IMAGE = /^content\/metro\/images\/\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\/(?:photos|slides)\/[a-zA-Z0-9_-]+\.(?:webp|jpg|jpeg|png)$/;

export function isAllowedMetroContentPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\0')) return false;
  if (path.split('/').some(part => part === '..' || part === '.' || !part)) return false;
  return DAILY_WEB_JSON.test(path) || METRO_IMAGE.test(path);
}

/**
 * Content auto-merge gate: only explicit daily JSON + image paths.
 * Rejects code, workflows, DESIGN config, docs, build.py, stations.json, symlinks (caller), deletes (caller).
 */
export function contentOnly(files) {
  return Array.isArray(files) && files.length > 0 && files.every(isAllowedMetroContentPath);
}

/** Parse `git diff --name-status -z` records into { status, path } entries. */
export function parseNameStatus(buffer) {
  const parts = String(buffer).split('\0').filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const status = parts[i];
    const path = parts[i + 1];
    if (!status || path == null) break;
    out.push({ status: status[0], path });
  }
  return out;
}

/**
 * Eligible when every change is an allowed path add/modify; no deletes, renames, copies, or typechanges.
 */
export function contentOnlyFromNameStatus(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  return entries.every(({ status, path }) =>
    (status === 'A' || status === 'M') && isAllowedMetroContentPath(path));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readFileSync(0, 'utf8');
  let eligible;
  let message;
  if (raw.includes('\0') && /^[AMDCRT!]/.test(raw)) {
    const entries = parseNameStatus(raw);
    eligible = contentOnlyFromNameStatus(entries);
    message = eligible
      ? 'All changed files are Metro daily JSON or images (no deletes/code/DESIGN).'
      : 'Skipping auto-merge: empty diff, deletes, or changes outside allowed daily/image paths. Human review required.';
  } else {
    const files = raw.split('\0').filter(Boolean);
    eligible = contentOnly(files);
    message = eligible
      ? 'All changed files are Metro daily JSON or images.'
      : 'Skipping auto-merge: empty diff or changes outside allowed daily/image paths. Human review required.';
  }
  console.log(message);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `eligible=${eligible}\n`);
}

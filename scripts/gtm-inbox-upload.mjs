#!/usr/bin/env node
/**
 * GTM upload: push a dated delivery package to branch gtm/inbox.
 * Never writes main. Requires git + gh auth on the uploader machine.
 *
 * Usage:
 *   node scripts/gtm-inbox-upload.mjs --dir /path/to/package
 *
 * Package dir must contain manifest.json, web.json, and the image paths listed in the manifest.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, cpSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INBOX_BRANCH, readManifest, inspectPackage, loadDesignIndex, folderForStation,
} from './metro-gtm-inbox.mjs';

function usage(code = 1) {
  console.error(`Usage: node scripts/gtm-inbox-upload.mjs --dir <package-dir> [--repo <owner/name>] [--dry-run]
Package must include manifest.json + web.json + listed images. Pushes only to ${INBOX_BRANCH}.`);
  process.exit(code);
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) usage(0);
const dir = argValue(argv, '--dir');
const repo = argValue(argv, '--repo') || 'jh1nresh/SAV-E-landing';
const dryRun = argv.includes('--dry-run');
if (!dir) usage(1);
const packageDir = resolve(dir);
if (!existsSync(packageDir)) {
  console.error(`Package dir not found: ${packageDir}`);
  process.exit(1);
}

const manifest = readManifest(packageDir);
if (manifest.ready_for_site !== true) {
  console.error('Refusing upload: set manifest.ready_for_site to true when the package is cleared for the site.');
  process.exit(1);
}

// Optional local DESIGN check if checkout present
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {
  const design = loadDesignIndex(repoRoot);
  const inspection = inspectPackage(packageDir, design);
  if (!inspection.ok && !inspection.skip) {
    console.warn(`Warning: local DESIGN check failed (${inspection.reason}): ${inspection.message}`);
    console.warn('Upload may still proceed; Actions will open/update a blocking issue.');
  }
} catch (err) {
  console.warn(`Warning: could not run local DESIGN check: ${err.message}`);
}

const destPrefix = manifest.date;
console.log(`Preparing upload to ${repo}@${INBOX_BRANCH}:${destPrefix}/`);

if (dryRun) {
  console.log('Dry run OK. Would upload:', {
    date: manifest.date,
    station_n: manifest.station_n,
    slug: manifest.slug,
    delivery_version: manifest.delivery_version,
    photos: manifest.files.photos.length,
    slides: manifest.files.slides.length,
  });
  process.exit(0);
}

const work = mkdtempSync(resolve(tmpdir(), 'gtm-inbox-upload-'));
try {
  run('git', ['clone', '--depth', '1', '--branch', INBOX_BRANCH, `https://github.com/${repo}.git`, work], {
    env: process.env,
  });
} catch {
  // Branch may not exist yet — clone main and create orphan inbox branch
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  run('git', ['clone', '--depth', '1', '--branch', 'main', `https://github.com/${repo}.git`, work]);
  run('git', ['-C', work, 'checkout', '--orphan', INBOX_BRANCH]);
  run('git', ['-C', work, 'rm', '-rf', '.'], { stdio: 'ignore' });
  writeFileSync(resolve(work, 'README.md'), `# ${INBOX_BRANCH}\n\nGTM delivery inbox. Actions reads dated folders; never merge this branch to main.\n`);
  run('git', ['-C', work, 'add', 'README.md']);
  run('git', ['-C', work, 'commit', '-m', 'chore(inbox): initialize gtm/inbox branch']);
}

const target = resolve(work, destPrefix);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(packageDir, target, { recursive: true });
run('git', ['-C', work, 'add', destPrefix]);
const status = run('git', ['-C', work, 'status', '--porcelain']);
if (!status) {
  console.log('No changes to upload (identical package already on inbox).');
  rmSync(work, { recursive: true, force: true });
  process.exit(0);
}
run('git', ['-C', work, 'commit', '-m', `gtm(inbox): ${manifest.date} ${manifest.station} (${manifest.delivery_version})`]);
run('git', ['-C', work, 'push', '-u', 'origin', INBOX_BRANCH]);
console.log(`Uploaded to ${repo}@${INBOX_BRANCH}:${destPrefix}/`);
rmSync(work, { recursive: true, force: true });

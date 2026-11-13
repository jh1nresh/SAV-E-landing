import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function writePackage(dir, { date, n, city, slug, station }) {
  mkdirSync(join(dir, 'photos'), { recursive: true });
  mkdirSync(join(dir, 'slides'), { recursive: true });
  const photos = ['photos/shop.webp'];
  const slides = ['slides/01-cover.webp'];
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    delivery_version: `${date}.1`,
    date,
    station_n: n,
    city,
    slug,
    station,
    ready_for_site: true,
    files: { web_json: 'web.json', photos, slides },
  }));
  writeFileSync(join(dir, 'web.json'), JSON.stringify({
    n, city, slug, station, date, tagline: 't',
    shops: [], images: { photos, slides }, posts: {},
  }));
  writeFileSync(join(dir, 'photos/shop.webp'), 'img');
  writeFileSync(join(dir, 'slides/01-cover.webp'), 'slide');
}

test('two-checkout sync reads main/ and plans taipei and shanghai daily paths', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'gtm-two-checkout-'));
  const mainLink = join(workspace, 'main');
  try {
    symlinkSync(repoRoot, mainLink);
    // Poison the workflow cwd. A resolver that forgets the main/ prefix either
    // dies on the missing line file or accepts this fake catalog. Taipei 18 is
    // now a real DESIGN station, so the fixture uses 99, which the trusted
    // catalog does not contain.
    mkdirSync(join(workspace, 'content/metro/daily/taipei/2026-11-07'), { recursive: true });
    mkdirSync(join(workspace, 'content/metro/daily/shanghai/2026-11-08'), { recursive: true });
    writeFileSync(join(workspace, 'content/metro/daily/taipei/2026-11-07/web.json'), '{}');
    writeFileSync(join(workspace, 'content/metro/daily/shanghai/2026-11-08/web.json'), '{}');
    writeFileSync(join(workspace, 'content/metro/design-stations.json'), JSON.stringify([
      {
        n: 99, city: 'taipei', slug: 'taipei-not-in-design', station: '未收錄站',
        map: { line: 'L_red', at: [246, 268] },
      },
    ]));
    writeFileSync(join(workspace, 'content/metro/shanghai-lines.json'), '{');

    writePackage(join(workspace, 'inbox/2026-11-07'), {
      date: '2026-11-07', n: 99, city: 'taipei',
      slug: 'taipei-not-in-design', station: '未收錄站',
    });
    writePackage(join(workspace, 'inbox/2026-11-08'), {
      date: '2026-11-08', n: 2, city: 'shanghai',
      slug: 'shanghai-yuyuan', station: '豫園',
    });
    writePackage(join(workspace, 'inbox/2026-11-09'), {
      date: '2026-11-09', n: 17, city: 'taipei',
      slug: 'nangang', station: '南港',
    });

    const result = spawnSync(process.execPath, [
      'main/scripts/metro-gtm-inbox-sync.mjs',
      '--repo-root', 'main',
      '--inbox-root', 'inbox',
      '--out', 'plan.json',
    ], { cwd: workspace, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.equal(result.stderr.includes('ENOENT'), false, result.stderr);
    assert.equal(result.stderr.includes('shanghai-lines.json'), false, result.stderr);

    const plan = JSON.parse(readFileSync(join(workspace, 'plan.json'), 'utf8'));
    const byDate = Object.fromEntries(plan.packages.map(entry => [entry.manifest?.date ?? entry.packageDir, entry]));

    const blocked = byDate['2026-11-07'];
    assert.equal(blocked.action, 'issue');
    assert.equal(blocked.reason, 'missing_design_coords');
    assert.match(blocked.message, /taipei:99/);

    const shanghai = byDate['2026-11-08'];
    assert.equal(shanghai.action, 'content_pr');
    assert.equal(shanghai.manifest.city, 'shanghai');
    assert.ok(shanghai.files.some(file => file.dest === 'content/metro/daily/shanghai/2026-11-08/web.json'));
    assert.ok(shanghai.files.some(file => file.dest === 'content/metro/images/shanghai/02-shanghai-yuyuan/photos/shop.webp'));

    const taipei = byDate['2026-11-09'];
    assert.equal(taipei.action, 'content_pr');
    assert.equal(taipei.manifest.city, 'taipei');
    assert.ok(taipei.files.some(file => file.dest === 'content/metro/daily/taipei/2026-11-09/web.json'));
    assert.ok(taipei.files.some(file => file.dest === 'content/metro/images/17-nangang/photos/shop.webp'));
    assert.equal(taipei.files.some(file => file.dest.includes('/shanghai/')), false);
  } finally {
    try { unlinkSync(mainLink); } catch { /* already removed */ }
    rmSync(workspace, { recursive: true, force: true });
  }
});

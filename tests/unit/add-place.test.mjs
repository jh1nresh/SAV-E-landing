import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { addPlace } from '../../scripts/add-place.mjs';
import { buildPublicMetro } from '../../scripts/build-metro.mjs';

// Synthetic data only. Real GTM drafts are exercised locally, never committed.
const image = readFileSync(new URL('../../public/assets/food/dongmen-1.jpg', import.meta.url));
const raw = JSON.parse(readFileSync(new URL('../../data/metro.json', import.meta.url)));
function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'savvy-import-test-'));
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(join(root, 'data')); mkdirSync(join(root, 'public/assets/food'), { recursive: true });
  writeFileSync(join(root, 'data/metro.json'), JSON.stringify(raw, null, 2)+'\n');
  writeFileSync(join(root, 'dish.jpg'), image);
  const entry = {
    name: 'TEST_ONLY_PLACE', dish: 'TEST_ONLY_DISH', stationSuggest: 'dongmen',
    sourcePosts: [{ platform: 'instagram', url: 'https://www.instagram.com/savvysave_/p/TEST_ONLY_123/', date: '2026-10-27' }],
    exit: 'TEST_ONLY_EXIT', fromPost: ['exit'],
    _f1: { status: '有', factsTakenFrom: 'TEST_ONLY_VERSION', evidence: ['TEST_ONLY_RECORD'] },
    _image: { file: './dish.jpg', imageSourceSuggest: 'ai', imageStatus: '通過', tool: 'TEST_ONLY_TOOL' },
    _draft: { note: 'TEST_PRIVATE_NEVER_SHIP', nested: { _hidden: true } }, ...overrides,
  };
  const entryPath = join(root, 'entry.json');
  writeFileSync(entryPath, JSON.stringify(entry));
  return { root, entryPath, today: '2026-10-28', allocationHistory: ['arena-1'] };
}
function snapshot(root) {
  const files = {};
  const walk = (dir) => { for (const name of readdirSync(dir)) {
    const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else files[p.slice(root.length)] = readFileSync(p).toString('base64');
  }};
  walk(root); return files;
}

test('dry-run is read-only; import preserves existing entries; rerun is byte-idempotent', (t) => {
  const opts = fixture(t); const before = snapshot(opts.root);
  const dry = addPlace({ ...opts, check: true });
  assert.equal(dry.changed, true); assert.deepEqual(snapshot(opts.root), before);
  assert.match(dry.description, /TEST_PRIVATE_NEVER_SHIP/);
  const first = addPlace(opts); assert.equal(first.changed, true);
  const data = JSON.parse(readFileSync(join(opts.root, 'data/metro.json')));
  assert.deepEqual(data.stores.slice(0, -1), raw.stores);
  assert.deepEqual(data.stations.filter((s) => s.id !== 'dongmen'), raw.stations.filter((s) => s.id !== 'dongmen'));
  assert.equal(data.stations.find((s) => s.id === 'dongmen').updatedAt, '2026-10-28');
  assert.equal(data._meta.asOf, '2026-10-28');
  assert.equal(data.stores.at(-1).priceNT, null); assert.equal(data.stores.at(-1).pricePending, true);
  assert.equal(data.stores.at(-1).sourcePosts[0].platform, 'ig');
  assert.equal(data.stores.at(-1).backfill, false);
  assert.doesNotMatch(JSON.stringify(data), /TEST_PRIVATE_NEVER_SHIP|TEST_ONLY_VERSION|TEST_ONLY_TOOL|fromPost|_draft/);
  assert.doesNotMatch(JSON.stringify(buildPublicMetro(data)), /imageSource|TEST_PRIVATE_NEVER_SHIP/);
  const after = snapshot(opts.root);
  const second = addPlace({ ...opts, today: '2026-10-29' });
  assert.equal(second.changed, false); assert.deepEqual(second.files, []); assert.deepEqual(snapshot(opts.root), after);
});

test('refuses invalid entries without changing any file', (t) => {
  const cases = [
    [{ stationSuggest: 'unknown' }, /unknown station/],
    [{ stationSuggest: 'TEST_PENDING_STATION' }, /not live/],
    [{ sourcePosts: [] }, /sourcePosts/],
    [{ priceNT: 800 }, /price fields/], [{ priceNT: null }, /price fields/], [{ pricePending: true }, /price fields/],
    [{ _f1: { status: '沒有' } }, /_f1/], [{ _f1: { status: '部分' } }, /_f1/],
    [{ _f1: { status:'有', factsTakenFrom:{}, evidence:[null] } }, /F-1/],
    [{ _f1: { status:'有', factsTakenFrom:'未取得', evidence:['未取得'] } }, /F-1/],
    [{ _image: { file: './absent.webp', imageSourceSuggest: 'ai', imageStatus: '通過' } }, /missing image/],
    [{ _image: { file: './dish.jpg', imageSourceSuggest: 'ai', imageStatus: '不進（圖片來源待證實）' } }, /provenance/],
    [{ _image: { file: './dish.jpg', imageSourceSuggest: 'ai', imageStatus: '通過', sha256: 'bad' } }, /SHA-256/],
    [{ sourcePosts: [{ platform: 'instagram', url: 'https://www.instagram.com/p/TEST/', date:'2026-10-27' }] }, /whitelist/],
    [{ fromPost: [] }, /not declared/], [{ hours: '建議先訂位', fromPost:['exit','hours'] }, /non-time/],
    [{ extra: 'UNKNOWN' }, /unknown entry/], [{ backfill: 'true' }, /boolean/],
    [{ _image: { file: './dish.jpg', imageSourceSuggest: 'licensed', imageStatus: '通過', licence:'未取得' } }, /licence/],
  ];
  for (const [entry, error] of cases) {
    const opts = fixture(t, entry);
    if (entry.stationSuggest === 'TEST_PENDING_STATION') {
      const data = structuredClone(raw);
      data.stations.push({ ...raw.stations[0], id: 'test-pending', status: 'coming_soon', updatedAt: null });
      const input = JSON.parse(readFileSync(opts.entryPath)); input.stationSuggest = 'test-pending';
      writeFileSync(opts.entryPath, JSON.stringify(input));
      writeFileSync(join(opts.root, 'data/metro.json'), JSON.stringify(data));
    }
    const before = snapshot(opts.root);
    assert.throws(() => addPlace(opts), error); assert.deepEqual(snapshot(opts.root), before);
  }
});

test('rejects traversal ids, symlink destination, image overwrite, locks and correction attempts', (t) => {
  const opts = fixture(t);
  assert.throws(() => addPlace({ ...opts, id: '../escape' }), /id must/);
  const result = addPlace(opts);
  assert.throws(() => addPlace({ ...opts, addedAt: '2026-10-29', today: '2026-10-29' }), /different content/);
  const other = fixture(t); const plan = addPlace({ ...other, check: true });
  const dest = resolve(other.root, 'public'+plan.store.image);
  symlinkSync(join(other.root, 'dish.jpg'), dest);
  assert.throws(() => addPlace(other), /symlink/);
  const locked = fixture(t); writeFileSync(join(locked.root, 'data/.add-place.lock'), 'another writer');
  const before = snapshot(locked.root);
  assert.throws(() => addPlace(locked), /EEXIST/); assert.deepEqual(snapshot(locked.root), before);
  const clobber = fixture(t); const clobberPlan = addPlace({ ...clobber, check: true });
  writeFileSync(resolve(clobber.root, 'public'+clobberPlan.store.image), 'different bytes');
  assert.throws(() => addPlace(clobber), /refusing overwrite/);
  assert.equal(result.store.id.startsWith('dongmen-'), true);
});

test('backfill, null optional fields and independent source/date checks', (t) => {
  const opts = fixture(t, { sourcePosts: [{ platform:'threads', url:'https://www.threads.com/@savvysave_/post/TEST', date:'2026-10-24' }], exitWalkMin:null });
  assert.equal(addPlace({ ...opts, check:true }).store.backfill, true);
  for (const addedAt of ['2026-02-30', '2026-10-29', '2026-10-23']) assert.throws(() => addPlace({ ...opts, check:true, addedAt }), /addedAt/);
});

test('allocator does not refill the retired arena-1 gap', (t) => {
  const opts = fixture(t, {stationSuggest:'arena'});
  assert.equal(addPlace({...opts, check:true}).store.id, 'arena-5');
});

test('retired highest IDs remain reserved, including explicit lower IDs', (t) => {
  const opts = fixture(t, {stationSuggest:'arena'});
  opts.allocationHistory.push('arena-12');
  assert.equal(addPlace({...opts,check:true}).store.id, 'arena-13');
  assert.throws(() => addPlace({...opts,check:true,id:'arena-12'}), /retired/);
});

import { execFileSync } from 'node:child_process';
test('CLI allocation history reserves deleted highest IDs and rejects shallow history', (t) => {
  const opts = fixture(t, {stationSuggest:'arena'});
  const git = (...args) => execFileSync('git', ['-C',opts.root,'-c','core.hooksPath=/dev/null','-c','commit.gpgSign=false','-c','user.name=Fixture','-c','user.email=fixture@example.invalid', ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('init','-q');
  const dataFile = join(opts.root,'data/metro.json');
  const base = JSON.parse(readFileSync(dataFile));
  base.stores.push({...base.stores[0],id:'arena-19'});
  writeFileSync(dataFile,JSON.stringify(base,null,2)+'\n');
  git('add','data/metro.json'); git('commit','-qm','historical store');
  base.stores.pop(); writeFileSync(dataFile,JSON.stringify(base,null,2)+'\n');
  git('add','data/metro.json'); git('commit','-qm','retire highest store');
  const args = {...opts,allocationHistory:undefined,check:true};
  assert.equal(addPlace(args).store.id,'arena-20');
  assert.throws(() => addPlace({...args,id:'arena-19'}),/retired/);
  writeFileSync(join(opts.root,'.git/shallow'),git('rev-parse','HEAD').trim()+'\n');
  assert.throws(() => addPlace(args),/complete local Git history/);
});

test('licensed images require a meaningful written licence reference', (t) => {
  for (const licence of [{}, [], '  ', '沒有', '未查證', '未驗證', null]) {
    const opts = fixture(t, {_image:{file:'./dish.jpg',imageSourceSuggest:'licensed',imageStatus:'通過',licence}});
    assert.throws(() => addPlace({...opts,check:true}), /licence/);
  }
});

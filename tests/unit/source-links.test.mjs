import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedSourceUrl, isAllowedStoreSource } from '../../scripts/source-links.mjs';
const ig = 'https://www.instagram.com/savvysave_/p/ABC_123-xyz/';
const th = 'https://www.threads.com/@savvysave_/post/ABC_123-xyz';
test('LK: accepts only canonical account permalinks with matching platform', () => {
  assert.equal(isAllowedSourceUrl(ig, 'ig'), true);
  assert.equal(isAllowedSourceUrl(th, 'threads'), true);
  assert.equal(isAllowedSourceUrl(ig, 'threads'), false);
  assert.equal(isAllowedSourceUrl(th, 'ig'), false);
  assert.equal(isAllowedSourceUrl(ig, 'xhs'), false);
});
test('LK: rejects unsupported hosts, paths, accounts, encodings, queries and fragments', () => {
  const bad = [
    ig.replace('https:', 'http:'), ig.replace('www.', ''), ig.replace('www.', 'WWW.'),
    ig.replace('instagram.com', 'instagram.com.evil.test'), ig.replace('savvysave_', 'someone'),
    ig.replace('savvysave_/', ''), ig.replace('/p/', '/reel/'), ig.replace('ABC_123-xyz/', ''),
    ig.slice(0,-1), th+'/', th.replace('threads.com','threads.net'),
    'https://www.xiaohongshu.com/explore/abc', 'https://x.com/savvysave_/status/123',
    'https://google.com/maps', 'https://example.org/blog', '#example',
    ig.replace('www.', 'user@www.'), ig.replace('.com/', '.com:443/'),
    ig.replace('savvysave_', '%73avvysave_'), ig.replace('/p/', '/a/../p/'),
    ig+'\n', '\t'+th, ig+'#example', th+'#section',
    ...['igsh=x','utm_source=x','fbclid=x','foo=x',''].flatMap((q) => [ig+'?'+q, th+'?'+q]),
    null, {}, 123,
  ];
  for (const url of bad) assert.equal(isAllowedSourceUrl(url), false, String(url));
});

// Reachable build path, not just the helper: malformed links must stop data validation.
import { readFileSync } from 'node:fs';
import { buildPublicMetro } from '../../scripts/build-metro.mjs';
test('LK: build rejects bad post links and invalid backfill flags', () => {
  const raw = JSON.parse(readFileSync(new URL('../../data/metro.json', import.meta.url)));
  const base = { id:'test-only', stationId:'dongmen', name:'TEST_ONLY', kind:'post', verified:false, addedAt:'2026-10-27', sourcePosts:[{platform:'ig',url:ig,date:'2026-10-27'}] };
  buildPublicMetro({...raw,stores:[...raw.stores,base]});
  for (const url of [ig+'?igsh=x', 'https://x.com/a', ig.replace('savvysave_/', '')]) {
    assert.throws(() => buildPublicMetro({...raw,stores:[...raw.stores,{...base,sourcePosts:[{platform:'ig',url,date:'2026-10-27'}]}]}), /whitelist/);
  }
  assert.throws(() => buildPublicMetro({...raw,stores:[...raw.stores,{...base,backfill:'true'}]}), /backfill/);
});

test('all kinds reject legacy URLs, including previously shipped examples', () => {
  const source = { platform:'ig', url:'https://www.instagram.com/p/LEGACY/' };
  for (const kind of ['post','example']) assert.equal(isAllowedStoreSource({kind,id:'arena-1'}, source), false);
});

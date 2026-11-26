import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('social preview build preserves the approved Sakura artwork', () => {
  const artwork = readFileSync('public/assets/savvy-share-sakura.png');
  assert.deepEqual(artwork.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(artwork.readUInt32BE(16), 1732);
  assert.equal(artwork.readUInt32BE(20), 908);
  execFileSync(process.execPath, ['scripts/make-og.mjs']);
  assert.deepEqual(readFileSync('public/og.png'), artwork);
});


test('all shared image metadata matches the artwork dimensions', () => {
  const artwork = readFileSync('public/assets/savvy-share-sakura.png');
  const width = artwork.readUInt32BE(16);
  const height = artwork.readUInt32BE(20);
  for (const path of ['app/layout.tsx', 'app/InfoPage.tsx', 'app/zh-tw/guides/content.ts']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, new RegExp(`width: ${width}\\b`), path);
    assert.match(source, new RegExp(`height: ${height}\\b`), path);
    assert.ok(source.includes('/assets/savvy-share-sakura.png'), path);
  }
  const homepage = readFileSync('public/trips/index.html', 'utf8');
  assert.ok(homepage.includes(`property="og:image:width" content="${width}"`));
  assert.ok(homepage.includes(`property="og:image:height" content="${height}"`));
  assert.ok(homepage.includes('name="twitter:image" content="https://savvy.jeezlabs.io/assets/savvy-share-sakura.png"'));
});

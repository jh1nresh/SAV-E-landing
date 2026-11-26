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

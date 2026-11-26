import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const builder = resolve('scripts/build-editorial.mjs');
const posts = readdirSync('content/threads').map(name => JSON.parse(readFileSync(join('content/threads', name), 'utf8')));

test('every published post has a unique readable URL and preserves its source ID', () => {
  assert.equal(new Set(posts.map(post => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    assert.equal(post.url, `https://www.threads.com/@savvysave_/post/${post.code}`);
  }
  assert.equal(posts.find(post => post.code === 'DfwsAORFaeq').slug, 'taipei-hot-pot-top-10');
});

for (const [name, entries, succeeds] of [
  ['valid slugs', posts, true],
  ['missing slug', [{ ...posts[0], slug: undefined }], false],
  ['duplicate slugs', [posts[0], { ...posts[1], slug: posts[0].slug }], false],
  ['unsafe path', [{ ...posts[0], slug: '../other' }], false],
]) {
  test(`editorial build validates ${name}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'savvy-post-slugs-'));
    try {
      mkdirSync(join(dir, 'content/threads'), { recursive: true });
      mkdirSync(join(dir, 'lib'));
      for (const entry of entries) writeFileSync(join(dir, 'content/threads', entry.code + '.json'), JSON.stringify(entry));
      const result = spawnSync(process.execPath, [builder], { cwd: dir, encoding: 'utf8' });
      if (succeeds) {
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(readFileSync(join(dir, 'lib/editorial.public.json'))).threads.length, posts.length);
      } else {
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Missing, invalid or duplicate post slug/);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

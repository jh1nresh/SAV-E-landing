import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const expected = readFileSync('public/BingSiteAuth.xml');

test('Bing verification serves the supplied XML unchanged for GET and HEAD', async ({ request }) => {
  for (const accept of ['*/*', 'application/xml', 'text/xml', 'text/html', 'text/markdown']) {
    const response = await request.get('/BingSiteAuth.xml', { headers: { Accept: accept }, maxRedirects: 0 });
    expect(response.status(), accept).toBe(200);
    expect(response.headers()['content-type'], accept).toMatch(/xml/);
    expect(await response.body(), accept).toEqual(expected);
    const head = await request.head('/BingSiteAuth.xml', { headers: { Accept: accept }, maxRedirects: 0 });
    expect(head.status(), accept).toBe(200);
    expect(head.headers()['content-type'], accept).toMatch(/xml/);
    expect(await head.body(), accept).toHaveLength(0);
  }
  // The exemption is for this fixed-format file, not arbitrary missing XML pages.
  const missing = await request.get('/not-a-verification.xml', { headers: { Accept: 'text/markdown' } });
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('text/markdown');
});

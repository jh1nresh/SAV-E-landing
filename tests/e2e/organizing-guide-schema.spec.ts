import { expect, test } from '@playwright/test';
import guides from '../../data/guides.json';

test('every organizing guide publishes schema matching its visible content and working anchors', async ({ page }) => {
  for (const guide of guides) {
    const path = `/zh-tw/guides/${guide.slug}`;
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
    const graph = JSON.parse(await page.locator('main script[type="application/ld+json"]').textContent() || '{}')['@graph'];
    const article = graph.find((node: { '@type': string }) => node['@type'] === 'Article');
    await expect(page.locator('h1')).toHaveText(article.headline);
    await expect(page.locator('time')).toHaveAttribute('datetime', article.dateModified);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', article.url);
    const howto = graph.find((node: { '@type': string }) => node['@type'] === 'HowTo');
    for (const section of howto.step) for (const step of section.itemListElement) {
      await expect(page.locator(new URL(step.url).hash)).toHaveText(step.text);
    }
    const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    for (const question of faq?.mainEntity || []) {
      await expect(page.getByRole('heading', { name: question.name, exact: true })).toBeVisible();
      await expect(page.getByText(question.acceptedAnswer.text, { exact: true })).toBeVisible();
    }
    const markdown = await (await page.request.get(`${path}.md`)).text();
    expect(markdown).toContain(guide.description);
    for (const section of howto.step) for (const step of section.itemListElement) expect(markdown).toContain(step.text);
  }
});

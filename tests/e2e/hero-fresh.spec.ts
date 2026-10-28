import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import metro from '../../app/metro/metro.public.json';
import { waitForMap, openStation } from './helpers';

// Exercise the actual runtime with synthetic posts, without shipping a fixture endpoint/data.
const logic = readFileSync('lib/metro-logic.mjs', 'utf8');
const source = readFileSync('app/metro/map-runtime.ts', 'utf8').replace(/^import[\s\S]*?from "\.\.\/\.\.\/lib\/metro";\s*/, '');
const runtime = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;

for (const width of [390, 1280]) {
  for (const [clock, visible] of [['2026-10-30', true], ['2026-11-05', true], ['2026-11-06', false], ['2026-11-07', false]] as const) {
    test(`P-1 synthetic fresh/backfill/example markers at ${width}px on ${clock}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?reduce=1&clock=${clock}`);
      await waitForMap(page);
      const data = structuredClone(metro);
      const base = data.stores.find((s) => s.stationId === 'dongmen')!;
      const post = { ...base, kind: 'post', priceNT: undefined, pricePending: true, addedAt: '2026-10-30', sourcePosts: [{ platform: 'ig', url: 'https://www.instagram.com/savvysave_/p/TEST_ONLY/', date: '2026-10-27' }] };
      (data as any).stores = [
        { ...post, id:'test-fresh', name:'東門測試' },
        { ...post, id:'test-backfill', name:'補登測試', backfill:true },
        { ...post, id:'test-old', name:'舊文測試', sourcePosts:[{ platform:'threads', url:'https://www.threads.com/@savvysave_/post/TEST_ONLY', date:'2026-10-26' }] },
        { ...base, id:'test-example', addedAt:'2026-10-30' },
        // Keep real-data freshness out of this one-station synthetic boundary case.
        ...data.stores.filter((s) => s.stationId !== 'dongmen').map((s) => ({ ...s, backfill: true })),
      ];
      await page.addScriptTag({ type:'module', content: logic+'\n'+runtime+'\nwindow.__testBoot = bootMetroMap;' });
      await page.waitForFunction(() => Boolean((window as any).__testBoot));
      await page.evaluate((fixture) => {
        window.__savvyMap!.destroy();
        const original = document.querySelector('[data-testid=metro-map]')!;
        const root = original.cloneNode(true) as HTMLElement;
        original.replaceWith(root);
        window.__savvyMap = (window as any).__testBoot(root, fixture);
      }, data);
      await page.evaluate((clock) => window.__savvyMap!.setClock(clock), clock);
      await expect(page.locator('#stampA')).toHaveText(visible ? '本週新增 1 家' : '');
      const pin = page.getByTestId('metro-pin-dongmen');
      if (visible) await expect(pin).toHaveClass(/new/); else await expect(pin).not.toHaveClass(/new/);
      await expect(page.getByTestId('metro-tab-dongmen').locator('.newtag')).toHaveCount(visible ? 1 : 0);
      await openStation(page, 'dongmen');
      await expect(page.locator('#card .ph-head .newtag')).toHaveCount(visible ? 1 : 0);
      await expect(page.locator('#card .fc .newtag')).toHaveCount(visible ? 1 : 0);
      await expect(page.locator('#card .fc h4')).toHaveText('東門測試');
      for (const i of [1,2,3]) {
        await page.locator('#card .thumbs button').nth(i).click();
        await expect(page.locator('#card .fc .newtag')).toHaveCount(0);
      }
      await page.locator('#card .thumbs button').nth(0).click();
      await expect(page.locator('#card .fc h4')).toHaveText('東門測試');
      await expect(page.locator('#card .fc .newtag')).toHaveCount(visible ? 1 : 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const overflow = await page.locator('#card .fc h4, #card .ph-head .upd').evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth + 1));
      expect(overflow).toBeFalsy();
      await page.screenshot({ path:testInfo.outputPath(`fresh-${width}-${clock}.png`), fullPage:true });
      await page.evaluate(() => window.__savvyMap!.closeCard({focus:false}));
      await page.waitForFunction(() => window.__savvyMap!.state().showing === null && !window.__savvyMap!.state().closing);
    });
  }
}

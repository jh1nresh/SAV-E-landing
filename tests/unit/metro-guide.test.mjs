import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideHeading, guideDescription, guideUpdatedAt, GUIDE_PAGE_UPDATED_AT, shopPhoto, shopMapLink, guideStructuredData, safeJsonLd } from '../../lib/metro-guide.mjs';

const station = {
  city: 'taipei', station: '台北車站', slug: 'taipei-main', date: '2026-10-23',
  shops: [{ key: 'first', name: '小店 & 茶', dish: '牛肉麵', address: '台北市中正區忠孝西路1號' }, { key: 'second', name: '另一店', price: '2025 食記 NT$60' }],
  images: { photos: ['/photos/second.jpg', '/photos/first.jpg'], slides: [] }, posts: { instagram: 'https://www.instagram.com/p/public/', threads: null },
};

test('guide headings avoid duplicate station suffix and describe only available details', () => {
  assert.equal(guideHeading(station), '台北車站美食攻略');
  assert.match(guideDescription(station), /^台北車站周邊2家店/);
  assert.doesNotMatch(guideDescription(station), /出口走法|營業資訊/);
  assert.doesNotMatch(guideDescription({ ...station, shops: [] }), /收錄。|，。/);
  assert.equal(guideHeading({ ...station, station: '雙連' }), '雙連站美食攻略');
});

test('modification date is the later content/template date, independent of wall clock', () => {
  assert.equal(guideUpdatedAt(station), GUIDE_PAGE_UPDATED_AT);
  assert.equal(guideUpdatedAt({ ...station, date: '2027-01-01' }), '2027-01-01');
});

test('shop photos match stable identity rather than array position', () => {
  assert.equal(shopPhoto(station, station.shops[0]), '/photos/first.jpg');
  assert.equal(shopPhoto(station, { key: 'missing' }), undefined);
  assert.equal(shopPhoto(station, undefined), undefined);
});

test('map searches preserve branch address and special characters without invented coordinates', () => {
  const taipei = new URL(shopMapLink(station, station.shops[0]).href);
  assert.equal(taipei.origin + taipei.pathname, 'https://maps.apple.com/search');
  assert.equal(taipei.searchParams.get('query'), '台北 小店 & 茶 台北市中正區忠孝西路1號');
  const shanghai = new URL(shopMapLink({ ...station, city: 'shanghai', station: '靜安寺' }, { name: '小店 & 茶' }).href);
  assert.equal(shanghai.origin + shanghai.pathname, 'https://uri.amap.com/search');
  assert.equal(shanghai.searchParams.get('keyword'), '上海 小店 & 茶 靜安寺站');
  assert.equal(shanghai.searchParams.get('city'), '上海');
  assert.equal(shanghai.searchParams.get('callnative'), '0');
  assert.equal(shanghai.searchParams.has('center'), false);
  assert.equal(shanghai.searchParams.has('location'), false);
});

test('structured data describes published article and actual shops without unsupported ratings or offers', () => {
  const data = guideStructuredData(station, 'https://savvy.jeezlabs.io');
  const [article, breadcrumbs, list] = data['@graph'];
  assert.equal(article.datePublished, '2026-10-23');
  assert.equal(article.dateModified, GUIDE_PAGE_UPDATED_AT);
  assert.deepEqual(article.citation, ['https://www.instagram.com/p/public/']);
  assert.equal(breadcrumbs.itemListElement.at(-1).item, article.url);
  assert.deepEqual(list.itemListElement.map(item => [item.position, item.name, item.url.split('#')[1]]), [[1, '小店 & 茶', 'shop-first'], [2, '另一店', 'shop-second']]);
  assert.doesNotMatch(JSON.stringify(data), /aggregateRating|reviewRating|priceRange|offers|geo/);
});

test('JSON-LD cannot close its script element even with malicious text', () => {
  const input = { headline: '</script><script>alert(1)</script>' };
  const serialized = safeJsonLd(input);
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), input);
});

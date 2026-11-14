// Updated when the guide itself changes, not on every build or crawl.
export const GUIDE_PAGE_UPDATED_AT = '2026-11-14';

export const guideCityName = station => station.city === 'shanghai' ? '上海' : '台北';
export const guideStationName = station => station.station.endsWith('站') ? station.station : `${station.station}站`;
const guideLocationName = station => guideStationName(station).startsWith(guideCityName(station)) ? guideStationName(station) : `${guideCityName(station)}${guideStationName(station)}`;
export const guideHeading = station => `${guideLocationName(station)}美食攻略`;
export const guideTitle = station => `${guideHeading(station)}：${station.shops.length}家店的餐點與交通｜Savvy`;
export const guideUpdatedAt = station => station.date > GUIDE_PAGE_UPDATED_AT ? station.date : GUIDE_PAGE_UPDATED_AT;
export const shopAnchor = (shop, index) => `shop-${shop.key || index + 1}`;

export function guideDescription(station) {
  const dishes = station.shops.map(shop => shop.dish?.trim()).filter(Boolean).slice(0, 3).join('、');
  const details = ['推薦餐點', '店家位置'];
  if (station.shops.some(shop => shop.price?.trim())) details.push('參考價格');
  if (station.shops.some(shop => shop.exit_walk?.trim())) details.push('出口走法');
  if (station.shops.some(shop => shop.hours?.trim())) details.push('營業資訊');
  return `${guideLocationName(station)}周邊${station.shops.length}家店${dishes ? `，收錄${dishes}` : ''}。整理${details.join('、')}與資料來源，選好店家後可開啟地圖查位置。`;
}

export function shopPhoto(station, shop) {
  if (!shop?.key) return undefined;
  return station.images.photos.find(path => path.split('/').at(-1)?.replace(/\.[^.]+$/, '') === shop.key);
}

export function shopMapLink(station, shop) {
  const query = [guideCityName(station), shop.name, shop.address || guideStationName(station)].filter(Boolean).join(' ');
  if (station.city === 'shanghai') {
    const params = new URLSearchParams({ keyword: query, city: '上海', view: 'map', src: 'savvy', callnative: '0' });
    return { href: `https://uri.amap.com/search?${params}`, label: '高德地圖搜尋' };
  }
  return { href: `https://maps.apple.com/search?${new URLSearchParams({ query })}`, label: 'Apple 地圖搜尋' };
}

export function guideStructuredData(station, origin) {
  const url = `${origin}/metro/${station.slug}`;
  const images = station.images.photos.map(path => `${origin}${path}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, headline: guideHeading(station),
        description: guideDescription(station), url, mainEntityOfPage: url,
        datePublished: station.date, dateModified: guideUpdatedAt(station), inLanguage: 'zh-Hant',
        author: { '@type': 'Organization', name: 'Savvy', url: origin },
        publisher: { '@type': 'Organization', name: 'Savvy', url: origin },
        ...(images.length ? { image: images } : {}),
        citation: Object.values(station.posts).filter(value => typeof value === 'string' && /^https?:\/\//.test(value)),
        mainEntity: { '@id': `${url}#shops` },
      },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Savvy', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: '捷運美食攻略', item: `${origin}/metro` },
          { '@type': 'ListItem', position: 3, name: guideHeading(station), item: url },
        ],
      },
      {
        '@type': 'ItemList', '@id': `${url}#shops`, name: `${guideStationName(station)}收錄店家`,
        numberOfItems: station.shops.length,
        itemListElement: station.shops.map((shop, index) => ({
          '@type': 'ListItem', position: index + 1, name: shop.name || '店家',
          url: `${url}#${shopAnchor(shop, index)}`,
        })),
      },
    ],
  };
}

export const safeJsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');

/** One article supplies both its food page and every hero card. No network or filesystem access. */
export function articleMapStores(stations) {
  return stations.flatMap(station => {
    const seen = new Set();
    return (station.shops ?? []).map(shop => {
      const context = `metro article: ${station.slug} shop ${shop.name ?? "(unnamed)"}`;
      if (!shop.name?.trim() || !/^[a-zA-Z0-9_-]+$/.test(shop.key ?? "")) {
        throw new Error(`${context} requires a name and photo key`);
      }
      if (seen.has(shop.key)) throw new Error(`${context} duplicate photo key ${shop.key}`);
      seen.add(shop.key);
      // Photos are often alphabetically sorted, unlike shops. Never pair by array index.
      const photos = (station.images?.photos ?? []).filter(path =>
        path.split('/').at(-1)?.replace(/\.[^.]+$/, '') === shop.key);
      if (photos.length !== 1) throw new Error(`${context} needs exactly one photo matching ${shop.key}`);
      const sourcePosts = Object.entries(station.posts ?? {}).flatMap(([platform, url]) => {
        const code = { instagram: 'ig', threads: 'threads', xiaohongshu: 'xhs' }[platform];
        return code && url ? [{ platform: code, url, date: station.date }] : [];
      });
      return {
        id: `article-${station.slug}-${shop.key}`,
        stationId: station.map_id ?? station.slug,
        kind: 'post',
        name: shop.name,
        dish: shop.dish ?? undefined,
        image: photos[0],
        sourcePosts,
        addedAt: station.date,
        verified: false,
        priceFrom: false,
        priceCheckedAt: null,
        exit: null,
        article: shop,
      };
    });
  });
}

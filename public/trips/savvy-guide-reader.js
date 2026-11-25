(() => {
  const articles = new Map([
    ['shanghai', {
      title: '上海本幫菜，這 7 家怎麼選？',
      city: '上海',
      source: '/zh-tw/travel/shanghai-benbang',
      intro: '想吃濃油赤醬的紅燒肉，還是來一盤白斬雞？從招牌菜挑起，把想試的店留給下一趟上海。',
      image: '/trips/assets/shanghai.webp',
      stops: places.map(place => ({
        id: place.id, name: place.name, detail: place.address, note: place.dish,
        image: '/trips/assets/thumb-' + place.photo + '.webp',
        card: '/trips/assets/' + place.photo + '.webp'
      }))
    }],
    ['walks', {
      title: '上海慢慢走',
      city: '上海',
      source: '/zh-tw/travel/shanghai-wukang-walk',
      intro: '走一小段梧桐、紅磚屋與老街。第一次可以從武康大樓出發，接著逛到安福路。',
      image: '/trips/news-assets/wukang-road.webp',
      stops: cityWalks.filter(place => place.city === 'shanghai').map((place, index) => ({
        id: 'walk-' + (index + 1),
        placeId: ['wukang', 'anfu'][index],
        name: place.name, detail: place.detail, note: place.description,
        map: 'https://maps.apple.com/?q=' + encodeURIComponent(place.mapPlace)
      }))
    }]
  ]);
  const metroOrigin = location.origin;
  for (const place of stationFood) {
    const url = new URL(place.href, location.origin);
    if (url.origin !== metroOrigin || !/^\/metro\/[a-z0-9-]+\/?$/.test(url.pathname)) continue;
    const key = url.pathname.split('/')[2];
    if (!articles.has('metro-' + key)) articles.set('metro-' + key, {
      title: place.area + '站美食攻略', city: place.city === 'shanghai' ? '上海' : '台北',
      source: url.origin + url.pathname, stops: []
    });
    articles.get('metro-' + key).stops.push({
      id: url.hash.slice(1), name: place.name, detail: place.address, note: place.dish
    });
  }
  const guideKeys = {
    'shanghai-benbang': 'shanghai',
    'shanghai-wukang-walk': 'walks'
  };
  const officialSources = new Map();
  function locate(raw) {
    let url;
    try { url = new URL(raw, document.baseURI); } catch { return null; }
    if (url.origin === location.origin) {
      const path = url.pathname.split('/').pop().replace(/\.html$/, '');
      if (Object.hasOwn(guideKeys, path)) {
        return { key: guideKeys[path], stop: guideKeys[path] === 'shanghai' ? url.searchParams.get('place') : url.hash.slice(1) };
      }
    }
    const official = officialSources.get(url.href);
    if (official) return { key: official };
    if (url.origin !== metroOrigin || !/^\/metro\/[a-z0-9-]+\/?$/.test(url.pathname)) return null;
    const key = 'metro-' + url.pathname.split('/')[2];
    return articles.has(key) ? { key, stop: url.hash.slice(1) } : null;
  }
  window.savvyGuides = {
    get: key => articles.get(key),
    addOfficial(place) {
      const key = 'official-' + place.id;
      articles.set(key, {
        title: place.article, city: place.city, image: place.image, source: place.url,
        stops: [{ id: place.id, name: place.name, detail: place.address, note: place.note }]
      });
      officialSources.set(place.url, key);
    },
    link(raw, from, group = false) {
      const guide = locate(raw);
      if (!guide) return raw;
      if (from.startsWith('place/')) {
        const prior = new URLSearchParams(from.split('?')[1] || '').get('from');
        if (prior?.split('?')[0] === 'guide/' + guide.key) return '#' + prior;
      }
      const query = new URLSearchParams({ from });
      if (!group && guide.stop) query.set('stop', guide.stop);
      return '#guide/' + guide.key + '?' + query;
    }
  };

  window.renderSavvyGuide = function renderSavvyGuide(root, guide, {escape, byId, backLink, stop}) {
    const media = guide.image
      ? '<img class="guide-cover" src="' + escape(guide.image) + '" alt="">'
      : '';
    const index = guide.stops.map((place, i) => {
      const id = place.placeId || place.id;
      const selected = place.id === stop;
      const photo = place.image ? '<img class="guide-thumb" src="' + escape(place.image) + '" alt="" loading="lazy">' : '';
      const card = place.card
        ? '<details class="guide-card-art"><summary>原版圖卡</summary><img src="' + escape(place.card) + '" alt="' + escape(place.name) + '" loading="lazy"></details>'
        : '';
      const detailLink = byId.has(id)
        ? '<a class="ws-source" href="#place/' + encodeURIComponent(id) + '?from=' + encodeURIComponent(location.hash.slice(1)) + '">看地點</a>'
        : '';
      const map = place.map ? '<a class="ws-source" href="' + escape(place.map) + '" target="_blank" rel="noopener">看起點地圖 ↗</a>' : '';
      return '<li class="guide-stop" ' + (selected ? 'aria-current="true"' : '') + '>' +
        '<div class="guide-stop-heading">' + photo +
        '<div><p class="ws-meta">' + String(i + 1).padStart(2, '0') + '</p>' +
        '<h3 class="guide-original">' + escape(place.name) + '</h3>' +
        '<p class="guide-original">' + escape(place.note) + '</p><p class="guide-original">' + escape(place.detail) + '</p></div></div>' +
        ((detailLink || map) ? '<div class="guide-actions">' + detailLink + map + '</div>' : '') + card + '</li>';
    }).join('');
    root.innerHTML = '<article class="ws-guide">' + backLink +
      '<header class="guide-header"><div><p class="ws-meta">' + escape(guide.city) + '</p><h1 class="guide-original">' + escape(guide.title) + '</h1>' +
      (guide.intro ? '<p class="guide-original">' + escape(guide.intro) + '</p>' : '') +
      (guide.source ? '<div class="guide-actions"><a class="ws-source" href="' + escape(guide.source) + '" target="_blank" rel="noopener">完整原文 ↗</a></div>' : '') +
      '</div>' + media + '</header><section class="guide-index"><h2>地點清單</h2><ol>' + index + '</ol></section></article>';
    document.title = guide.title + ' · Savvy';
  };
})();

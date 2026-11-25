(() => {
  const root = document.querySelector('#workspace');
  const storageKey = 'savvy.workspace.trips.v1';
  const media = '/trips/news-assets/';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const restaurants = places.map(p => ({
    id:p.id, name:p.name, city:'上海', note:p.dish, address:p.address, image:'/trips/assets/thumb-'+p.photo+'.webp',
    article:'第一次吃上海本幫菜，這 7 家怎麼選？', url:'/zh-tw/travel/shanghai-benbang?place='+p.id
  }));
  const walks = cityWalks.slice(0,2).map((p,i) => ({
    id:['wukang','anfu'][i], name:p.name, city:'上海', note:p.description, address:p.detail,
    image:media+['wukang-mansion.webp','wukang-wide.webp'][i], article:'上海慢慢走：街道散步指南', url:'/zh-tw/travel/shanghai-wukang-walk#walk-'+(i+1)
  }));
  const areas = {'龍山寺':'longshan-temple','台北車站':'taipei-main-station','國父紀念館':'sun-yat-sen-memorial-hall'};
  const taipei = stationFood.filter(p => p.city==='taipei' && areas[p.area]).map(p => ({
    id:p.href.split('#').pop(), name:p.name, city:'台北', note:p.dish, address:p.address, image:media+areas[p.area]+'.webp',
    article:p.area+'站美食攻略', url:p.href
  }));
  const library = [...walks,...restaurants,...taipei,
    {id:'tokyo-tower',name:'東京鐵塔',city:'東京',note:'展望台與參觀資訊',address:'日本東京・港區',image:media+'discovery-live-tokyo.webp',article:'東京鐵塔官方參觀指南',url:'https://www.tokyotower.co.jp/en/'},
    {id:'liberty-island',name:'自由女神像',city:'紐約',note:'自由島的渡輪與入島資訊',address:'美國紐約・自由島',image:media+'discovery-live-new-york.webp',article:'美國國家公園署參觀指南',url:'https://www.nps.gov/stli/planyourvisit/index.htm'}
  ];
  const byId = new Map(library.map(p=>[p.id,p]));
  for (const id of ['tokyo-tower', 'liberty-island']) window.savvyGuides.addOfficial(byId.get(id));
  const seeds = [
    {id:'shanghai-walk',title:'上海弄堂散步',city:'上海',image:media+'wukang-wide.webp',days:[['wukang','anfu'],['lan-xin','chun']]},
    {id:'taipei-food',title:'台北小吃一日走',city:'台北',image:media+'discovery-live-taipei.webp',days:[['shop-xiaowang','shop-yuanfang','shop-zhouji']]}
  ];
  const tabs = {trips:'我的行程',atlas:'城市圖鑑',collection:'收藏',journey:'遊記',app:'App'};
  function trips(){
    try {
      const saved=JSON.parse(localStorage.getItem(storageKey));
      if(Array.isArray(saved) && saved.length && saved.every(t=>t && typeof t.id==='string' && typeof t.title==='string' && Array.isArray(t.days) && t.days.every(Array.isArray))) return saved;
    } catch {}
    return structuredClone(seeds);
  }
  function save(list){try{ localStorage.setItem(storageKey,JSON.stringify(list));return true; }catch{alert('瀏覽器無法儲存這次修改。');return false;}}
  function current(){return location.hash.slice(1).split('?')[0] || 'trips';}
  function linkPlace(id){return '#place/'+encodeURIComponent(id)+'?from='+encodeURIComponent(location.hash.slice(1) || current());}
  function linkGuide(url, group = false) {
    return window.savvyGuides.link(url, location.hash.slice(1) || current(), group);
  }
  function returnRoute(from, list) {
    const path = from?.split('?')[0] || '';
    if (!/^[a-zA-Z0-9/_-]+$/.test(path)) return 'collection';
    const [section, id, extra] = path.split('/');
    if (extra) return 'collection';
    if (Object.hasOwn(tabs, section) && (!id || section === 'collection' || section === 'journey')) return from;
    if (section === 'trip' && list.some(trip => trip.id === id)) return from;
    if (section === 'place' && byId.has(id)) return from;
    if (section === 'guide' && window.savvyGuides.get(id)) return from;
    return 'collection';
  }
  function summary(t){return t.days.length+' 天 · '+t.days.flat().length+' 個地點';}
  const landmarks = [
    ['上海', 'Shanghai', '東方明珠塔', media + 'discovery-motion-shanghai.webp', '40% 8%'],
    ['台北', 'Taipei', '台北 101', media + 'discovery-live-taipei.webp', '49% 0%'],
    ['北京', 'Beijing', '雍和宮・萬福閣', media + 'discovery-yonghe-clear.webp', '50% 20%'],
    ['東京', 'Tokyo', '東京鐵塔', media + 'discovery-live-tokyo.webp', '38% 10%'],
    ['京都', 'Kyoto', '清水寺', '/trips/city-bar-assets/kyoto-scene.webp', '50% 50%'],
    ['重慶', 'Chongqing', '東水門大橋', media + 'discovery-live-chongqing.webp', '50% 45%'],
    ['首爾', 'Seoul', 'N 首爾塔', '/trips/city-bar-assets/seoul-scene.webp', '50% 50%'],
    ['洛杉磯', 'Los Angeles', '好萊塢標誌', media + 'discovery-hollywood-clear.webp', '50% 36%'],
    ['紐約', 'New York', '自由女神像', media + 'discovery-live-new-york.webp', '48% 12%']
  ];
  function landmarkFor(city) {
    const name = String(city || '').trim().replaceAll('臺', '台').replace(/市$/, '').toLowerCase();
    return landmarks.find(([local, english]) => name === local || name === english.toLowerCase());
  }
  function cover(item) {
    const landmark = landmarkFor(item.city);
    if (!landmark) return '';
    const [, , label, src, focus] = landmark;
    const fit = src.startsWith('/trips/city-bar-assets/') ? ' trip-drawing' : '';
    return '<img class="trip-photo' + fit + '" src="' + src + '" alt="' + label + '" style="object-position:' + focus + '">';
  }
  function back(url,label){return '<a class="ws-back" href="#'+escape(url)+'">← '+escape(label)+'</a>';}
  function story(p){
    return '<a class="ws-story" href="'+escape(linkPlace(p.id))+'"><img alt="" src="'+escape(p.image)+'"><span><small>'+escape(p.city)+'</small><strong>'+escape(p.name)+'</strong><i>'+escape(p.note)+'</i></span></a>';
  }
  const slideDelay = 3000;
  let clockTimer;
  let disposeFeature;
  function home(list) {
    clearTimeout(clockTimer);
    const tripsByCity = new Map();
    for (const trip of list) {
      const city = landmarkFor(trip.city)?.[0] || String(trip.city ?? '').trim().toLowerCase();
      if (!tripsByCity.has(city)) tripsByCity.set(city, trip);
    }
    const slides = [...tripsByCity.values()];
    let featured = slides[0];
    const remaining = () => list.filter(t => t.id !== featured.id);
    const stops = t => t.days.flat().map(id => byId.get(id)).filter(Boolean);
    const allStops = list.flatMap(stops);
    const cityNames = new Set([...allStops.map(p => p.city), ...list.map(t => t.city)].filter(Boolean));
    const formatCount = n => n.toLocaleString('zh-Hant');
    const tripUrl = t => '#trip/' + encodeURIComponent(t.id);
    const info = (label, value) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>';
    function coverContent(trip) {
      const firstStops = stops(trip);
      const guideCount = new Set(firstStops.map(p => p.article)).size;
      const ticket = '<dl class="trip-ticket">' +
        info('目的地', escape(trip.city)) + info('天數', formatCount(trip.days.length) + ' <small>天</small>') +
        info('相關攻略', formatCount(guideCount) + ' <small>篇</small>') +
        info('行程地點', formatCount(firstStops.length) + ' <small>站</small>') + '</dl>';
      const landmark = landmarkFor(trip.city);
      const poster = landmark?.[3];
      const clip = poster?.startsWith(media) ? poster.replace(/\.webp$/, '.mp4') : '';
      const artwork = clip
        ? '<video class="trip-photo" aria-hidden="true" muted loop playsinline preload="none" poster="' +
          poster + '" data-clip="' + clip + '" style="object-position:' + landmark[4] + '"></video>'
        : cover(trip);
      const position = slides.indexOf(trip) + 1;
      return '<div class="trip-cover-track"><div class="trip-window" role="group" aria-roledescription="投影片" aria-label="第 ' + position +
        ' 張，共 ' + slides.length + ' 張">' + artwork +
        '<span class="trip-tag">' + escape(trip.city) + (landmark ? ' · ' + landmark[2] : '') + '</span>' +
        '<h2>' + escape(trip.title) + '</h2></div></div>' + ticket;
    }
    const hero = '<section class="trip-feature" aria-label="行程封面" aria-roledescription="輪播">' +
      '<a class="trip-spot" href="' + tripUrl(featured) + '">' + coverContent(featured) + '</a></section>';
    const stats = (label, count, unit, cities = '') => '<div class="trip-stat"><dt>' + label + '</dt><dd>' + formatCount(count) +
      '<small>' + unit + '</small>' + (cities ? '<span>' + escape(cities) + '</span>' : '') + '</dd></div>';
    const totals = '<dl class="trip-stats" aria-label="行程總覽">' + stats('目的地城市', cityNames.size, '座', [...cityNames].slice(0,3).join(' · ')) +
      stats('全部行程', list.length, '趟') + stats('行程天數', list.reduce((n,t) => n + t.days.length, 0), '天') +
      stats('收錄地點', new Set(allStops.map(p => p.id)).size, '處') + '</dl>';
    const tripCard = t => '<a class="trip-mini" href="' + tripUrl(t) + '">' + cover(t) +
      '<span class="trip-tag">' + escape(t.city) + '</span><div><strong>' + escape(t.title) + '</strong><small>' + summary(t) + '</small></div></a>';
    const languages = ['TWD', 'CNY', 'USD', 'JPY'];
    const fxOptions = selected => languages.map(c => '<option' + (c === selected ? ' selected' : '') + '>' + c + '</option>').join('');
    const currency = '<section class="trip-widget"><h2>旅行換匯</h2><div class="trip-fx">' +
      '<div><label for="trip-amount">換算金額</label><input id="trip-amount" type="number" min="0" step="any" value="100"><select aria-label="來源幣別">' + fxOptions('TWD') + '</select></div>' +
      '<button type="button" class="trip-swap" aria-label="交換幣別">⇄</button>' +
      '<div><span>換算結果</span><output for="trip-amount"></output><select aria-label="目標幣別">' + fxOptions('CNY') + '</select></div></div>' +
      '<a class="trip-credit" href="https://www.exchangerate-api.com/">參考匯率 · 2026/11/24 ↗</a></section>';
    const picks = [['lan-xin','上海本幫菜','/zh-tw/travel/shanghai-benbang'], ['wukang','上海街道散步','/zh-tw/travel/shanghai-wukang-walk'], ['shop-xiaowang','龍山寺站美食',null]];
    const collections = '<section class="trip-widget"><h2><a href="#collection">攻略收藏 <span>→</span></a></h2><div class="trip-picks">' +
      picks.map(([id,label,url]) => {
        const p = byId.get(id);
        const count = library.filter(x => x.article === p.article).length;
        return '<a href="' + escape(linkGuide(url || p.url, true)) + '"><strong>' + label + '</strong><small>' + count + ' 處</small></a>';
      }).join('') + '</div></section>';
    const zones = [['上海','Asia/Shanghai','UTC+8'],['東京','Asia/Tokyo','UTC+9'],['紐約','America/New_York','美東時間']];
    const clocks = '<section class="trip-widget"><h2>城市時間</h2>' + zones.map(([name, zone, note]) => '<div class="trip-clock"><span>' +
      name + '<small>' + note + '</small></span><time data-zone="' + zone + '"></time></div>').join('') + '</section>';
    function scheduleFor(trip) {
      const dayStops = trip.days.flatMap((day, index) => {
        const first = day.map(id => byId.get(id)).find(Boolean);
        return first ? [{first, index}] : [];
      }).slice(0, 3);
      return dayStops.length ? '<section class="trip-widget"><h2>每日第一站</h2>' +
        dayStops.map(({first, index}) => '<a class="trip-stop" href="#place/' + encodeURIComponent(first.id) +
          '?from=' + encodeURIComponent('trip/' + trip.id) + '"><small>第 ' + (index + 1) +
          ' 天</small><span>' + escape(first.name) + '</span><i aria-hidden="true">↗</i></a>').join('') + '</section>' : '';
    }
    const searchField = customElements.get('sakuga-input')
      ? '<sakuga-input class="trip-search" type="search" label="搜尋行程或地點" placeholder="搜尋行程或地點"></sakuga-input>'
      : '<input class="trip-search" type="search" aria-label="搜尋行程或地點" placeholder="搜尋行程或地點">';
    root.innerHTML = '<div class="trip-dashboard"><div class="trip-primary">' + hero + totals +
      '<section class="trip-others"><header><h1>我的行程</h1><div class="trip-tools">' + searchField +
      '<button type="button" data-view aria-pressed="false">列表</button></div></header>' +
      '<div class="trip-grid">' + remaining().map(tripCard).join('') + '<a class="trip-create" href="#new-trip"><b>＋</b>新增行程</a></div></section></div>' +
      '<aside class="trip-rail" aria-label="旅行工具">' + currency + collections + clocks + '<div class="trip-schedule">' + scheduleFor(featured) + '</div></aside></div>';
    const search = root.querySelector('.trip-search');
    const grid = root.querySelector('.trip-grid');
    const create = grid.querySelector('.trip-create');
    const view = root.querySelector('[data-view]');
    function setView(rows) {
      grid.classList.toggle('trip-rows', rows);
      view.setAttribute('aria-pressed', String(rows));
    }
    try { setView(localStorage.getItem('savvy.workspace.trip-list-view') === 'rows'); } catch {}
    view.onclick = () => {
      const rows = !grid.classList.contains('trip-rows');
      setView(rows);
      try { localStorage.setItem('savvy.workspace.trip-list-view', rows ? 'rows':'grid'); } catch {}
    };
    const dashboard = root.querySelector('.trip-dashboard');
    const feature = root.querySelector('.trip-feature');
    const featureLink = feature.querySelector('.trip-spot');
    const schedule = root.querySelector('.trip-schedule');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    const { signal } = listeners;
    let visible = false;
    let hovered = false;
    let timer;

    function drawTrips() {
      const query = search.value.trim().toLocaleLowerCase();
      const results = query ? list.filter(t => [t.title, t.city, window.savvySearchText?.(t.city), ...stops(t).map(p => p.name)].some(s => s?.toLocaleLowerCase().includes(query))) : remaining();
      feature.hidden = Boolean(query);
      root.querySelector('.trip-stats').hidden = Boolean(query);
      grid.innerHTML = results.map(tripCard).join('') || (query ? '<p role="status">沒有符合的行程。</p>' : '');
      grid.append(create);
    }

    function syncMotion() {
      clearTimeout(timer);
      if (signal.aborted) return;
      const film = featureLink.querySelector('.trip-window:first-child video');
      const active = !reduced.matches && visible && !document.hidden && !feature.hidden &&
        !hovered && !dashboard.contains(document.activeElement);
      if (active && film) {
        if (!film.hasAttribute('src')) film.src = film.dataset.clip;
        if (film.paused) film.play().catch(() => {});
      } else if (film) {
        film.pause();
      }
      if (active && slides.length > 1) {
        timer = setTimeout(advance, slideDelay);
      }
    }

    function advance() {
      const outgoing = featureLink.querySelector('.trip-window');
      outgoing.querySelector('video')?.pause();
      featured = slides[(slides.indexOf(featured) + 1) % slides.length];
      featureLink.href = tripUrl(featured);
      featureLink.innerHTML = coverContent(featured);
      if (!reduced.matches && typeof outgoing.animate === 'function') {
        const track = featureLink.querySelector('.trip-cover-track');
        const incoming = track.firstElementChild;
        outgoing.classList.add('trip-slide-out');
        outgoing.setAttribute('aria-hidden', 'true');
        track.append(outgoing);
        const timing = { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };
        incoming.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], timing);
        const exit = outgoing.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
          { ...timing, fill: 'forwards' },
        );
        exit.finished.then(() => outgoing.remove(), () => outgoing.remove());
        const fx = window.SakugaFX;
        if (fx) {
          const { x, y } = fx.at(track, .87, .32);
          fx.lines(x, y, { n: 5, dir: Math.PI, len: 42, spread: 34, life: .28 });
          fx.ticks(x + 18, y - 12, { n: 3, len: 7, life: .3 });
        }
      }
      schedule.innerHTML = scheduleFor(featured);
      drawTrips();
      syncMotion();
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      syncMotion();
    }, { threshold: 0.25 });
    observer.observe(feature);
    disposeFeature = () => {
      clearTimeout(timer);
      observer.disconnect();
      listeners.abort();
      feature.querySelector('video')?.pause();
    };
    featureLink.onpointerenter = event => { if (event.pointerType === 'mouse') { hovered = true; syncMotion(); } };
    featureLink.onpointerleave = () => { hovered = false; syncMotion(); };
    dashboard.onfocusin = syncMotion;
    dashboard.onfocusout = () => queueMicrotask(syncMotion);
    document.addEventListener('visibilitychange', syncMotion, { signal });
    reduced.addEventListener('change', syncMotion, { signal });
    const updateSearch = event => {
      if (event.isComposing) return;
      drawTrips();
      syncMotion();
    };
    search.addEventListener('input', updateSearch);
    search.addEventListener('compositionend', updateSearch);
    syncMotion();
    const fx = root.querySelector('.trip-fx');
    const [from, to] = fx.querySelectorAll('select');
    const amount = fx.querySelector('input');
    // ExchangeRate-API TWD snapshot, 2026-11-24 UTC. Keep the displayed date with the rates.
    const rates = {TWD:1, CNY:0.2026, USD:0.030437, JPY:4.829894};
    function convert() {
      const value = amount.valueAsNumber * rates[to.value] / rates[from.value];
      fx.querySelector('output').value = Number.isFinite(value) && value >= 0 ? value.toLocaleString('zh-Hant',{maximumFractionDigits:2}) : '—';
    }
    fx.addEventListener('input', convert);
    fx.querySelector('button').onclick = () => { [from.value, to.value] = [to.value, from.value]; convert(); };
    convert();
    const clocksOnPage = [...root.querySelectorAll('time[data-zone]')].map(node => [node,
      new Intl.DateTimeFormat('en-GB', {timeZone:node.dataset.zone,hour:'2-digit',minute:'2-digit'})]);
    function refreshClocks() {
      const now = new Date();
      clocksOnPage.forEach(([node, formatter]) => { node.dateTime = now.toISOString(); node.textContent = formatter.format(now); });
      clockTimer = setTimeout(refreshClocks, 60000 - now.getTime() % 60000);
    }
    refreshClocks();
  }
  function newTrip(){
    function tripField(name, label, maxlength, placeholder) {
      const attributes = `id="trip-${name}" name="${name}" required maxlength="${maxlength}" placeholder="${placeholder}"`;
      const input = customElements.get('sakuga-input')
        ? `<sakuga-input class="trip-form-input" ${attributes} label="${label}"></sakuga-input>`
        : `<input ${attributes}>`;
      return `<label for="trip-${name}">${label}${input}</label>`;
    }
    root.innerHTML = `<section class="ws-form">${back('trips', tabs.trips)}
      <div class="ws-heading"><h1>新增行程</h1></div>
      <form>
        ${tripField('title', '行程名稱', 70, '例如：春天的東京與台北')}
        ${tripField('city', '目的地', 60, '城市或國家')}
        <button class="ws-btn" type="submit">建立行程</button>
      </form>
    </section>`;
    root.querySelector('form').onsubmit=e=>{
      e.preventDefault();
      const f=e.currentTarget, title=f.elements.title.value.trim(),city=f.elements.city.value.trim();
      if(!title||!city){(title?f.elements.city:f.elements.title).focus();return;}
      const t={id:crypto.randomUUID(),title,city,image:landmarkFor(city)?.[3] || null,days:[[]]};
      if (!save([t, ...trips()])) return;
      const english = document.documentElement.lang === 'en';
      const toast = document.querySelector('.workspace-toast');
      toast?.shadowRoot?.querySelector('[part="close"]')?.setAttribute('aria-label', english ? 'Dismiss' : '關閉提示');
      toast?.show?.(english ? 'Trip saved' : '行程已儲存');
      location.hash = 'trip/' + t.id;
    };
  }
  function itinerary(t) {
    function update(change) {
      const list = trips();
      const latest = list.find(item => item.id === t.id);
      if (!latest) return render();
      change(latest);
      if (!save(list)) return;
      itinerary(latest);
      const editor = root.querySelector('.reader-editor');
      editor.open = true;
      editor.querySelector('summary').focus({preventScroll:true});
    }
    window.renderSavvyTripReader(root, t, {escape, byId, library, summary, update, linkPlace, linkGuide});
    document.title = t.title + ' · Savvy';
  }
  function placeDetail(p,list){
    const from=new URLSearchParams(location.hash.split('?')[1]||'').get('from');
    const target = returnRoute(from, list);
    const [section, id] = target.split('?')[0].split('/');
    const label = section === 'trip' ? list.find(t => t.id === id).title
      : section === 'guide' ? '閱讀攻略' : tabs[section] || '回到攻略收藏';
    const sources = [{title:p.article,url:p.url}, ...(window.savvyLinksForPlace?.(p.id) || [])];
    const articles = sources.map(source => '<a class="ws-source guide-original" href="'+escape(linkGuide(source.url))+'">'+escape(source.title)+' ↗</a>').join('');
    root.innerHTML='<article class="ws-place">'+back(target,label)+'<img src="'+escape(p.image)+'" alt=""><p class="ws-meta">'+escape(p.city)+' · '+escape(p.address)+'</p><h1>'+escape(p.name)+'</h1><p class="guide-original">'+escape(p.note)+'</p><section class="ws-related"><h2>相關攻略</h2><div class="guide-actions">'+articles+'</div></section></article>';
  }
  function guideDetail(guide, list, query) {
    const target = returnRoute(query.get('from'), list);
    const [section, id] = target.split('?')[0].split('/');
    const label = section === 'trip' ? list.find(trip => trip.id === id).title
      : section === 'place' ? byId.get(id).name : section === 'collection' ? '回到攻略收藏' : tabs[section] || '回到攻略收藏';
    window.renderSavvyGuide(root, guide, {escape, byId, backLink:back(target, label), stop:query.get('stop')});
  }
  function aboutApp() {
    root.innerHTML = `<article class="app-intro">
      <div class="app-intro-copy">
        <div class="app-intro-brand"><img src="/trips/assets/savvy-sakura-violet.png" width="40" height="40" alt="">Savvy App</div>
        <h1>把想去的地方，排進下一趟行程。</h1>
        <p>滑到一家想吃的店？把貼文連結分享給 Savvy，確認是哪一家，再存到自己的地圖。出門前，把想去的幾站排成行程。</p>
        <span class="waitlist-trigger">
          <button class="ws-btn app-intro-join" type="button" data-open-waitlist aria-haspopup="dialog" aria-describedby="app-waitlist-hint">加入測試名單</button>
          <sakuga-tooltip class="waitlist-tooltip" id="app-waitlist-hint" external text="開放試用時，我們會寄信給你，附上加入方式。"></sakuga-tooltip>
        </span>
      </div>
      <figure class="app-intro-preview">
        <img src="/trips/assets/savvy-app.webp" width="892" height="848" alt="左側是已收藏的地點和地圖，右側是儲存地點的入口。">
        <figcaption>App 介面示意</figcaption>
      </figure>
    </article>`;
  }
  function render(){
    disposeFeature?.();
    disposeFeature = undefined;
    clearTimeout(clockTimer);
    const path=current(),[section,id]=path.split('/'),list=trips();
    const api={places:library,trips:list,linkPlace,linkGuide};
    const query=new URLSearchParams(location.hash.split('?')[1]||'');
    const from=query.get('from')?.split(/[/?]/)[0];
    const active=Object.hasOwn(tabs,section)?section:['guide','place'].includes(section)
      ? (Object.hasOwn(tabs,from) ? from : from === 'trip' ? 'trips' : 'collection') : 'trips';
    const navigation = document.querySelector('.workspace-tabs');
    const links = [...navigation.querySelectorAll('a')];
    const selected = links.findIndex(link => link.hash === '#' + active);
    if (customElements.get('sakuga-tabs')) {
      if (navigation.selected !== selected) navigation.selected = selected;
    } else {
      links.forEach((link, index) => {
        if (index === selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }
    document.title=tabs[active]+' · Savvy';root.replaceChildren();
    if(section==='atlas')window.renderSavvyAtlas(root,api);
    else if(section==='collection')window.renderSavvyCollection(root,api);
    else if(section==='journey')window.renderSavvyJourney(root,api);
    else if(section==='app')aboutApp();
    else if(section==='new-trip')newTrip();
    else if(section==='trip'&&list.some(t=>t.id===id))itinerary(list.find(t=>t.id===id));
    else if(section==='place'&&byId.has(id))placeDetail(byId.get(id),list);
    else if(section==='guide'&&window.savvyGuides.get(id))guideDetail(window.savvyGuides.get(id),list,query);
    else home(list);
  }
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    root.focus();
    root.scrollIntoView({block:'start'});
  });
  window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);root.focus({preventScroll:true});});
  render();
})();

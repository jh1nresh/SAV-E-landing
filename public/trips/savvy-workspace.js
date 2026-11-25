(() => {
  const root = document.querySelector('#workspace');
  const storageKey = 'savvy.workspace.trips.v1';
  const media = 'news-assets/';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const restaurants = places.map(p => ({
    id:p.id, name:p.name, city:'上海', note:p.dish, address:p.address, image:'assets/thumb-'+p.photo+'.webp',
    article:'第一次吃上海本幫菜，這 7 家怎麼選？', url:'shanghai.html?place='+p.id+'#carousel'
  }));
  const walks = cityWalks.slice(0,2).map((p,i) => ({
    id:['wukang','anfu'][i], name:p.name, city:'上海', note:p.description, address:p.detail,
    image:media+['wukang-mansion.webp','wukang-wide.webp'][i], article:'上海慢慢走：街道散步指南', url:'walks.html#walk-'+(i+1)
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
  const seeds = [
    {id:'shanghai-walk',title:'上海弄堂散步',city:'上海',image:media+'wukang-wide.webp',days:[['wukang','anfu'],['lan-xin','chun']]},
    {id:'taipei-food',title:'台北小吃一日走',city:'台北',image:media+'discovery-live-taipei.webp',days:[['shop-xiaowang','shop-yuanfang','shop-zhouji']]}
  ];
  const tabs = {trips:'My Trip',atlas:'Atlas',collection:'Collection',journey:'Journey'};
  function trips(){
    try {
      const saved=JSON.parse(localStorage.getItem(storageKey));
      if(Array.isArray(saved) && saved.length && saved.every(t=>t && typeof t.id==='string' && typeof t.title==='string' && Array.isArray(t.days) && t.days.every(Array.isArray))) return saved;
    } catch {}
    return structuredClone(seeds);
  }
  function save(list){try{ localStorage.setItem(storageKey,JSON.stringify(list));return true; }catch{alert('瀏覽器無法儲存這次修改。');return false;}}
  function current(){return location.hash.slice(1).split('?')[0] || 'trips';}
  function linkPlace(id){return '#place/'+encodeURIComponent(id)+'?from='+encodeURIComponent(current());}
  function summary(t){return t.days.length+' 天 · '+t.days.flat().length+' 個地點';}
  const landmarks = [
    ['上海', 'Shanghai', '東方明珠塔', media + 'discovery-motion-shanghai.webp', '40% 8%'],
    ['台北', 'Taipei', '台北 101', media + 'discovery-live-taipei.webp', '49% 0%'],
    ['北京', 'Beijing', '雍和宮・萬福閣', media + 'discovery-yonghe-clear.webp', '50% 20%'],
    ['東京', 'Tokyo', '東京鐵塔', media + 'discovery-live-tokyo.webp', '38% 10%'],
    ['京都', 'Kyoto', '清水寺', 'city-bar-assets/kyoto-scene.webp', '50% 50%'],
    ['重慶', 'Chongqing', '東水門大橋', media + 'discovery-live-chongqing.webp', '50% 45%'],
    ['首爾', 'Seoul', 'N 首爾塔', 'city-bar-assets/seoul-scene.webp', '50% 50%'],
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
    const fit = src.startsWith('city-bar-assets/') ? ' trip-drawing' : '';
    return '<img class="trip-photo' + fit + '" src="' + src + '" alt="' + label + '" style="object-position:' + focus + '">';
  }
  function back(url,label){return '<a class="ws-back" href="#'+escape(url)+'">← '+escape(label)+'</a>';}
  function story(p){
    return '<a class="ws-story" href="'+escape(linkPlace(p.id))+'"><img alt="" src="'+escape(p.image)+'"><span><small>'+escape(p.city)+'</small><strong>'+escape(p.name)+'</strong><i>'+escape(p.note)+'</i></span></a>';
  }
  const slideDelay = 9000;
  let clockTimer;
  let disposeFeature;
  function home(list, featuredId = list[0].id) {
    clearTimeout(clockTimer);
    let featured = list.find(t => t.id === featuredId) || list[0];
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
      const position = list.indexOf(trip) + 1;
      return '<div class="trip-window" role="group" aria-roledescription="投影片" aria-label="第 ' + position +
        ' 張，共 ' + list.length + ' 張">' + artwork +
        '<span class="trip-tag">' + escape(trip.city) + (landmark ? ' · ' + landmark[2] : '') + '</span>' +
        '<h2>' + escape(trip.title) + '</h2></div>' + ticket;
    }
    const cityCounts = new Map();
    for (const trip of list) cityCounts.set(trip.city, (cityCounts.get(trip.city) || 0) + 1);
    const coverLabel = trip => trip.city && cityCounts.get(trip.city) === 1 ? trip.city : trip.title;
    const changeTrip = list.length > 1
      ? '<button type="button" class="trip-step" data-step="-1" aria-label="上一張行程封面"></button>' +
        '<select class="trip-switch" aria-label="切換封面行程">' + list.map(t => '<option value="' +
          escape(t.id) + '"' + (t.id === featured.id ? ' selected' : '') + '>' +
          escape(coverLabel(t)) + '</option>').join('') + '</select>' +
        '<button type="button" class="trip-step" data-step="1" aria-label="下一張行程封面"></button>'
      : '';
    const hero = '<section class="trip-feature" aria-label="行程封面" aria-roledescription="輪播">' +
      '<a class="trip-spot" href="' + tripUrl(featured) + '">' + coverContent(featured) + '</a>' +
      '<div class="trip-cover-controls"><button type="button" class="trip-motion"></button>' +
      changeTrip + '</div><p class="trip-slide-status" role="status"></p></section>';
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
    const picks = [['lan-xin','上海本幫菜','shanghai.html'], ['wukang','上海街道散步','walks.html'], ['shop-xiaowang','龍山寺站美食',null]];
    const collections = '<section class="trip-widget"><h2><a href="#collection">攻略收藏 <span>→</span></a></h2><div class="trip-picks">' +
      picks.map(([id,label,url]) => {
        const p = byId.get(id);
        const count = library.filter(x => x.article === p.article).length;
        return '<a href="' + escape(url || p.url) + '"><strong>' + label + '</strong><small>' + count + ' 處</small></a>';
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
    root.innerHTML = '<div class="trip-dashboard"><div class="trip-primary">' + hero + totals +
      '<section class="trip-others"><header><h1>My Trips</h1><div class="trip-tools"><input type="search" aria-label="搜尋行程或地點" placeholder="搜尋行程或地點"><button type="button" data-view aria-pressed="false">列表</button></div></header>' +
      '<div class="trip-grid">' + remaining().map(tripCard).join('') + '<a class="trip-create" href="#new-trip"><b>＋</b>新增行程</a></div></section></div>' +
      '<aside class="trip-rail" aria-label="旅行工具">' + currency + collections + clocks + '<div class="trip-schedule">' + scheduleFor(featured) + '</div></aside></div>';
    const search = root.querySelector('.trip-tools input');
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
    const switcher = feature.querySelector('.trip-switch');
    const motion = feature.querySelector('.trip-motion');
    const status = feature.querySelector('.trip-slide-status');
    const schedule = root.querySelector('.trip-schedule');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    const { signal } = listeners;
    let playing = !reduced.matches;
    let visible = false;
    let hovered = false;
    let timer;

    function drawTrips() {
      const query = search.value.trim().toLocaleLowerCase();
      const results = query ? list.filter(t => [t.title, t.city, ...stops(t).map(p => p.name)].some(s => s?.toLocaleLowerCase().includes(query))) : remaining();
      feature.hidden = Boolean(query);
      root.querySelector('.trip-stats').hidden = Boolean(query);
      grid.innerHTML = results.map(tripCard).join('') || (query ? '<p role="status">沒有符合的行程。</p>' : '');
      grid.append(create);
    }

    function syncMotion() {
      clearTimeout(timer);
      if (signal.aborted) return;
      const film = feature.querySelector('video');
      motion.hidden = !film && list.length < 2;
      motion.classList.toggle('is-playing', playing);
      motion.title = playing ? '暫停封面動態' : '播放封面動態';
      motion.setAttribute('aria-label', motion.title);
      const active = playing && visible && !document.hidden && !feature.hidden;
      if (active && film) {
        if (!film.hasAttribute('src')) film.src = film.dataset.clip;
        if (film.paused) film.play().catch(() => {});
      } else if (film) {
        film.pause();
      }
      if (active && list.length > 1 && !hovered && !dashboard.contains(document.activeElement)) {
        timer = setTimeout(() => step(1, false), slideDelay);
      }
    }

    function selectTrip(trip, manual) {
      if (!trip || trip === featured) return;
      featured = trip;
      feature.querySelector('video')?.pause();
      featureLink.href = tripUrl(trip);
      featureLink.innerHTML = coverContent(trip);
      featureLink.querySelector('.trip-photo')?.classList.add('trip-slide-enter');
      if (switcher) switcher.value = trip.id;
      if (manual) status.textContent = `第 ${list.indexOf(trip) + 1} 張，共 ${list.length} 張 · ${trip.title}`;
      schedule.innerHTML = scheduleFor(trip);
      drawTrips();
      syncMotion();
    }

    function step(direction, manual = true) {
      const index = (list.indexOf(featured) + direction + list.length) % list.length;
      selectTrip(list[index], manual);
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
    if (switcher) switcher.onchange = () => selectTrip(list.find(t => t.id === switcher.value), true);
    for (const button of feature.querySelectorAll('[data-step]')) button.onclick = () => step(Number(button.dataset.step));
    motion.onclick = () => { playing = !playing; syncMotion(); };
    feature.onpointerenter = event => { if (event.pointerType === 'mouse') { hovered = true; syncMotion(); } };
    feature.onpointerleave = () => { hovered = false; syncMotion(); };
    dashboard.onfocusin = syncMotion;
    dashboard.onfocusout = () => queueMicrotask(syncMotion);
    document.addEventListener('visibilitychange', syncMotion, { signal });
    reduced.addEventListener('change', event => { playing = !event.matches; syncMotion(); }, { signal });
    search.oninput = () => { drawTrips(); syncMotion(); };
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
    root.innerHTML='<section class="ws-form">'+back('trips','My Trip')+'<div class="ws-heading"><h1>新增行程</h1></div><form><label>行程名稱<input name="title" required maxlength="70" placeholder="例如：春天的東京與台北"></label><label>目的地<input name="city" required maxlength="60" placeholder="城市或國家"></label><button class="ws-btn">建立行程</button></form></section>';
    root.querySelector('form').onsubmit=e=>{
      e.preventDefault();
      const f=e.currentTarget, title=f.elements.title.value.trim(),city=f.elements.city.value.trim();
      if(!title||!city){(title?f.elements.city:f.elements.title).focus();return;}
      const t={id:crypto.randomUUID(),title,city,image:landmarkFor(city)?.[3] || null,days:[[]]};
      if(save([t,...trips()])) location.hash='trip/'+t.id;
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
    window.renderSavvyTripReader(root, t, {escape, byId, library, summary, update, linkPlace});
    document.title = t.title + ' · Savvy';
  }
  function placeDetail(p,list){
    const from=new URLSearchParams(location.hash.split('?')[1]||'').get('from');
    const t=list.find(t=>'trip/'+t.id===from);
    const parent=from?.split('/')[0];
    const target = t || (['collection','journey'].includes(parent) && /^[a-zA-Z0-9/_-]+$/.test(from)) || Object.hasOwn(tabs,from) ? from : 'collection';
    const sources = [{title:p.article,url:p.url}, ...(window.savvyLinksForPlace?.(p.id) || [])];
    const articles = sources.map(source => '<a class="ws-source" href="'+escape(source.url)+'">'+escape(source.title)+' ↗</a>').join('');
    root.innerHTML='<article class="ws-place">'+back(target,t?.title||tabs[target.split('/')[0]])+'<img src="'+escape(p.image)+'" alt=""><p class="ws-meta">'+escape(p.city)+' · '+escape(p.address)+'</p><h1>'+escape(p.name)+'</h1><p>'+escape(p.note)+'</p><section class="ws-related"><h2>相關攻略</h2>'+articles+'</section></article>';
  }
  function render(){
    disposeFeature?.();
    disposeFeature = undefined;
    clearTimeout(clockTimer);
    const path=current(),[section,id]=path.split('/'),list=trips();
    const api={places:library,trips:list,linkPlace};
    const from=new URLSearchParams(location.hash.split('?')[1]||'').get('from')?.split('/')[0];
    const active=Object.hasOwn(tabs,section)?section:section==='place' && Object.hasOwn(tabs,from)?from:'trips';
    document.querySelectorAll('.appnav a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=tabs[active]+' · Savvy';root.replaceChildren();
    if(section==='atlas')window.renderSavvyAtlas(root,api);
    else if(section==='collection')window.renderSavvyCollection(root,api);
    else if(section==='journey')window.renderSavvyJourney(root,api);
    else if(section==='new-trip')newTrip();
    else if(section==='trip'&&list.some(t=>t.id===id))itinerary(list.find(t=>t.id===id));
    else if(section==='place'&&byId.has(id))placeDetail(byId.get(id),list);
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

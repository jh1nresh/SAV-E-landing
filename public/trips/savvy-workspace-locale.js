(() => {
  const select = document.querySelector('#workspace-language');
  const key = 'savvy.workspace.locale';
  const roots = ['title', '.skip', '.appbar', '#workspace', '.shellfoot', '.waitlist-dialog'].map(selector => document.querySelector(selector));
  const copy = new Map(`
指南與支援|Guides and support
旅行攻略|Travel guides
城市貼文|City posts
收藏整理|Saving places
捷運美食|Metro food
圖鑑檢視|Atlas views
城市|Cities
捷運美食地圖|Metro food map
這座城市目前沒有捷運美食攻略。|There are no metro food guides for this city yet.
查看全部捷運美食攻略 →|Browse all metro food guides →
隱私|Privacy
支援|Support
攻略與原文|Guides & original posts
攻略索引|Guide index
原文索引|Posts index
Threads 原文 ↗|Original on Threads ↗
跳到內容|Skip to content
Savvy 首頁|Savvy home
主導覽|Main navigation
選單|Menu
深色模式|Dark mode
日夜|Theme
語言|Language
Savvy 社群|Savvy on social media
小紅書|RedNote
加入測試名單|Get early access
把想去的地方，排進下一趟行程。|Turn places you save into places you go.
滑到一家想吃的店？把貼文連結分享給 Savvy，確認是哪一家，再存到自己的地圖。出門前，把想去的幾站排成行程。|Found somewhere you want to eat? Share the post with Savvy, confirm the place, and save it to your map. When you’re ready to go, turn a few saved places into a trip.
App 介面示意|App preview
左側是已收藏的地點和地圖，右側是儲存地點的入口。|Saved places and a map on the left, with options for saving a place on the right.
我的行程|My Trip
收藏|Collection
遊記|Journey
加入 Savvy 測試名單|Savvy early access
開放試用時，我們會寄信給你，附上加入方式。|We’ll email you how to join when the beta opens.
本機預覽，Email 不會送出。|Local preview. Your email will not be sent.
已完成試填，Email 沒有送出。|Preview complete. Your email was not sent.
關閉|Close
目的地|Destination
天數|Days
相關攻略|Related guides
行程地點|Trip stops
行程封面|Trip covers
投影片|Slide
輪播|Carousel
行程總覽|Trip overview
目的地城市|Cities
全部行程|All trips
行程天數|Trip days
收錄地點|Saved places
旅行換匯|Currency converter
換算金額|Amount
來源幣別|From currency
交換幣別|Swap currencies
換算結果|Converted amount
目標幣別|To currency
攻略收藏|Saved guides
城市時間|Local time
美東時間|Eastern Time
每日第一站|First stop each day
搜尋行程或地點|Search trips or places
列表|List view
新增行程|New trip
旅行工具|Travel tools
座|cities
趟|trips
天|days
處|places
篇|guides
站|stops
沒有符合的行程。|No matching trips.
行程名稱|Trip name
例如：春天的東京與台北|e.g. Spring in Tokyo and Taipei
城市或國家|City or country
建立行程|Create trip
城市圖鑑|Atlas
已造訪的城市比例|Share of cities visited
座城市去過|cities visited
展開街區 ↗|Open city model ↗
城市索引|City index
篩選城市|Filter cities
全部|All
去過|Visited
還沒有造訪紀錄。選擇城市後，點「我去過」即可加入。|No cities visited yet. Pick a city and mark it as visited.
✓ 已去過|✓ Visited
＋ 我去過|＋ Mark as visited
未分類|Uncategorized
全部收藏|All collections
＋ 收藏連結|＋ Save a link
連結網址|Link URL
標題（選填）|Title (optional)
城市（選填）|City (optional)
關聯地點（選填）|Related place (optional)
不指定地點|No specific place
收藏集|Collection
儲存在這個瀏覽器|Saved in this browser
取消|Cancel
儲存|Save
未歸入收藏集|No collection
依城市篩選收藏|Filter collections by city
我的收藏集|My collections
＋ 建立收藏集|＋ New collection
收藏集名稱|Collection name
建立|Create
無法儲存收藏集。|Could not save the collection.
選擇要加入收藏集的地點|Choose a place to add
加入地點|Add place
已加入地點。|Place added.
無法儲存地點。|Could not save the place.
已更新連結的收藏集。|Collection updated.
無法移動連結。|Could not move the link.
選一個地點|Choose a place
全部城市|All cities
我的連結|My links
地點攻略|Place guides
這裡還沒有收藏。|Nothing saved here yet.
瀏覽器無法儲存，請確認儲存空間後再試。|Your browser could not save this. Check available storage and try again.
把幾趟行程，寫成一本遊記。|Bring several trips together in one journal.
前往 My Trip 建立行程 →|Create a trip in My Trip →
無法讀取此瀏覽器儲存的遊記。|Could not open the journals saved in this browser.
＋ 建立遊記|＋ New journal
例如：江南散步手記|e.g. Walks in Jiangnan
收錄行程|Included trips
儲存遊記|Save journal
編輯遊記|Edit journal
建立遊記|New journal
遊記名稱|Journal name
請填寫遊記名稱。|Enter a journal name.
請選擇至少一趟行程。|Select at least one trip.
無法儲存遊記，請檢查瀏覽器儲存空間。|Could not save your journal. Check browser storage.
選擇遊記|Choose a journal
全部紀錄|All entries
旅行手記|Travel journal
無法讀取旅途紀錄。|Could not open your journal entries.
旅途紀錄|Journal entries
還沒有紀錄。選一個行程中的地點，寫下第一則見聞。|No entries yet. Pick a place on a trip and add your first note.
閱讀攻略|Read guide
寫一則紀錄|Write an entry
行程|Trip
日期|Date
在這裡發現了什麼？|What did you discover here?
儲存紀錄|Save entry
旅途見聞|Notes
紀錄儲存在此瀏覽器。|Entries are saved in this browser.
先在行程中加入地點。|Add a place to the trip first.
儲存失敗，請檢查瀏覽器儲存空間或權限。|Could not save. Check browser storage or permissions.
已儲存至此瀏覽器。|Saved in this browser.
這趟行程尚無街區地圖|This trip has no neighborhood map yet
上海街區地圖與攻略連結|Shanghai neighborhood map and guide links
全程街圖|Full route
街區模型 ↗|City model ↗
放大街圖|Zoom in
縮小街圖|Zoom out
看街圖|View map
尚未加入地點|No places added yet
編輯行程|Edit trip
移出|Remove
選擇地點|Choose a place
加入|Add
＋ 新增一天|＋ Add a day
加入地點後，就能從這裡讀攻略。|Add a place to find its guide here.
每日路線|Daily route
行程街區|Trip map
上海街區圖|Shanghai map
閱讀內容|Reader view
隨行攻略|Trip guides
地點|Places
地點清單|Places
看地點|View place
看起點地圖 ↗|Map of the starting point ↗
原版圖卡|Original guide card
完整原文 ↗|Full original guide ↗
回到攻略收藏|Back to collections
上海|Shanghai
台北|Taipei
北京|Beijing
東京|Tokyo
京都|Kyoto
重慶|Chongqing
首爾|Seoul
洛杉磯|Los Angeles
紐約|New York
`.trim().split('\n').map(line => line.split('|')));

  let language = 'zh-Hant';
  try { if (localStorage.getItem(key) === 'en') language = 'en'; } catch {}
  if (new URLSearchParams(location.search).get('lang') === 'en') language = 'en';
  const remembered = new WeakMap();
  const attributes = ['placeholder', 'aria-label', 'aria-roledescription', 'title', 'label', 'alt', 'text'];
  const authored = '.trip-window h2, .trip-mini strong, .col-ws-card-title, .col-ws-place, .ws-place h1, .reader-head h1, .reader-article h3, .journey-ws-entry p, .guide-original';

  function english(value) {
    if (copy.has(value)) return copy.get(value);
    const patterns = [
      [/^第 (\d+) 天$/, (_, n) => 'Day ' + n],
      [/^第 (\d+) 張，共 (\d+) 張$/, (_, n, total) => 'Slide ' + n + ' of ' + total],
      [/^(\d+) 天 · (\d+) 個地點$/, (_, days, places) => days + (days === '1' ? ' day' : ' days') + ' · ' + places + (places === '1' ? ' place' : ' places')],
      [/^(.*?)(\d+) 個地點$/, (_, prefix, n) => prefix.replace(/^(.+?) · $/, (_, city) => english(city) + ' · ') + n + (n === '1' ? ' place' : ' places')],
      [/^(\d+) 處$/, (_, n) => n + (n === '1' ? ' place' : ' places')],
      [/^參考匯率(.*)$/, (_, rest) => 'Reference rates' + rest],
      [/^我去過(.+)$/, (_, city) => 'Mark ' + english(city) + ' as visited'],
      [/^在新分頁展開(.+)$/, (_, name) => 'Open ' + english(name) + ' in a new tab'],
      [/^(.+)互動街景$/, (_, name) => english(name) + ' interactive city model'],
      [/^(.+)地點與攻略$/, (_, city) => english(city) + ' places and guides'],
      [/^(.+?)(?:捷運|地鐵)美食$/, (_, city) => english(city) + ' metro food'],
      [/^← (.+)$/, (_, title) => '← ' + english(title)],
      [/^已收藏「(.+)」。$/, (_, title) => 'Saved “' + title + '”.']
    ];
    for (const [pattern, replace] of patterns) if (pattern.test(value)) return value.replace(pattern, replace);
    const parts = value.split(' · ');
    return parts.length > 1 ? parts.map(part => copy.get(part) || part).join(' · ') : value;
  }
  function update(node, property, value, write) {
    const memory = remembered.get(node) || new Map();
    const previous = memory.get(property);
    const original = previous?.rendered === value ? previous.original : value;
    const translated = language === 'en'
      ? original.replace(/\S(?:[\s\S]*\S)?/, english)
      : original;
    if (translated !== original) {
      memory.set(property, { original, rendered: translated });
      remembered.set(node, memory);
    } else {
      memory.delete(property);
    }
    if (translated !== value) write(translated);
  }
  function localize(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement?.closest(authored)) update(node, 'data', node.data, v => { node.data = v; });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches('script,style,[lang]:not(html)') || node.closest(authored)) return;
    for (const attribute of attributes) {
      const value = node.getAttribute(attribute);
      if (value) update(node, attribute, value, v => node.setAttribute(attribute, v));
    }
    for (const child of node.childNodes) localize(child);
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'childList') for (const node of record.addedNodes) localize(node);
      else localize(record.target);
    }
    observe();
  });
  function observe() {
    if (language !== 'en') return;
    for (const root of roots) observer.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: attributes });
  }
  function apply() {
    observer.disconnect();
    select.value = language;
    document.documentElement.lang = language;
    roots.forEach(localize);
    observe();
  }
  window.savvySearchText = value => language === 'en' ? english(String(value || '')) : String(value || '');
  select.addEventListener('change', () => {
    language = select.value;
    try { localStorage.setItem(key, language); } catch {}
    apply();
  });
  apply();
})();

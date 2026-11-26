(() => {
  const scenes = [
    { id: "Shanghai", city: "上海", area: "武康路 × 淮海中路" },
    { id: "Taipei", city: "台北", area: "信義路 × 市府路" },
    { id: "Beijing", city: "北京", area: "銀錠橋 × 煙袋斜街" },
    { id: "Tokyo", city: "東京", area: "谷中銀座 × 夕陽階梯" },
    { id: "Kyoto", city: "京都", area: "祇園白川 × 巽橋" },
    { id: "Chongqing", city: "重慶", area: "山城巷" },
    { id: "Seoul", city: "首爾", area: "益善洞韓屋街" },
    { id: "Los-Angeles", city: "洛杉磯", area: "藝術區 · Traction Avenue" },
    { id: "New-York", city: "紐約", area: "宰也街 × 勿街" },
  ];
  const selectedKey = "savvy.atlas.city.v1";
  const visitedPrefix = "savvy.atlas.visited.v1.";
  const fallback = new Map();
  let filterVisited = false;
  function read(key) {
    if (fallback.has(key)) return fallback.get(key);
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, value);
      fallback.delete(key);
    } catch {
      fallback.set(key, value);
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // The full Pocket City document also owns the geometry, camera controls and sources.
  // In the workspace its stage takes the available space; the standalone link opens all field notes.
  function embedScene(url, label) {
    const frame = element("iframe", "atlas-ws-frame");
    frame.title = label + "互動街景";
    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      if (!doc?.getElementById("fig")) return;
      const style = doc.createElement("style");
      style.textContent = `
        .top, .workspace > .rail, .workspace > .control-area {display:none}
        main.workspace {display:block; height:calc(100% - 26px)}
        main.workspace > .stage {display:block; position:absolute; inset:0; margin:0}
        .foot {height:26px; padding-inline:10px}
        .stage .tools {max-width:calc(100% - 16px);border:2px solid var(--sakura-edge);background:var(--sakura-paper);box-shadow:2px 3px var(--sakura-shadow)}
        .stage .tools .play {background:var(--sakura-wash);color:var(--sakura-ink)}
        @media(max-width:460px){.foot .metric {display:none}.stage .tools select{max-width:7.5rem}}
      `;
      doc.head.append(style);
      const fx = window.SakugaFX;
      if (!fx) return;
      const feedback = event => {
        const control = event.target.closest?.('.stage .tools button, .stage .tools select');
        if (!control || control.disabled || fx.calm) return;
        const origin = fx.at(frame, 0, 0);
        const bounds = control.getBoundingClientRect();
        window.savvyPrimaryImpact?.({
          x: origin.x + bounds.right - 8,
          y: origin.y + bounds.top + bounds.height / 2
        });
      };
      doc.addEventListener("click", feedback, { capture:true });
      doc.addEventListener("change", feedback, { capture:true });
    });
    frame.src = url;
    return frame;
  }

  function atlasViews(isMetro) {
    const nav = element("nav", "atlas-ws-views");
    nav.setAttribute("aria-label", "圖鑑檢視");
    const tabs = element("sakuga-tabs", "atlas-ws-view-tabs");
    for (const [label, hash, active] of [["城市", "#atlas", !isMetro], ["捷運美食", "#atlas?view=metro", isMetro]]) {
      const link = element("a", "", label);
      link.href = hash;
      if (active) link.setAttribute("aria-current", "page");
      tabs.append(link);
    }
    nav.append(tabs);
    return nav;
  }

  function metroView(selected) {
    const fragment = document.createDocumentFragment();
    const header = element("header", "atlas-ws-metro-header");
    const title = element("h2", "", selected.city + (selected.id === "Taipei" ? "捷運美食" : "地鐵美食"));
    title.tabIndex = -1;
    const guides = element("a", "atlas-ws-metro-guides", "查看全部捷運美食攻略 →");
    guides.href = "/metro";
    header.append(title, guides);
    fragment.append(header);
    if (!["Taipei", "Shanghai"].includes(selected.id)) {
      fragment.append(element("p", "atlas-ws-metro-empty", "這座城市目前沒有捷運美食攻略。"));
      return fragment;
    }
    const frame = element("iframe", "atlas-ws-metro-frame");
    frame.title = "捷運美食地圖";
    const query = new URLSearchParams({ embed: "atlas" });
    if (document.documentElement.lang === "en") query.set("lang", "en");
    frame.src = (selected.id === "Shanghai" ? "/shanghai" : "/discover") + "?" + query.toString();
    fragment.append(frame);
    return fragment;
  }

  window.renderSavvyAtlas = function renderSavvyAtlas(root, api) {
    let selected = scenes.find(scene => scene.id === read(selectedKey)) || scenes[0];
    const visited = scene => read(visitedPrefix + scene.id) === "1";
    const isMetro = new URLSearchParams(location.hash.split("?")[1]).get("view") === "metro";
    let atlas = root.querySelector(":scope > .atlas-ws");
    if (!atlas) {
      atlas = element("div", "atlas-ws");
      const heading = element("header", "atlas-ws-header");
      heading.append(element("h1", "atlas-ws-title", "城市圖鑑"), atlasViews(isMetro));
      atlas.append(heading);
    }
    const heading = atlas.querySelector(".atlas-ws-header");
    const views = heading.querySelector(".atlas-ws-views");
    const tabs = views.querySelector("sakuga-tabs");
    const selectedView = Number(isMetro);
    if (tabs.selected !== selectedView) {
      if (typeof tabs.selected === "number") tabs.selected = selectedView;
      else [...tabs.querySelectorAll("a")].forEach((link, index) => {
        if (index === selectedView) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }
    heading.querySelector(".atlas-ws-stat")?.remove();
    const stat = element("p", "atlas-ws-stat");
    stat.setAttribute("aria-live", "polite");
    const count = element("strong");
    const animatedProgress = Boolean(customElements.get("sakuga-progress"));
    const progress = animatedProgress
      ? element("sakuga-progress", "atlas-ws-sakuga-progress")
      : element("progress", "atlas-ws-progress");
    if (animatedProgress) {
      progress.setAttribute("compact", "");
      progress.setAttribute("label", "已造訪的城市比例");
    } else {
      progress.max = scenes.length;
      progress.setAttribute("aria-label", "已造訪的城市比例");
    }
    stat.append(count, element("span", "", "座城市去過"), progress);
    if (!isMetro) heading.insertBefore(stat, views);
    const layout = element("div", isMetro ? "atlas-ws-layout atlas-ws-metro-mode" : "atlas-ws-layout");
    const metroHost = element("section", "atlas-ws-metro");
    const scene = element("section", "atlas-ws-scene");
    const stage = element("div", "atlas-ws-stage");
    const frameHost = element("div", "atlas-ws-frame-host");
    const sceneHeader = element("header", "atlas-ws-scene-header");
    const name = element("h2");
    const area = element("p", "atlas-ws-area");
    const frameCaption = element("div", "atlas-ws-stage-caption");
    const full = element("a", "atlas-ws-open", "展開街區 ↗");
    full.target = "_blank";
    full.rel = "noopener";
    const mark = element("button", "atlas-ws-mark");
    mark.type = "button";
    sceneHeader.append(name, area);
    frameCaption.append(full, mark);
    stage.append(frameHost, sceneHeader, frameCaption);
    const articles = element("section", "atlas-ws-articles");
    scene.append(stage, articles);

    const index = element("section", "atlas-ws-index");
    const indexHeader = element("header", "atlas-ws-index-header");
    indexHeader.append(element("h2", "", "城市索引"));
    const filters = element("div", "atlas-ws-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "篩選城市");
    const all = element("button", "", "全部");
    const seen = element("button", "", "去過");
    all.type = seen.type = "button";
    filters.append(all, seen);
    if (!isMetro) indexHeader.append(filters);
    const cities = element("div", "atlas-ws-cities");
    cities.addEventListener("pointerover", event => {
      const fx = window.SakugaFX;
      if (event.pointerType !== "mouse" || !fx || fx.calm) return;
      const tile = event.target.closest(".atlas-ws-tile");
      if (!tile || (event.relatedTarget instanceof Node && tile.contains(event.relatedTarget))) return;
      const { x, y } = fx.at(tile, .91, .34);
      fx.kira(x, y, { r: 8, col: "#ffe0ed", life: .38 });
      fx.ticks(x + 2, y + 3, { n: 3, r: 7, len: 6, life: .25 });
      fx.lines(x - 4, y + 12, { n: 3, len: 12, spread: 5, life: .22 });
    });
    const empty = element("p", "atlas-ws-empty", "還沒有造訪紀錄。選擇城市後，點「我去過」即可加入。");
    index.append(indexHeader, cities, empty);
    if (isMetro) layout.append(index, metroHost);
    else layout.append(scene, index);
    atlas.querySelector(".atlas-ws-layout")?.remove();
    atlas.append(layout);
    if (!atlas.isConnected) root.replaceChildren(atlas);

    const tiles = new Map();
    for (const city of scenes) {
      const tile = element("button", "atlas-ws-tile");
      tile.type = "button";
      const picture = element("img");
      picture.src = '/trips/city-bar-assets/' + city.id.toLowerCase() + '-pocket.webp';
      picture.alt = "";
      const label = element("span", "atlas-ws-tile-label");
      label.append(element("strong", "", city.city), element("small", "", city.id.replaceAll("-", " ")));
      const check = element("span", "atlas-ws-tile-check", "✓");
      check.setAttribute("aria-label", "去過");
      tile.append(picture, label, check);
      tile.addEventListener("click", () => {
        if (selected.id === city.id) return;
        selected = city;
        save(selectedKey, selected.id);
        showScene();
        refresh();
        if (window.matchMedia("(max-width: 49rem)").matches) {
          const activeHeading = isMetro ? metroHost.querySelector("h2") : name;
          activeHeading.focus({ preventScroll: true });
          (isMetro ? metroHost : stage).scrollIntoView({ block: "start" });
        }
      });
      tiles.set(city.id, { tile, check });
      cities.append(tile);
    }
    name.tabIndex = -1;
    let displayedCount;
    function refresh() {
      const total = scenes.filter(visited).length;
      count.textContent = total + " / " + scenes.length;
      if (animatedProgress) progress.set(total / scenes.length, displayedCount === undefined);
      else progress.value = total;
      displayedCount = total;
      all.setAttribute("aria-pressed", String(!filterVisited));
      seen.setAttribute("aria-pressed", String(filterVisited));
      empty.hidden = isMetro || !filterVisited || total > 0;
      mark.setAttribute("aria-pressed", String(visited(selected)));
      mark.textContent = visited(selected) ? "✓ 已去過" : "＋ 我去過";
      mark.setAttribute("aria-label", "我去過" + selected.city);
      for (const city of scenes) {
        const { tile, check } = tiles.get(city.id);
        tile.hidden = !isMetro && filterVisited && !visited(city);
        tile.setAttribute("aria-pressed", String(city.id === selected.id));
        check.hidden = !visited(city);
      }
    }

    function showScene() {
      if (isMetro) {
        metroHost.replaceChildren(metroView(selected));
        return;
      }
      const url = '/trips/pocket-city/' + selected.id + '/index.html';
      const label = selected.city + " · " + selected.area;
      name.textContent = selected.city;
      area.textContent = selected.area;
      full.href = url;
      full.setAttribute("aria-label", "在新分頁展開" + label);
      frameHost.replaceChildren(embedScene(url, label));
      const places = api.places.filter(place => place.city === selected.city && place.url);
      articles.replaceChildren();
      articles.hidden = !places.length;
      if (!places.length) return;
      articles.append(element("h2", "", selected.city + "地點與攻略"));
      const list = element("ul", "atlas-ws-place-list");
      for (const place of places) {
        const anchor = element("a", "atlas-ws-place");
        anchor.href = api.linkPlace(place.id);
        if (place.image) {
          const image = element("img");
          image.alt = "";
          image.loading = "lazy";
          image.src = place.image;
          anchor.append(image);
        }
        const lines = element("span");
        lines.append(element("strong", "", place.name), element("small", "", place.article));
        const arrow = element("span", "atlas-ws-place-arrow", "→");
        arrow.setAttribute("aria-hidden", "true");
        anchor.append(lines, arrow);
        const item = element("li");
        item.append(anchor);
        list.append(item);
      }
      articles.append(list);
    }

    mark.addEventListener("click", () => {
      save(visitedPrefix + selected.id, visited(selected) ? "0" : "1");
      refresh();
    });
    all.addEventListener("click", () => { filterVisited = false; refresh(); });
    seen.addEventListener("click", () => { filterVisited = true; refresh(); });
    showScene();
    refresh();
  };
})();

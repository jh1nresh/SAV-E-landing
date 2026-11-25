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
  // Coordinates anchor each leader to the neighborhood. Labels use separate print positions.
  const locations = {
    Shanghai: [121.4377, 31.2024, [359, 333], [265, 269]],
    Taipei: [121.5637, 25.0321, [233, 379], [163, 304]],
    Beijing: [116.3935, 39.9386, [110, 126], [90, 55]],
    Tokyo: [139.7668, 35.7276, [389, 119], [369, 62]],
    Kyoto: [135.7743, 35.004, [430, 231], [353, 214]],
    Chongqing: [106.5703, 29.5515, [82, 335], [54, 222]],
    Seoul: [126.9899, 37.5749, [246, 100], [231, 44]],
    "Los-Angeles": [-118.2343, 34.045, [699, 333], [92, 125]],
    "New-York": [-73.998, 40.7148, [990, 300], [311, 116]],
  };
  const sheets = [
    { id: "pacific", label: "環太平洋", width: 1100, height: 435, west: 72, east: 318, north: 68, cities: scenes },
    { id: "asia", label: "東亞", width: 420, height: 355, west: 91.5, east: 152, north: 49,
      cities: scenes.filter(city => !city.id.includes("-")) },
    { id: "america", label: "北美", width: 420, height: 180, west: 219, east: 306, north: 51,
      cities: scenes.filter(city => city.id.includes("-")) },
  ];
  const visitedPrefix = "savvy.atlas.visited.v1.";
  const fallback = new Map();
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
        .stage .tools {max-width:calc(100% - 16px)}
        @media(max-width:460px){.foot .metric {display:none}.stage .tools select{max-width:7.5rem}}
      `;
      doc.head.append(style);
    });
    frame.src = url;
    return frame;
  }

  function svg(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  }

  function mercator(lat) {
    return Math.asinh(Math.tan(lat * Math.PI / 180)) * 180 / Math.PI;
  }

  function mapSheet(sheet, visited, onlyVisited) {
    const panel = element("section", "atlas-ws-map atlas-ws-map-" + sheet.id);
    panel.setAttribute("aria-label", sheet.label + "城市地圖");
    if (onlyVisited && !sheet.cities.some(visited)) panel.hidden = true;
    panel.style.aspectRatio = sheet.width + " / " + sheet.height;
    const drawing = svg("svg", {viewBox: '0 0 ' + sheet.width + ' ' + sheet.height, 'aria-hidden': 'true', focusable: 'false'});
    const scale = sheet.width / (sheet.east - sheet.west);
    const x = lon => (lon - sheet.west) * scale;
    const north = mercator(sheet.north);
    const y = lat => (north - mercator(lat)) * scale;
    for (const offset of [0, 360]) {
      drawing.append(svg("image", {
        href: "atlas-coast.svg", x: x(offset - 180), y: (north - 180) * scale,
        width: 360 * scale, height: 360 * scale
      }));
    }
    const grid = svg("g", {class:"atlas-ws-graticule"});
    for (let lon = 0; lon <= 360; lon += 15) {
      if (lon > sheet.west && lon < sheet.east) grid.append(svg("line", {x1:x(lon), x2:x(lon), y1:0, y2:sheet.height}));
    }
    for (let lat = 0; lat <= 75; lat += 15) {
      if (y(lat) > 0 && y(lat) < sheet.height) grid.append(svg("line", {x1:0, x2:sheet.width, y1:y(lat), y2:y(lat)}));
    }
    drawing.append(grid);
    if (sheet.id !== "pacific") panel.append(element("h2", "atlas-ws-sheet-title", sheet.label));
    else panel.append(element("span", "atlas-ws-ocean", "太平洋"));
    panel.append(drawing);

    for (const city of sheet.cities) {
      const seen = visited(city);
      if (onlyVisited && !seen) continue;
      const [lon, lat, worldLabel, regionLabel] = locations[city.id];
      const [lx, ly] = sheet.id === "pacific" ? worldLabel : regionLabel;
      const px = x(lon < 0 ? lon + 360 : lon);
      const py = y(lat);
      const group = svg("g", {class:seen ? "atlas-ws-pin is-visited" : "atlas-ws-pin"});
      group.append(svg("line", {x1:px, y1:py, x2:lx, y2:ly}), svg("circle", {cx:px, cy:py, r:3}));
      drawing.append(group);
      const link = element("a", "atlas-ws-tile");
      link.href = "#atlas/" + city.id;
      link.style.left = (lx / sheet.width * 100) + "%";
      link.style.top = (ly / sheet.height * 100) + "%";
      link.setAttribute("aria-label", city.city + "，" + city.area + (seen ? "，已去過" : ""));
      const picture = element("img");
      picture.src = "city-bar-assets/" + city.id.toLowerCase() + "-pocket.webp";
      picture.alt = "";
      link.append(picture, element("strong", "", city.city));
      if (seen) link.append(element("span", "atlas-ws-check", "✓"));
      panel.append(link);
    }
    return panel;
  }

  window.renderSavvyAtlas = function renderSavvyAtlas(root, api) {
    const id = location.hash.slice(1).split("?")[0].split("/")[1];
    const selected = scenes.find(city => city.id === id);
    const visited = city => read(visitedPrefix + city.id) === "1";
    const atlas = element("div", "atlas-ws");
    const heading = element("header", "atlas-ws-header");
    const title = element("h1", "atlas-ws-title", "Atlas");
    title.append(element("span", "", "城市圖鑑"));
    const stat = element("p", "atlas-ws-stat");
    stat.setAttribute("aria-live", "polite");
    const count = element("strong");
    const progress = element("progress", "atlas-ws-progress");
    progress.max = scenes.length;
    progress.setAttribute("aria-label", "已造訪的城市比例");
    stat.append(count, element("span", "", "座城市去過"), progress);
    function syncCount() {
      const number = scenes.filter(visited).length;
      count.textContent = number + " / " + scenes.length;
      progress.value = number;
    }
    syncCount();
    heading.append(title, stat);
    atlas.append(heading);
    root.replaceChildren(atlas);

    if (!selected) {
      const filters = element("div", "atlas-ws-filters");
      filters.setAttribute("role", "group");
      filters.setAttribute("aria-label", "篩選城市");
      const all = element("button", "", "全部城市");
      const seen = element("button", "", "去過的城市");
      all.type = seen.type = "button";
      filters.append(all, seen);
      const maps = element("div", "atlas-ws-sheets");
      const credit = element("a", "atlas-ws-credit", "底圖 · Natural Earth");
      credit.href = "https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/";
      const footer = element("div", "atlas-ws-map-foot");
      footer.append(filters, credit);
      atlas.append(maps, footer);
      function draw(onlyVisited) {
        all.setAttribute("aria-pressed", String(!onlyVisited));
        seen.setAttribute("aria-pressed", String(onlyVisited));
        if (onlyVisited && !scenes.some(visited)) {
          maps.replaceChildren(element("p", "atlas-ws-empty", "還沒有造訪紀錄。點進城市後，選「我去過」即可加入。"));
        } else {
          maps.replaceChildren(...sheets.map(sheet => mapSheet(sheet, visited, onlyVisited)));
        }
      }
      all.addEventListener("click", () => draw(false));
      seen.addEventListener("click", () => draw(true));
      draw(false);
      return;
    }

    const detail = element("section", "atlas-ws-scene");
    const back = element("a", "atlas-ws-back", "← 全部城市");
    back.href = "#atlas";
    const stage = element("div", "atlas-ws-stage");
    const url = "pocket-city/" + selected.id + "/index.html";
    const label = selected.city + " · " + selected.area;
    const caption = element("header", "atlas-ws-scene-header");
    caption.append(element("h2", "", selected.city), element("p", "atlas-ws-area", selected.area));
    const actions = element("div", "atlas-ws-stage-caption");
    const full = element("a", "atlas-ws-open", "展開街區 ↗");
    full.href = url;
    full.target = "_blank";
    full.rel = "noopener";
    full.setAttribute("aria-label", "在新分頁展開" + label);
    const mark = element("button", "atlas-ws-mark");
    mark.type = "button";
    mark.setAttribute("aria-label", "我去過" + selected.city);
    function syncMark() {
      const seen = visited(selected);
      mark.setAttribute("aria-pressed", String(seen));
      mark.textContent = seen ? "✓ 已去過" : "＋ 我去過";
    }
    mark.addEventListener("click", () => {
      save(visitedPrefix + selected.id, visited(selected) ? "0" : "1");
      syncMark();
      syncCount();
    });
    syncMark();
    actions.append(full, mark);
    stage.append(embedScene(url, label), caption, actions);
    detail.append(back, stage);
    const places = api.places.filter(place => place.city === selected.city && place.url);
    if (places.length) {
      const articles = element("section", "atlas-ws-articles");
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
      detail.append(articles);
    }
    atlas.append(detail);
  };
})();

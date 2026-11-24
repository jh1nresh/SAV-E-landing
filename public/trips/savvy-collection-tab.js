(() => {
  const key = "savvy.workspace.collection.v1";
  const listKey = "savvy.workspace.collection-lists.v1";
  const noCity = "未分類";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function webUrl(value, base) {
    try {
      const url = new URL(value, base);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url;
    } catch {}
    return null;
  }

  function savedLinks() {
    try {
      const records = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(records) ? records.filter(record =>
        record && typeof record.title === "string" && typeof record.city === "string" && webUrl(record.url)
      ) : [];
    } catch {
      return [];
    }
  }

  const cityLists = [
    { id: "shanghai", name: "上海街頭", city: "上海", art: "shanghai" },
    { id: "taipei", name: "台北散步", city: "台北", art: "taipei" },
  ];
  function readLists() {
    try {
      const records = JSON.parse(localStorage.getItem(listKey) || "[]");
      return Array.isArray(records) ? records.filter(item =>
        item && /^list-[a-z0-9-]+$/.test(item.id) && typeof item.name === "string" && Array.isArray(item.places)
      ) : [];
    } catch { return []; }
  }
  function option(value, label) {
    const item = element("option", "", label);
    item.value = value;
    return item;
  }
  function collectionUrl(id) {
    return "#collection/" + id;
  }

  window.savvyLinksForPlace = function savvyLinksForPlace(placeId) {
    if (typeof placeId !== "string" || !placeId) return [];
    return savedLinks().filter(record => record.placeId === placeId).map(({ title, url }) => ({ title, url }));
  };

  function sourceLink(text, url) {
    const anchor = element("a", "col-ws-source", text);
    anchor.href = url;
    if (new URL(url, document.baseURI).origin !== location.origin) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    return anchor;
  }

  let libraryRequest;
  function loadLibrary() {
    if (!libraryRequest) {
      libraryRequest = fetch("/trips/library.json").then(async response => {
        if (!response.ok) throw new Error("library");
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error("library");
        return rows.filter(row =>
          row && (row.kind === "guide" || row.kind === "post") &&
          typeof row.title === "string" && row.title.trim() &&
          typeof row.href === "string" && row.href.trim() && webUrl(row.href, document.baseURI)
        );
      }).catch(error => {
        libraryRequest = undefined;
        throw error;
      });
    }
    return libraryRequest;
  }

  function publicationShelf() {
    const shelf = element("section", "col-ws-publications");
    const header = element("header", "col-ws-publication-head");
    header.append(element("h2", "col-ws-subhead", "攻略與原文"));
    const indexes = element("div", "col-ws-index-links");
    indexes.append(sourceLink("攻略索引", "/zh-tw/travel"), sourceLink("原文索引", "/zh-tw/posts"));
    header.append(indexes);

    const controls = element("div", "col-ws-library-controls");
    const region = element("select");
    region.setAttribute("aria-label", "依地區篩選攻略與原文");
    const kind = element("select");
    kind.setAttribute("aria-label", "依內容類型篩選");
    kind.append(option("", "全部類型"), option("guide", "攻略"), option("post", "原文"));
    controls.append(region, kind);
    const note = element("p", "col-ws-meta");
    note.setAttribute("role", "status");
    const list = element("ul", "col-ws-publication-list");
    const retry = element("button", "col-ws-cancel", "重新載入");
    const more = element("button", "col-ws-cancel", "顯示更多");
    more.type = retry.type = "button";
    shelf.append(header, controls, note, list, retry, more);
    let entries = [];
    let cities = null;
    let phase = "loading";
    let limit = 6;
    function draw() {
      const scope = cities ? entries.filter(row => cities.has(row.city)) : entries;
      const regions = [...new Set(scope.map(row => row.region).filter(Boolean))];
      const previous = region.value;
      region.replaceChildren(option("", "全部地區"), ...regions.map(r => option(r, r)));
      region.value = regions.includes(previous) ? previous : "";
      controls.hidden = !scope.length;
      region.hidden = regions.length < 2;
      retry.hidden = phase !== "error";
      const matches = scope.filter(row => (!region.value || row.region === region.value) && (!kind.value || row.kind === kind.value));
      list.replaceChildren(...matches.slice(0, limit).map(row => {
        const item = element("li");
        const meta = [row.city || row.region, row.kind === "guide" ? "攻略" : "原文", row.displayDate || row.date].filter(Boolean).join(" · ");
        item.append(element("small", "col-ws-meta", meta), sourceLink(row.title, row.href));
        return item;
      }));
      more.hidden = matches.length <= limit;
      note.textContent = phase === "loading" ? "載入中…" : phase === "error" ? "暫時無法載入攻略與原文。" :
        !matches.length ? "目前沒有符合的文章。" : "";
      note.hidden = !note.textContent;
    }
    function reload() {
      phase = "loading";
      draw();
      loadLibrary().then(rows => {
        if (!shelf.isConnected) return;
        entries = rows;
        phase = "ready";
        draw();
      }, () => {
        if (!shelf.isConnected) return;
        phase = "error";
        draw();
      });
    }
    region.onchange = kind.onchange = () => { limit = 6; draw(); };
    more.onclick = () => {
      const previous = list.children.length;
      limit += 6;
      draw();
      list.children[previous]?.querySelector("a")?.focus({ preventScroll: true });
    };
    retry.onclick = reload;
    return {
      shelf,
      load: reload,
      scope(nextCities) {
        cities = nextCities;
        limit = 6;
        draw();
      },
    };
  }

  function guidesFor(places) {
    const guides = new Map();
    for (const place of places) {
      const url = place.url && webUrl(place.url, document.baseURI);
      if (!url) continue;
      const title = place.article || place.name;
      const articleUrl = new URL(url.href);
      articleUrl.hash = "";
      if (url.origin === location.origin && url.pathname.endsWith("/shanghai.html")) {
        articleUrl.searchParams.delete("place");
        articleUrl.searchParams.delete("from");
      }
      const groupKey = JSON.stringify([place.city, title, articleUrl.href]);
      if (!guides.has(groupKey)) {
        guides.set(groupKey, { title, city: place.city || noCity, url: url.href, image: place.image, places: [] });
      }
      guides.get(groupKey).places.push(place);
    }
    return Array.from(guides.values());
  }

  window.renderSavvyCollection = function renderSavvyCollection(root, api) {
    const guides = guidesFor(api.places);
    const byId = new Map(api.places.map(place => [place.id, place]));
    const id = location.hash.split("?")[0].split("/")[1] || "all";
    const all = { id: "all", name: "全部收藏" };
    const lists = readLists();
    const current = [all, ...cityLists, ...lists].find(list => list.id === id) || all;
    const isCustom = Array.isArray(current.places);
    let saved = savedLinks();
    const contains = (record, list) => list.id === "all" || (list.city ? record.city === list.city : record.collectionId === list.id);
    const inPlaceList = (place, list) => list.id === "all" || (list.city ? place.city === list.city :
      list.places.includes(place.id) || saved.some(item => item.placeId === place.id && contains(item,list)));
    let filter = "";
    const sheet = element("section", "col-ws");
    const header = element("header", "col-ws-header");
    const title = element("h1", "col-ws-title", current.name);
    const intro = element("div", "col-ws-intro");
    intro.append(element("span", "col-ws-kicker", "Collection"), title);
    const cover = element("img", "col-ws-illustration");
    cover.alt = "";
    cover.src = current.art ? "city-bar-assets/" + current.art + "-pocket.webp" : "city-bar-assets/savvy-ink-landmarks.webp";
    if (current.art) cover.classList.add("col-ws-city-art");
    header.append(cover);
    const toggle = element("button", "col-ws-add", "＋ 收藏連結");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "col-ws-add-form");
    toggle.setAttribute("aria-expanded", "false");
    header.append(intro, toggle);

    const form = element("form", "col-ws-form");
    form.id = "col-ws-add-form";
    form.hidden = true;
    form.innerHTML = `
      <label class="col-ws-field col-ws-url">連結網址<input name="url" type="url" required maxlength="3000" inputmode="url" placeholder="https://…" autocomplete="url"></label>
      <label class="col-ws-field">標題（選填）<input name="title" maxlength="160" autocomplete="off"></label>
      <label class="col-ws-field">城市（選填）<input name="city" maxlength="60" list="col-ws-cities" autocomplete="off"></label>
      <datalist id="col-ws-cities"></datalist>
      <label class="col-ws-field col-ws-url">關聯地點（選填）<select name="place"><option value="">不指定地點</option></select></label>
      <label class="col-ws-field col-ws-url">收藏集<select name="collection"></select></label>
      <div class="col-ws-form-actions"><small>儲存在這個瀏覽器</small><button type="button" class="col-ws-cancel">取消</button><button class="col-ws-add" type="submit">儲存</button></div>`;
    const folderControl = form.elements.namedItem("collection");
    folderControl.append(option("", "未歸入收藏集"), ...lists.map(item => option(item.id,item.name)));
    if (isCustom) folderControl.value = current.id;
    const urlInput = form.elements.namedItem("url");
    const placeSelect = form.elements.namedItem("place");
    const cityInput = form.elements.namedItem("city");
    cityInput.value = current.city || "";
    for (const place of api.places) {
      const option = element("option", "", place.city + " · " + place.name);
      option.value = place.id;
      placeSelect.append(option);
    }
    let freeCity = "";
    placeSelect.addEventListener("change", () => {
      const place = byId.get(placeSelect.value);
      if (!cityInput.readOnly) freeCity = cityInput.value;
      cityInput.value = place ? place.city : freeCity;
      cityInput.readOnly = Boolean(place);
    });
    const filters = element("div", "col-ws-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "依城市篩選收藏");
    const status = element("p", "col-ws-status");
    status.setAttribute("role", "status");
    const content = element("div", "col-ws-sections");
    const publications = publicationShelf();

    const rail = element("nav", "col-ws-rail");
    rail.setAttribute("aria-label","收藏集");
    const railHeading = element("h2","col-ws-rail-title","我的收藏集");
    const create = element("button","col-ws-create","＋ 建立收藏集");
    create.type = "button";
    const listForm = element("form","col-ws-list-form");
    listForm.hidden = true;
    listForm.innerHTML = '<label class="col-ws-field">收藏集名稱<input name="name" maxlength="60" required autocomplete="off"></label><div class="col-ws-form-actions"><button class="col-ws-cancel" type="button">取消</button><button class="col-ws-add" type="submit">建立</button></div>';
    const nameInput = listForm.elements.namedItem("name");
    create.setAttribute("aria-expanded","false");
    function closeList() {
      listForm.hidden = true;
      create.setAttribute("aria-expanded","false");
      create.focus();
    }
    create.onclick = () => {
      if (!listForm.hidden) return closeList();
      listForm.hidden = false;
      create.setAttribute("aria-expanded","true");
      nameInput.focus();
    };
    listForm.querySelector(".col-ws-cancel").onclick = closeList;
    nameInput.oninput = () => nameInput.setCustomValidity("");
    listForm.onsubmit = event => {
      event.preventDefault();
      const name = nameInput.value.trim();
      const latest = readLists();
      if (!name || [all,...cityLists,...latest].some(item => item.name === name)) {
        nameInput.setCustomValidity(!name ? "請輸入名稱。" : "已有同名收藏集。");
        return nameInput.reportValidity();
      }
      const next = { id: "list-" + crypto.randomUUID(), name, places: [] };
      try {
        localStorage.setItem(listKey, JSON.stringify([...latest, next]));
        location.hash = collectionUrl(next.id);
      } catch { status.textContent = "無法儲存收藏集。"; }
    };
    const navItems = element("div","col-ws-nav-items");
    function updateRail() {
      navItems.replaceChildren(...[all,...cityLists,...lists].map(list => {
        const link = element("a","col-ws-list-link");
        link.href = collectionUrl(list.id);
        if (list.id === current.id) link.setAttribute("aria-current","page");
        const quantity = api.places.filter(place => inPlaceList(place,list)).length +
          saved.filter(record => contains(record,list)).length;
        link.setAttribute("aria-label", list.name + "，" + quantity + " 個地點與連結");
        link.append(element("span","",list.name),element("small","",String(quantity)));
        return link;
      }));
    }
    rail.append(railHeading, create, listForm, navItems);

    const placeForm = element("form","col-ws-pick");
    if (isCustom) {
      const select = element("select");
      select.setAttribute("aria-label","選擇要加入收藏集的地點");
      const add = element("button","col-ws-cancel","加入地點");
      select.required = true;
      placeForm.append(select,add);
      placeForm.onsubmit = event => {
        event.preventDefault();
        if (!byId.has(select.value)) return;
        const latest = readLists();
        const list = latest.find(item => item.id === current.id);
        if (!list) return;
        list.places = [...new Set([...list.places, select.value])];
        try {
          localStorage.setItem(listKey, JSON.stringify(latest));
          current.places = list.places;
          filter = "";
          render();
          status.textContent = "已加入地點。";
        } catch { status.textContent = "無法儲存地點。"; }
      };
    } else placeForm.hidden = true;

    function guideCard(guide) {
      const card = element("article", "col-ws-card");
      if (guide.image) {
        const image = element("img", "col-ws-cover");
        image.src = guide.image;
        image.alt = "";
        image.loading = "lazy";
        card.append(image);
      }
      const body = element("div", "col-ws-card-body");
      const heading = element("h3", "col-ws-card-title");
      heading.append(sourceLink(guide.title, guide.url));
      const meta = element("p", "col-ws-meta", guide.city + " · " + guide.places.length + " 個地點");
      const list = element("ul", "col-ws-place-list");
      for (const place of guide.places) {
        const li = element("li");
        const link = element("a", "col-ws-place", place.name);
        link.href = api.linkPlace(place.id);
        li.append(link);
        list.append(li);
      }
      body.append(meta, heading, list);
      card.append(body);
      return card;
    }

    function savedRow(record) {
      const li = element("li", "col-ws-saved-row");
      const url = webUrl(record.url);
      const label = element("div", "col-ws-saved-label");
      label.append(sourceLink(record.title, url.href), element("small", "col-ws-meta", record.city + " · " + url.hostname));
      const place = byId.get(record.placeId);
      if (place) {
        const placeLink = element("a", "col-ws-place", place.name);
        placeLink.href = api.linkPlace(place.id);
        label.append(placeLink);
      }
      li.append(label);
      if (lists.length) {
        const move = element("select","col-ws-move");
        move.setAttribute("aria-label","移動「" + record.title + "」到收藏集");
        move.append(option("","未歸入收藏集"),...lists.map(list => option(list.id,list.name)));
        move.value = record.collectionId || "";
        move.onchange = () => {
          const latest = savedLinks();
          const found = latest.find(item => item.url === record.url);
          if (!found) return;
          found.collectionId = move.value;
          try {
            localStorage.setItem(key,JSON.stringify(latest));
            saved = latest;
            filter = "";
            render();
            status.textContent = "已更新連結的收藏集。";
          } catch {
            move.value = record.collectionId || "";
            status.textContent = "無法移動連結。";
          }
        };
        li.append(move);
      }
      return li;
    }

    function render() {
      updateRail();
      const places = api.places.filter(place => inPlaceList(place,current));
      const relevant = guidesFor(places);
      const records = saved.filter(record => contains(record,current));
      const cities = [...new Set([...relevant,...records].map(item => item.city))];
      publications.scope(filter ? new Set([filter]) : current.city ? new Set([current.city]) :
        isCustom ? new Set(cities) : null);
      if (isCustom) {
        const available = api.places.filter(place => !inPlaceList(place,current));
        placeForm.hidden = !available.length;
        placeForm.querySelector("select").replaceChildren(option("","選一個地點"),...available.map(p => option(p.id,p.city + " · " + p.name)));
      }
      filters.hidden = cities.length < 2;
      filters.replaceChildren(...["", ...cities].map(city => {
        const button = element("button", "", city || "全部城市");
        button.type = "button";
        button.setAttribute("aria-pressed", String(filter === city));
        button.addEventListener("click", () => {
          filter = city;
          render();
          filters.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
        });
        return button;
      }));
      form.querySelector("datalist").replaceChildren(...[...new Set([...guides,...saved].map(item => item.city))].filter(city => city !== noCity).map(city => {
        const option = document.createElement("option");
        option.value = city;
        return option;
      }));
      content.replaceChildren();
      const matches = item => !filter || item.city === filter;
      const links = records.filter(matches);
      if (links.length) {
        const heading = element("h2", "col-ws-subhead", "我的連結");
        const list = element("ul", "col-ws-saved");
        list.append(...links.map(savedRow));
        content.append(heading, list);
      }
      const visible = relevant.filter(matches);
      if (visible.length) {
        const heading = element("h2", "col-ws-subhead", "地點攻略");
        const cards = element("div", "col-ws-grid");
        cards.append(...visible.map(guideCard));
        content.append(heading, cards);
      }
      if (!links.length && !visible.length) content.append(element("p", "col-ws-meta", "這裡還沒有收藏。"));
    }

    function closeForm() {
      form.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }

    toggle.addEventListener("click", () => {
      if (!form.hidden) return closeForm();
      form.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      status.textContent = "";
      urlInput.focus();
    });
    form.querySelector(".col-ws-cancel").addEventListener("click", closeForm);
    urlInput.addEventListener("input", () => urlInput.setCustomValidity(""));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const url = webUrl(urlInput.value.trim());
      if (!url) {
        urlInput.setCustomValidity("請輸入有效的 http 或 https 網址。");
        urlInput.reportValidity();
        return;
      }
      const latest = savedLinks();
      if (latest.some(item => item.url === url.href)) {
        urlInput.setCustomValidity("這個網址已經收藏。");
        urlInput.reportValidity();
        return;
      }
      const place = byId.get(placeSelect.value);
      const record = {
        url: url.href,
        title: form.elements.namedItem("title").value.trim() || url.hostname,
        city: place?.city || cityInput.value.trim() || noCity,
        placeId: place?.id || "",
        collectionId: folderControl.value,
      };
      const next = [record, ...latest];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        status.textContent = "瀏覽器無法儲存，請確認儲存空間後再試。";
        return;
      }
      saved = next;
      filter = record.city;
      form.reset();
      if (isCustom) folderControl.value = current.id;
      cityInput.value = current.city || "";
      cityInput.readOnly = false;
      freeCity = "";
      render();
      closeForm();
      status.textContent = "已收藏「" + record.title + "」。";
      if (!contains(record,current)) {
        location.hash = collectionUrl(record.collectionId || "all");
      }
    });

    render();
    const detail = element("div","col-ws-detail");
    detail.append(header, form, status, filters, placeForm, publications.shelf, content);
    sheet.append(rail,detail);
    root.replaceChildren(sheet);
    publications.load();
  };
})();

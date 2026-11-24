(() => {
  const entryPrefix = "savvy.workspace.journey.v1.";
  const bookPrefix = "savvy.workspace.journey-book.v1.";
  let selectedBookId = "";
  let selectedTripId = "";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function readRecords(prefix) {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (item && typeof item === "object") result.push(item);
      } catch { /* Ignore individual unreadable records. */ }
    }
    return result;
  }

  function field(title, control) {
    const node = el("label", "journey-ws-field");
    node.append(el("span", "", title), control);
    return node;
  }

  function button(text, cls, type = "button") {
    const node = el("button", cls, text);
    node.type = type;
    return node;
  }

  function localDate() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  }

  window.renderSavvyJourney = function render(root, api) {
    const { trips, places } = api;
    const placeById = new Map(places.map(place => [place.id, place]));
    const pane = el("section", "journey-ws");
    root.replaceChildren(pane);
    const header = el("header", "journey-ws-header");
    const heading = el("div");
    heading.append(el("h1", "", "Journey"), el("p", "journey-ws-subtitle", "把幾趟行程，寫成一本遊記。"));
    header.append(heading);
    pane.append(header);
    if (!trips.length) {
      const first = el("a", "journey-ws-place", "前往 My Trip 建立行程 →");
      first.href = "#trips";
      pane.append(first);
      return;
    }

    let books;
    try {
      books = readRecords(bookPrefix)
        .filter(book => typeof book.id === "string" && typeof book.title === "string" && Array.isArray(book.tripIds))
        .sort((a, b) => (a.created || 0) - (b.created || 0));
    } catch {
      pane.append(el("p", "journey-ws-empty", "無法讀取此瀏覽器儲存的遊記。"));
      return;
    }
    const book = books.find(item => item.id === selectedBookId);
    const memberTrips = book ? trips.filter(trip => book.tripIds.includes(trip.id)) : trips;
    const create = button("＋ 建立遊記", "journey-ws-secondary");
    header.append(create);
    const editor = el("div", "journey-ws-settings");
    pane.append(editor);

    function showEditor(target) {
      const form = el("form", "journey-ws-editor");
      const name = el("input");
      name.required = true;
      name.maxLength = 80;
      name.value = target?.title || "";
      name.placeholder = "例如：江南散步手記";
      const choices = el("fieldset");
      choices.append(el("legend", "", "收錄行程"));
      for (const item of trips) {
        const label = el("label");
        const check = el("input");
        check.type = "checkbox";
        check.value = item.id;
        check.checked = target?.tripIds.includes(item.id) || false;
        label.append(check, el("span", "", item.title));
        choices.append(label);
      }
      const actions = el("div", "journey-ws-actions");
      const close = button("取消", "journey-ws-secondary");
      close.onclick = () => { editor.replaceChildren(); (target ? edit : create).focus(); };
      const hint = el("span", "journey-ws-hint");
      hint.setAttribute("role", "status");
      actions.append(button("儲存遊記", "journey-ws-save", "submit"), close, hint);
      form.append(el("h2", "", target ? "編輯遊記" : "建立遊記"), field("遊記名稱", name), choices, actions);
      form.onsubmit = event => {
        event.preventDefault();
        const tripIds = Array.from(choices.querySelectorAll("input")).filter(box => box.checked).map(box => box.value);
        if (!name.value.trim() || !tripIds.length) {
          hint.textContent = !name.value.trim() ? "請填寫遊記名稱。" : "請選擇至少一趟行程。";
          return;
        }
        const saved = { id: target?.id || crypto.randomUUID(), title: name.value.trim(), tripIds, created: target?.created || Date.now() };
        try { localStorage.setItem(bookPrefix + saved.id, JSON.stringify(saved)); }
        catch { hint.textContent = "無法儲存遊記，請檢查瀏覽器儲存空間。"; return; }
        selectedBookId = saved.id;
        render(root, api);
        root.querySelector(".journey-ws-shelf [aria-pressed=true]")?.focus();
      };
      editor.replaceChildren(form);
      name.focus();
    }
    create.onclick = () => showEditor(null);
    const shelf = el("nav", "journey-ws-shelf");
    shelf.setAttribute("aria-label", "選擇遊記");
    for (const item of [{ id: "", title: "全部紀錄" }, ...books]) {
      const control = button(item.title, "journey-ws-choice");
      control.setAttribute("aria-pressed", String(item.id === (book?.id || "")));
      control.onclick = () => {
        selectedBookId = item.id;
        render(root, api);
        root.querySelector(".journey-ws-shelf [aria-pressed=true]")?.focus();
      };
      shelf.append(control);
    }
    pane.append(shelf);

    const columns = el("div", "journey-ws-columns");
    const journal = el("section", "journey-ws-journal");
    const cover = el("div", "journey-ws-cover");
    const coverInfo = el("div", "journey-ws-cover-info");
    coverInfo.append(el("h2", "", book?.title || "旅行手記"));
    const index = el("div", "journey-ws-index");
    for (const trip of memberTrips) {
      const link = el("a", "", trip.title);
      link.href = "#trip/" + encodeURIComponent(trip.id);
      index.append(link);
    }
    const edit = button("編輯遊記", "journey-ws-edit");
    if (book) { edit.onclick = () => showEditor(book); coverInfo.append(edit); }
    coverInfo.append(index);
    cover.append(coverInfo);
    const feed = el("div", "journey-ws-feed");
    journal.append(cover, feed);
    columns.append(journal);
    pane.append(columns);

    function renderEntries() {
      let entries;
      try {
        entries = memberTrips.flatMap(trip =>
          readRecords(entryPrefix + encodeURIComponent(trip.id) + "/")
            .filter(row => typeof row.body === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && (!book || !row.bookId || row.bookId === book.id))
            .map(row => ({ ...row, trip }))
        ).sort((a, b) => a.date.localeCompare(b.date) || (a.created || 0) - (b.created || 0));
      } catch {
        feed.replaceChildren(el("p", "journey-ws-empty", "無法讀取旅途紀錄。"));
        return;
      }
      feed.replaceChildren(el("h3", "", "旅途紀錄"));
      if (!entries.length) {
        feed.append(el("p", "journey-ws-empty", "還沒有紀錄。選一個行程中的地點，寫下第一則見聞。"));
        return;
      }
      let lastDate;
      for (const row of entries) {
        if (row.date !== lastDate) {
          const day = el("h4", "journey-ws-day");
          const time = el("time", "", row.date.replaceAll("-", " / "));
          time.dateTime = lastDate = row.date;
          day.append(time);
          feed.append(day);
        }
        const entry = el("article", "journey-ws-entry");
        entry.append(el("small", "", row.trip.title));
        const place = placeById.get(row.placeId);
        if (place) {
          const link = el("a", "journey-ws-place", place.name);
          link.href = api.linkPlace(place.id);
          entry.append(link);
        }
        entry.append(el("p", "", row.body));
        if (place?.url) {
          const guide = el("a", "journey-ws-source", (place.article || "閱讀攻略") + " ↗");
          guide.href = place.url;
          entry.append(guide);
        }
        feed.append(entry);
      }
    }
    renderEntries();

    const form = el("form", "journey-ws-composer");
    form.append(el("h2", "", "寫一則紀錄"));
    const tripSelect = el("select");
    memberTrips.forEach(trip => tripSelect.add(new Option(trip.title, trip.id)));
    tripSelect.value = memberTrips.find(trip => trip.id === selectedTripId)?.id || memberTrips[0]?.id || "";
    form.append(field("行程", tripSelect));
    const fields = el("div", "journey-ws-fields");
    const date = el("input");
    date.type = "date";
    date.required = true;
    date.value = localDate();
    const location = el("select");
    location.required = true;
    fields.append(field("日期", date), field("行程地點", location));
    const body = el("textarea");
    body.required = true;
    body.maxLength = 3000;
    body.rows = 5;
    body.placeholder = "在這裡發現了什麼？";
    body.oninput = () => body.setCustomValidity("");
    const save = button("儲存紀錄", "journey-ws-save", "submit");
    const hint = el("p", "journey-ws-hint");
    hint.setAttribute("role", "status");
    form.append(fields, field("旅途見聞", body), save, hint);
    columns.append(form);
    function updatePlaces() {
      selectedTripId = tripSelect.value;
      const trip = memberTrips.find(item => item.id === selectedTripId);
      const tripPlaces = [...new Set(trip?.days.flat() || [])].map(id => placeById.get(id)).filter(Boolean);
      location.replaceChildren(...tripPlaces.map(place => new Option(place.name, place.id)));
      save.disabled = !tripPlaces.length;
      hint.textContent = tripPlaces.length ? "紀錄儲存在此瀏覽器。" : "先在行程中加入地點。";
    }
    tripSelect.onchange = updatePlaces;
    updatePlaces();
    form.onsubmit = event => {
      event.preventDefault();
      if (!body.value.trim()) body.setCustomValidity("請寫下旅途見聞。");
      if (save.disabled || !form.reportValidity()) return;
      const row = { date: date.value, placeId: location.value, body: body.value.trim(), created: Date.now() };
      if (book) row.bookId = book.id;
      try {
        localStorage.setItem(entryPrefix + encodeURIComponent(tripSelect.value) + "/" + crypto.randomUUID(), JSON.stringify(row));
      } catch {
        hint.textContent = "儲存失敗，請檢查瀏覽器儲存空間或權限。";
        return;
      }
      body.value = "";
      hint.textContent = "已儲存至此瀏覽器。";
      renderEntries();
    };
  };
})();

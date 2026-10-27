import {
  PRICE_PENDING_LABEL,
  formatMd,
  isNewDate,
  priceIsEstimate,
  priceIsPending,
  resolveClock,
  type MetroData,
  type MetroStation,
  type MetroStore,
} from "../../lib/metro";

export const MOTION = {
  badge: [0.46, 0.61] as const,
  cardOpen: [0.46, 0.74] as const,
  cardClose: [0.51, 0.86] as const,
  camera: [1.05, 0.76] as const,
};

const PLAT: Record<string, [string, string]> = {
  ig: ["IG", "IG 貼文"],
  threads: ["Th", "Threads 貼文"],
  xhs: ["小", "小紅書 筆記"],
};

const WB = { x: -150, y: -170, w: 1000, h: 940 };
const R = 1.4;
const MIN_VIEW = 8;
const PAN_SLOP = 6;

export type SavvyMapState = {
  openId: string | null;
  showing: string | null;
  closing: boolean;
  camX: number;
  camY: number;
  camS: number;
  s0: number;
  viewW: number;
  viewH: number;
  worldTransform: string;
  reduced: boolean;
  clock: string;
  weekCount: number;
};

export type SavvyMapApi = {
  select: (id: string) => void;
  closeCard: (opts?: { focus?: boolean }) => void;
  goHome: () => void;
  state: () => SavvyMapState;
  applySize: () => void;
  setClock: (ymd: string) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    __savvyMap?: SavvyMapApi;
  }
}

class Spring {
  x: number;
  v = 0;
  t: number;
  eps: number;
  k = 1;
  c = 1;
  constructor(x: number, cfg: readonly [number, number], eps = 0.002) {
    this.x = x;
    this.t = x;
    this.eps = eps;
    this.cfg(cfg);
  }
  cfg([r, z]: readonly [number, number]) {
    const w = (2 * Math.PI) / r;
    this.k = w * w;
    this.c = 2 * z * w;
  }
  snapTo(t: number) {
    this.x = this.t = t;
    this.v = 0;
  }
  get done() {
    return Math.abs(this.x - this.t) < this.eps && Math.abs(this.v) < this.eps * 4;
  }
  step(dt: number) {
    const n = Math.ceil(dt / 0.004);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.t - this.x) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
}

type Pin = {
  id: string;
  x: number;
  y: number;
  el: HTMLButtonElement;
  inn: HTMLElement;
  lab: HTMLElement;
  soon: boolean;
  nw: boolean;
  pop: Spring;
  b: Spring;
  badge: boolean;
  timer: number;
  sx: number;
  sy: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function publicImage(path: string) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function bindImgFallback(root: ParentNode) {
  root.querySelectorAll("img").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.style.visibility = "hidden";
        const wrap = img.parentElement;
        if (wrap) wrap.classList.add("img-miss");
        const pin = img.closest(".pin");
        if (pin) pin.classList.add("nophoto");
      },
      { once: true },
    );
  });
}

export function bootMetroMap(root: HTMLElement, data: MetroData): SavvyMapApi {
  const q = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
  const still = q.has("still");
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = mq.matches || q.has("reduce");
  let clock = resolveClock(q);
  document.body.classList.toggle("rm", reduce);
  document.body.classList.toggle("still", still);

  const springs: Spring[] = [];
  const mk = (x: number, cfg: readonly [number, number], eps?: number) => {
    const s = new Spring(x, cfg, eps);
    springs.push(s);
    return s;
  };

  let raf = 0;
  let last = 0;
  const kick = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const to = (spring: Spring, t: number, cfg?: readonly [number, number]) => {
    if (cfg) spring.cfg(cfg);
    spring.t = t;
    if (reduce || still) {
      spring.x = t;
      spring.v = 0;
    }
    kick();
  };

  const vp = root.querySelector<HTMLElement>("#vp")!;
  const world = root.querySelector<HTMLElement>("#world")!;
  const layer = root.querySelector<HTMLElement>("#pinlayer")!;
  const card = root.querySelector<HTMLElement>("#card")!;
  const cbody = root.querySelector<HTMLElement>("#cbody")!;
  const cmorph = root.querySelector<HTMLElement>("#cmorph")!;
  const hint = root.querySelector<HTMLElement>("#hint")!;
  const resetBtn = root.querySelector<HTMLButtonElement>("#reset")!;
  const zoomIn = root.querySelector<HTMLButtonElement>("#zoomIn")!;
  const zoomOut = root.querySelector<HTMLButtonElement>("#zoomOut")!;
  const stampA = root.querySelector<HTMLElement>("#stampA")!;
  const stampB = root.querySelector<HTMLElement>("#stampB")!;
  const strip = root.querySelector<HTMLElement>("#strip")!;
  const stdots = root.querySelector<SVGElement>("#stdots");

  world.style.width = `${WB.w * R}px`;
  world.style.height = `${WB.h * R}px`;

  let W = 552;
  let H = 380;
  let s0 = 0.86;
  let mobile = false;
  let home = { x: 322, y: 175, s: 0.86 };
  const cam = {
    x: mk(322, MOTION.camera, 0.02),
    y: mk(175, MOTION.camera, 0.02),
    s: mk(0.86, MOTION.camera, 0.0004),
  };

  const clampCam = (x: number, y: number, s: number) => {
    const hw = W / 2 / s;
    const hh = H / 2 / s;
    return {
      x: Math.min(WB.x + WB.w - hw, Math.max(WB.x + hw, x)),
      y: Math.min(WB.y + WB.h - hh, Math.max(WB.y + hh, y)),
      s,
    };
  };

  const measure = () => {
    const w = vp.clientWidth;
    const h = vp.clientHeight;
    if (w < MIN_VIEW || h < MIN_VIEW) return false;
    W = w;
    H = h;
    mobile = W < 520;
    s0 = mobile ? W / 580 : Math.min(W / 630, H / 440);
    home = clampCam(mobile ? 325 : 322, mobile ? 228 : 175, s0);
    return true;
  };

  const stations = data.stations.slice().sort((a, b) => a.order - b.order);
  const storesOf = (id: string) => data.stores.filter((s) => s.stationId === id);

  const pinById: Record<string, Pin> = {};
  let pins: Pin[] = [];

  const weekCountNow = () => data.stores.filter((s) => isNewDate(s.addedAt, clock)).length;

  const paintStamp = () => {
    const n = weekCountNow();
    stampA.textContent = n > 0 ? `本週新增 ${n} 家` : "";
    const latest = data.stations
      .map((s) => s.updatedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop();
    stampB.textContent = latest ? `更新於 ${formatMd(latest)}` : "";
  };

  const focusFor = (id: string) => {
    const p = pinById[id];
    const s = s0 * (mobile ? 1.45 : 1.5);
    const ty = mobile ? 0.25 : 0.82;
    return clampCam(p.x, p.y - ((ty * H - H / 2) / s), s);
  };

  const updateBadges = () => {
    const ratio = cam.s.t / s0;
    pins.forEach((p) => {
      const want = p.badge ? ratio > 1.18 : ratio > 1.28;
      if (want === p.badge) return;
      p.badge = want;
      window.clearTimeout(p.timer);
      const d = Math.hypot((p.x - cam.x.t) * cam.s.t, (p.y - cam.y.t) * cam.s.t);
      const delay = reduce || still ? 0 : Math.min(120, Math.round(d / 100) * 40);
      p.timer = window.setTimeout(() => to(p.b, want ? 1 : 0, want ? MOTION.badge : MOTION.cardClose), delay);
    });
  };

  function buildPins() {
    layer.replaceChildren();
    let dots = "";
    let caps = "";
    pins = stations.map((s) => {
      const [x, y] = s.mapPos.snapped ?? s.mapPos.at;
      const soon = s.status === "coming_soon";
      const list = storesOf(s.id);
      const img = list[0]?.image ? publicImage(list[0].image) : "";
      const nw = !soon && isNewDate(s.updatedAt, clock);
      dots += `<circle cx="${x}" cy="${y}" r="7.5" fill="${soon ? "#fff9eb" : "#fff"}" stroke="${soon ? "#8d857a" : "#2f2e23"}" stroke-width="2.6" ${soon ? 'stroke-dasharray="3 3"' : ""} filter="url(#wobS)"/>`;
      caps += `<text x="${x}" y="${y + 27}" text-anchor="middle" font-family="Iansui" font-size="15" fill="${soon ? "#8d857a" : "#2f2e23"}" stroke="#fff9eb" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round">${escapeHtml(s.name)}</text>`;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `pin ${soon ? "soon " : ""}${nw ? "new " : ""}${!soon && !img ? "nophoto" : ""}`;
      el.dataset.id = s.id;
      el.setAttribute("data-testid", `metro-pin-${s.id}`);
      el.setAttribute(
        "aria-label",
        soon
          ? `${s.name}，即將更新`
          : `${s.name}，更新於 ${formatMd(s.updatedAt ?? "")}，共 ${list.length} 間${nw ? "，新增" : ""}`,
      );
      el.innerHTML = `<span class="gr"></span><span class="hit"></span><span class="pin-in"><span class="ph">${soon ? "?" : img ? `<img src="${img}" alt="" width="60" height="60" loading="lazy" decoding="async" fetchpriority="low">` : ""}</span><i class="tl"></i>${nw ? '<span class="nwd"></span>' : ""}<span class="lab">${soon ? "即將更新" : `${nw ? "<em>NEW</em>" : ""}${list.length} 間`}</span></span>`;
      layer.appendChild(el);
      bindImgFallback(el);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (suppressClick && isPointerOriginatedClick(e)) return;
        suppressClick = false;
        select(s.id);
      });
      const p: Pin = {
        id: s.id,
        x,
        y,
        el,
        inn: el.querySelector(".pin-in")!,
        lab: el.querySelector(".lab")!,
        soon,
        nw,
        pop: mk(0, MOTION.badge, 0.002),
        b: mk(0, MOTION.badge, 0.002),
        badge: false,
        timer: 0,
        sx: 0,
        sy: 0,
      };
      pinById[s.id] = p;
      return p;
    });
    if (stdots) stdots.innerHTML = dots + caps;
  }

  let openId: string | null = null;
  let showing: string | null = null;
  let storeIdx = 0;
  let closing = false;
  let suppressClick = false;
  const cardP = mk(0, MOTION.cardOpen, 0.002);
  const dragY = mk(0, MOTION.cardClose, 0.3);
  let cw = 340;
  let ch = 250;

  const chip = (p: MetroStore["sourcePosts"][number]) => {
    const [ab, lab] = PLAT[p.platform] ?? ["·", "貼文"];
    return `<a class="src" data-platform="${escapeHtml(p.platform)}" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer"><b>${ab}</b>${lab} · ${formatMd(p.date)}<u>↗</u></a>`;
  };
  const chips = (posts: MetroStore["sourcePosts"]) => {
    if (!posts.length) return `<span class="src pending">貼文即將發布</span>`;
    return `<div class="srcrow">${posts.map(chip).join("")}</div>`;
  };
  const walk = (s: MetroStore) => `${s.exit ? `${s.exit} · ` : ""}步行約 ${s.exitWalkMin} 分`;
  const price = (s: MetroStore) => {
    if (priceIsPending(s)) {
      return `<span class="est" data-testid="price-pending">${PRICE_PENDING_LABEL}</span>`;
    }
    return `<span class="price"><small>NT$</small>${s.priceNT}${s.priceFrom ? "<em>起</em>" : ""}</span>${
      priceIsEstimate(s) ? '<span class="est" title="價格未經查證">示意</span>' : '<span class="ok">已查證</span>'
    }`;
  };
  const fcard = (s: MetroStore) => {
    const img = publicImage(s.image);
    return `<article class="fc"><div class="ph">${
      img
        ? `<img src="${img}" alt="${escapeHtml(s.dish)}（AI 示意圖）" width="104" height="118" loading="lazy" decoding="async" fetchpriority="low">`
        : ""
    }${isNewDate(s.addedAt, clock) ? '<span class="newtag mini">NEW</span>' : ""}</div>
<div class="bd"><h4>${escapeHtml(s.name)}</h4><p class="dish">${escapeHtml(s.dish)}</p><div class="meta">${price(s)}<span>${escapeHtml(s.area)}</span></div><div class="walk"><svg viewBox="0 0 14 14" fill="none" stroke="#62594f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="2.4" r="1.4"/><path d="M8 4.5 L6.5 8 L8.5 10 L8 13 M6.5 8 L4.5 9 M8 5.5 L10 7 M6.5 8 L5.5 13"/></svg>${walk(s)}</div></div>${chips(s.sourcePosts)}</article>`;
  };

  function fillCard(id: string) {
    const s = stations.find((x) => x.id === id) as MetroStation;
    const list = storesOf(id);
    const nw = !!(s.updatedAt && isNewDate(s.updatedAt, clock));
    if (s.status === "coming_soon") {
      cbody.innerHTML = `<div class="ph-head"><h3 id="cardTitle">${escapeHtml(s.name)}<small>第 ${s.order} 站</small></h3><span class="soontag">即將更新</span></div><div class="soonbody"><svg viewBox="-20 -46 40 50" width="34" height="42" fill="none" stroke="#8d857a" stroke-width="2.4" stroke-dasharray="3.5 4.5" stroke-linecap="round"><path d="M0 0 C-5 -9 -16 -19 -16 -31 a16 16 0 1 1 32 0 C16 -19 5 -9 0 0Z"/></svg><p><b>這一站的貼文還沒發。</b>貼文發出後，店家會自動長到這張地圖上。</p></div>`;
      cmorph.style.backgroundImage = "none";
      return;
    }
    const firstImg = list[0]?.image ? publicImage(list[0].image) : "";
    cmorph.style.backgroundImage = firstImg ? `url(${firstImg})` : "none";
    cbody.innerHTML = `<div class="ph-head"><h3 id="cardTitle">${escapeHtml(s.name)}<small>第 ${s.order} 站 · ${escapeHtml(s.line)}</small></h3>${nw ? '<span class="newtag">NEW</span>' : ""}<span class="upd">更新於 ${formatMd(s.updatedAt ?? "")} · 共 ${list.length} 間</span></div>
 <div id="fcslot">${fcard(list[0])}</div>
 <div class="thumbs" role="group" aria-label="這一站的店家">${list
   .map(
     (x, i) =>
       `<button type="button" data-i="${i}" aria-label="${escapeHtml(x.name)}" aria-current="${i === 0}" style="${x.image ? `background-image:url(${publicImage(x.image)})` : ""}"></button>`,
   )
   .join("")}<span class="more">看全部 ${list.length} 間</span></div>
 <div class="cfoot">菜圖為 AI 示意，非店家實拍。價格為示意。</div>`;
    bindImgFallback(cbody);
    cbody.querySelectorAll<HTMLButtonElement>(".thumbs button").forEach((b) =>
      b.addEventListener("click", () => {
        const i = Number(b.dataset.i);
        if (i === storeIdx) return;
        storeIdx = i;
        cbody.querySelectorAll<HTMLButtonElement>(".thumbs button").forEach((x) =>
          x.setAttribute("aria-current", String(x === b)),
        );
        const slot = cbody.querySelector("#fcslot")!;
        const fc = slot.firstElementChild;
        fc?.classList.add("sw");
        window.setTimeout(
          () => {
            slot.innerHTML = fcard(list[i]);
            bindImgFallback(slot);
            sizeCard();
            render();
            const n = slot.firstElementChild;
            n?.classList.add("sw");
            requestAnimationFrame(() => n?.classList.remove("sw"));
          },
          reduce ? 0 : 150,
        );
      }),
    );
  }

  function sizeCard() {
    card.style.width = `${mobile ? W - 22 : Math.min(380, W - 22)}px`;
    card.style.maxHeight = `${H - 22}px`;
    ch = card.offsetHeight;
    cw = card.offsetWidth;
  }

  function openCard(id: string) {
    openId = id;
    showing = id;
    storeIdx = 0;
    closing = false;
    fillCard(id);
    const pn = pinById[id];
    pn.el.classList.add("sel");
    pn.el.classList.toggle("desk", !mobile);
    card.hidden = false;
    root.classList.add("card-open");
    cbody.scrollTop = 0;
    sizeCard();
    dragY.snapTo(0);
    if (reduce || still) {
      cardP.snapTo(1);
      card.classList.add("rm");
      requestAnimationFrame(() => card.classList.add("show"));
    } else {
      card.classList.remove("rm", "show");
      cardP.snapTo(0);
      to(cardP, 1, MOTION.cardOpen);
    }
    render();
    syncTabs();
    if (!still)
      window.setTimeout(() => {
        try {
          card.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }, 60);
  }

  function finishClose(id: string, focus = true) {
    closing = false;
    showing = null;
    card.hidden = true;
    root.classList.remove("card-open");
    card.classList.remove("rm", "show");
    const pn = pinById[id];
    pn.el.classList.remove("sel", "desk");
    if (!reduce && !still) {
      pn.pop.snapTo(0.82);
      to(pn.pop, 1, MOTION.badge);
    }
    if (focus && !still) {
      try {
        pn.el.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
    render();
  }

  function closeCard({ focus = true, preservePending = false }: { focus?: boolean; preservePending?: boolean } = {}) {
    if (!preservePending) cancelPendingSelection();
    if (!showing || closing) return;
    closing = true;
    const id = showing;
    openId = null;
    syncTabs();
    if (reduce || still) {
      card.classList.remove("show");
      window.setTimeout(() => finishClose(id, focus), reduce ? 250 : 0);
      cardP.snapTo(0);
      dragY.snapTo(0);
      render();
      return;
    }
    to(cardP, 0, MOTION.cardClose);
    to(dragY, 0, MOTION.cardClose);
    kick();
    const wait = () => {
      if (cardP.done && closing) finishClose(id, focus);
      else if (closing) requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }

  let pendingId: string | null = null;
  let selectionTimer: number | undefined;
  let flightTimer: number | undefined;

  function cancelPendingSelection() {
    pendingId = null;
    window.clearTimeout(selectionTimer);
  }

  function flyTo(f: { x: number; y: number; s: number }, now: boolean) {
    window.clearTimeout(flightTimer);
    const go = () => {
      to(cam.x, f.x, MOTION.camera);
      to(cam.y, f.y, MOTION.camera);
      to(cam.s, f.s, MOTION.camera);
      updateBadges();
      kick();
    };
    if (now || reduce || still) go();
    else flightTimer = window.setTimeout(go, 50);
  }

  function hideHint() {
    hint.classList.add("gone");
  }

  function select(id: string) {
    cancelPan();
    cancelPendingSelection();
    if (openId === id) {
      closeCard();
      return;
    }
    hideHint();
    pendingId = id;
    const f = focusFor(id);
    if (showing) {
      const old = showing;
      if (!closing) closeCard({ focus: false, preservePending: true });
      flyTo(f, true);
      selectionTimer = window.setTimeout(() => {
        if (pendingId !== id) return;
        if (showing) {
          closing = false;
          cardP.snapTo(0);
          dragY.snapTo(0);
          finishClose(old, false);
        }
        openCard(id);
      }, reduce ? 320 : 170);
      return;
    }
    openCard(id);
    flyTo(f, false);
  }

  function goHome() {
    cancelPan();
    suppressClick = false;
    cancelPendingSelection();
    hideHint();
    if (showing) closeCard({ focus: false });
    flyTo(home, true);
  }

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  function render() {
    const s = cam.s.x;
    const cx = cam.x.x;
    const cy = cam.y.x;
    const worldTransform = `translate3d(${W / 2 - (cx - WB.x) * s}px,${H / 2 - (cy - WB.y) * s}px,0) scale(${s / R})`;
    world.style.transform = worldTransform;
    pins.forEach((p) => {
      const sx = (p.x - cx) * s + W / 2;
      const sy = (p.y - cy) * s + H / 2;
      p.sx = sx;
      p.sy = sy;
      p.el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
      p.el.style.zIndex = String(Math.round(sy) + 1000);
      const b = p.b.x;
      const d = 44 + 16 * b;
      p.inn.style.setProperty("--d", `${d.toFixed(1)}px`);
      const pop = Math.max(0, p.pop.x);
      p.inn.style.transform = reduce ? "translate(-50%,0)" : `translate(-50%,0) scale(${pop.toFixed(3)})`;
      p.inn.style.opacity = reduce ? String(clamp01(pop * 3)) : "1";
      p.lab.style.transform = `translateX(-50%) scale(${reduce ? (b > 0.5 ? 1 : 0) : Math.max(0, b).toFixed(3)})`;
    });
    const zoomed = cam.s.t > s0 * 1.05;
    const panned = Math.hypot(cam.x.t - home.x, cam.y.t - home.y) > PAN_SLOP;
    resetBtn.classList.toggle("on", zoomed || panned);
    vp.classList.toggle("zoomed", zoomed);
    zoomIn.disabled = cam.s.t >= s0 * 3 - 0.0001;
    zoomOut.disabled = cam.s.t <= s0 + 0.0001;
    if (showing && !card.hidden) {
      const pn = pinById[showing];
      const p = cardP.x;
      const r0 = 60 / cw;
      const r0y = 60 / ch;
      const scale = reduce ? 1 : r0 + (1 - r0) * p;
      const scaleY = reduce ? 1 : r0y + (1 - r0y) * p;
      const rr = Math.pow(1 - clamp01(p), 1.6);
      card.style.setProperty("--r", `${(22 + 278 * rr).toFixed(1)}px`);
      card.style.setProperty("--rb", `${(18 + 282 * rr).toFixed(1)}px`);
      cmorph.style.opacity = reduce ? "0" : String(clamp01(1 - (p - 0.05) * 2.4));
      cbody.style.opacity = reduce ? "1" : String(clamp01((p - 0.18) * 2.2));
      const tail = card.querySelector<HTMLElement>(".tail");
      if (tail) tail.style.opacity = reduce ? "1" : String(clamp01((p - 0.6) * 3));
      const dy = dragY.x * (reduce ? 1 : Math.min(1, p * 1.6));
      if (mobile) {
        const left = 11;
        const top = Math.max(11, H - 11 - ch);
        const ox = pn.sx - left;
        const oy = pn.sy - 32 - top;
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.transformOrigin = `${ox}px ${oy}px`;
        card.style.transform = `translate3d(0,${dy}px,0) scale(${scale.toFixed(4)},${scaleY.toFixed(4)})`;
      } else {
        const left = Math.min(W - cw - 11, Math.max(11, pn.sx - cw / 2));
        const top = Math.max(11, Math.min(H - ch - 11, pn.sy - ch - 10));
        const tx = pn.sx - left;
        card.style.setProperty("--tx", `${tx}px`);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.transformOrigin = `${tx}px ${ch + 10 - 32}px`;
        card.style.transform = `translate3d(0,${dy}px,0) scale(${scale.toFixed(4)},${scaleY.toFixed(4)})`;
      }
    }
  }

  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    let busy = false;
    for (const s of springs) {
      if (s.done) {
        s.x = s.t;
        s.v = 0;
      } else {
        s.step(dt);
        if (!s.done) busy = true;
      }
    }
    render();
    if (busy) kick();
  }

  function renderStrip() {
    const order = stations.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    strip.innerHTML = order
      .map((s) => {
        const soon = s.status === "coming_soon";
        const nw = !soon && isNewDate(s.updatedAt, clock);
        return `<button class="tab ${soon ? "soon" : ""}" role="tab" aria-selected="false" data-id="${s.id}" data-testid="metro-tab-${s.id}">${escapeHtml(s.name)}${nw ? '<span class="newtag">NEW</span>' : ""}<i>${soon ? "即將更新" : formatMd(s.updatedAt ?? "")}</i></button>`;
      })
      .join("");
    strip.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) =>
      b.addEventListener("click", () => select(b.dataset.id!)),
    );
  }

  function syncTabs() {
    strip.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.id === openId)),
    );
  }

  function applySize() {
    if (!measure()) return;
    const f = openId ? focusFor(openId) : home;
    cam.x.snapTo(f.x);
    cam.y.snapTo(f.y);
    cam.s.snapTo(f.s);
    cam.x.t = f.x;
    cam.y.t = f.y;
    cam.s.t = f.s;
    if (showing && !card.hidden) {
      sizeCard();
    }
    updateBadges();
    render();
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeCard();
  };
  const isPointerOriginatedClick = (e: Event) => e instanceof MouseEvent && e.detail > 0;
  const onVpClick = (e: MouseEvent) => {
    if (suppressClick && isPointerOriginatedClick(e)) return;
    const t = e.target as Element;
    if (t.closest(".pin, .card, .reset, .mapzoom")) return;
    if (showing && !closing) closeCard({ focus: false });
    else if (cam.s.t > s0 * 1.05) goHome();
  };
  const onReset = (e: MouseEvent) => {
    e.stopPropagation();
    suppressClick = false;
    goHome();
  };
  root.querySelector("#cardX")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeCard();
  });
  window.addEventListener("keydown", onKey);
  vp.addEventListener("click", onVpClick);
  resetBtn.addEventListener("click", onReset);

  type Pan = {
    id: number;
    x0: number;
    y0: number;
    cx: number;
    cy: number;
    claimed: boolean;
    pointerType: string;
  };
  let pan: Pan | null = null;
  const panFromUi = (t: EventTarget | null) => {
    const el = t as Element | null;
    return !el?.closest || Boolean(el.closest(".card, .reset, .mapzoom, a, #cardX"));
  };
  const panMoveOpts: AddEventListenerOptions = { passive: false };
  const unbindPanWin = () => {
    window.removeEventListener("pointermove", onPanMove, panMoveOpts);
    window.removeEventListener("pointerup", onPanUp);
    window.removeEventListener("pointercancel", onPanCancel);
  };
  /** Pin hits take implicit touch capture; their release bubbles to .vp. */
  const isDescendantCaptureLoss = (e: PointerEvent) => e.target !== vp;
  const takeCamera = () => {
    window.clearTimeout(flightTimer);
    cam.x.snapTo(cam.x.x);
    cam.y.snapTo(cam.y.x);
    cam.s.snapTo(cam.s.x);
  };
  function capturePanPointer(id: number) {
    try {
      vp.setPointerCapture(id);
    } catch {
      /* ignore */
    }
  }
  function cancelPan() {
    if (!pan) return;
    if (pan.claimed) vp.classList.remove("is-panning");
    try {
      if (vp.hasPointerCapture(pan.id)) vp.releasePointerCapture(pan.id);
    } catch {
      /* ignore */
    }
    unbindPanWin();
    pan = null;
  }
  const onPanMove = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return;
    const dx = e.clientX - pan.x0;
    const dy = e.clientY - pan.y0;
    if (!pan.claimed) {
      if (Math.hypot(dx, dy) < PAN_SLOP) return;
      const zoomed = cam.s.t > s0 * 1.05;
      // Home view keeps touch-action:pan-y so the page still scrolls.
      // Only claim a touch gesture when it is clearly horizontal; once a
      // station is zoomed, any drag pans (vertical page scroll yields).
      if (pan.pointerType === "touch" && !zoomed && Math.abs(dx) <= Math.abs(dy)) {
        cancelPan();
        return;
      }
      pan.claimed = true;
      suppressClick = true;
      takeCamera();
      pan.cx = cam.x.x;
      pan.cy = cam.y.x;
      hideHint();
      vp.classList.add("is-panning");
      capturePanPointer(pan.id);
    }
    if (e.cancelable) e.preventDefault();
    const s = Math.max(cam.s.x, 0.0001);
    const next = clampCam(pan.cx - dx / s, pan.cy - dy / s, s);
    cam.x.snapTo(next.x);
    cam.y.snapTo(next.y);
    render();
  };
  const onPanUp = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return;
    const claimed = pan.claimed;
    cancelPan();
    if (claimed) window.setTimeout(() => { suppressClick = false; }, 0);
  };
  const onPanCancel = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return;
    // After .vp has capture, a pin's implicit-capture cancel must not end the pan.
    if (pan.claimed && isDescendantCaptureLoss(e)) {
      capturePanPointer(pan.id);
      return;
    }
    cancelPan();
  };
  const onPanLost = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return;
    if (isDescendantCaptureLoss(e)) {
      if (pan.claimed) capturePanPointer(pan.id);
      return;
    }
    vp.classList.remove("is-panning");
    unbindPanWin();
    pan = null;
  };
  const onPanDown = (e: PointerEvent) => {
    if (pinch) return;
    if (e.button !== 0 || e.isPrimary === false) return;
    if (pan) cancelPan();
    suppressClick = false;
    if (panFromUi(e.target)) return;
    window.clearTimeout(flightTimer);
    pan = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      cx: cam.x.x,
      cy: cam.y.x,
      claimed: false,
      pointerType: e.pointerType,
    };
    window.addEventListener("pointermove", onPanMove, panMoveOpts);
    window.addEventListener("pointerup", onPanUp);
    window.addEventListener("pointercancel", onPanCancel);
  };
  const onClickCapture = (e: Event) => {
    if (!suppressClick) return;
    if (!isPointerOriginatedClick(e)) return;
    const t = e.target as Element | null;
    if (t?.closest?.(".reset, .mapzoom, .card, .x, a, .tab")) {
      suppressClick = false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  };
  vp.addEventListener("pointerdown", onPanDown);
  vp.addEventListener("lostpointercapture", onPanLost);
  vp.addEventListener("click", onClickCapture, true);

  // Keep the world point under the cursor / pinch midpoint stationary.
  function zoomAt(scale: number, x: number, y: number, anchor?: { x: number; y: number }) {
    cancelPendingSelection();
    takeCamera();
    const world = anchor ?? {
      x: cam.x.x + (x - W / 2) / cam.s.x,
      y: cam.y.x + (y - H / 2) / cam.s.x,
    };
    const s = Math.max(s0, Math.min(s0 * 3, scale));
    const f = clampCam(world.x - (x - W / 2) / s, world.y - (y - H / 2) / s, s);
    cam.x.snapTo(f.x);
    cam.y.snapTo(f.y);
    cam.s.snapTo(s);
    hideHint();
    updateBadges();
    render();
  }
  const onZoomIn = () => { cancelPan(); zoomAt(cam.s.x * 1.25, W / 2, H / 2); };
  const onZoomOut = () => { cancelPan(); zoomAt(cam.s.x / 1.25, W / 2, H / 2); };
  const onWheel = (e: WheelEvent) => {
    if (panFromUi(e.target) || pinch || !e.deltaY) return;
    e.preventDefault();
    cancelPan();
    const box = vp.getBoundingClientRect();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1);
    zoomAt(cam.s.x * Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.002), e.clientX - box.left - vp.clientLeft, e.clientY - box.top - vp.clientTop);
  };
  type Pinch = { ids: number[]; distance: number; scale: number; anchor: { x: number; y: number } };
  let pinch: Pinch | null = null;
  const onPinchStart = (e: TouchEvent) => {
    if (e.touches.length !== 2 || Array.from(e.touches).some(t => !vp.contains(t.target as Node) || panFromUi(t.target))) return;
    if (e.cancelable) e.preventDefault();
    cancelPan();
    cancelPendingSelection();
    takeCamera();
    suppressClick = true;
    const [a, b] = Array.from(e.touches);
    const box = vp.getBoundingClientRect();
    pinch = {
      ids: [a.identifier, b.identifier],
      distance: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
      scale: cam.s.x,
      anchor: {
        x: cam.x.x + ((a.clientX + b.clientX) / 2 - box.left - vp.clientLeft - W / 2) / cam.s.x,
        y: cam.y.x + ((a.clientY + b.clientY) / 2 - box.top - vp.clientTop - H / 2) / cam.s.x,
      },
    };
  };
  const onPinchMove = (e: TouchEvent) => {
    if (!pinch) return;
    if (e.cancelable) e.preventDefault();
    const [a, b] = pinch.ids.map(id => Array.from(e.touches).find(t => t.identifier === id));
    if (!a || !b) return;
    const box = vp.getBoundingClientRect();
    zoomAt(pinch.scale * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.distance,
      (a.clientX + b.clientX) / 2 - box.left - vp.clientLeft, (a.clientY + b.clientY) / 2 - box.top - vp.clientTop, pinch.anchor);
  };
  const onPinchEnd = (e: TouchEvent) => {
    if (!pinch || Array.from(e.touches).some(t => pinch!.ids.includes(t.identifier))) return;
    pinch = null;
    window.setTimeout(() => { suppressClick = false; }, 0);
  };
  zoomIn.addEventListener("click", onZoomIn);
  zoomOut.addEventListener("click", onZoomOut);
  vp.addEventListener("wheel", onWheel, { passive: false });
  vp.addEventListener("touchstart", onPinchStart, { passive: false });
  vp.addEventListener("touchmove", onPinchMove, { passive: false });
  vp.addEventListener("touchend", onPinchEnd);
  vp.addEventListener("touchcancel", onPinchEnd);

  let drag: { y0: number; dy: number; moved: boolean; vy: number; ly: number; lt: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || closing) return;
    // A tall card owns native scrolling; its separate grab handle still dismisses.
    if (cbody.contains(e.target as Node) && cbody.scrollHeight > cbody.clientHeight) return;
    drag = {
      y0: e.touches[0].clientY,
      dy: 0,
      moved: false,
      vy: 0,
      ly: e.touches[0].clientY,
      lt: performance.now(),
    };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!drag) return;
    const y = e.touches[0].clientY;
    const dy = y - drag.y0;
    if (!drag.moved && Math.abs(dy) < 6) return;
    drag.moved = true;
    if (e.cancelable) e.preventDefault();
    const now = performance.now();
    drag.vy = (y - drag.ly) / Math.max(1, now - drag.lt);
    drag.ly = y;
    drag.lt = now;
    drag.dy = dy > 0 ? dy : dy / 4;
    dragY.snapTo(drag.dy);
    dragY.cfg(MOTION.cardClose);
    render();
  };
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    if (d.dy > 60 || d.vy > 0.6) closeCard({ focus: false });
    else {
      to(dragY, 0, MOTION.cardOpen);
      kick();
    }
  };
  card.addEventListener("touchstart", onTouchStart, { passive: true });
  card.addEventListener("touchmove", onTouchMove, { passive: false });
  card.addEventListener("touchend", endDrag);
  card.addEventListener("touchcancel", endDrag);

  const onMouseDown = (e: MouseEvent) => {
    if ((e.target as Element).closest("button,a")) return;
    if (cbody.contains(e.target as Node) && cbody.scrollHeight > cbody.clientHeight) return;
    const y0 = e.clientY;
    let moved = false;
    const mv = (ev: MouseEvent) => {
      const dy = ev.clientY - y0;
      if (Math.abs(dy) > 6) moved = true;
      if (moved) {
        dragY.snapTo(dy > 0 ? dy : dy / 4);
        render();
      }
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
      if (!moved) return;
      const dy = ev.clientY - y0;
      if (dy > 60) closeCard({ focus: false });
      else {
        to(dragY, 0, MOTION.cardOpen);
        kick();
      }
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };
  card.addEventListener("mousedown", onMouseDown);

  const onMq = (e: MediaQueryListEvent) => {
    reduce = e.matches || q.has("reduce");
    document.body.classList.toggle("rm", reduce);
  };
  mq.addEventListener("change", onMq);

  const ro = new ResizeObserver(() => {
    if (vp.clientWidth !== W || vp.clientHeight !== H) applySize();
    else if (!card.hidden && (card.offsetHeight !== ch || card.offsetWidth !== cw)) {
      sizeCard();
      render();
    }
  });
  ro.observe(vp);
  ro.observe(card);
  const onWinResize = () => applySize();
  const onOrient = () => applySize();
  window.addEventListener("resize", onWinResize);
  window.addEventListener("orientationchange", onOrient);

  paintStamp();
  renderStrip();
  buildPins();
  applySize();

  let introDone = false;
  const intro = () => {
    pins.forEach((p, i) => {
      if (still || reduce) p.pop.snapTo(1);
      else window.setTimeout(() => to(p.pop, 1, MOTION.badge), 160 * i + 120);
    });
    kick();
  };
  const startIntro = () => {
    if (introDone) return;
    introDone = true;
    intro();
  };

  let io: IntersectionObserver | null = null;
  if (still) {
    pins.forEach((p) => p.pop.snapTo(1));
    introDone = true;
    const sel0 = q.get("sel");
    if (sel0 && pinById[sel0]) {
      const f = focusFor(sel0);
      cam.x.snapTo(f.x);
      cam.y.snapTo(f.y);
      cam.s.snapTo(f.s);
      cam.x.t = f.x;
      cam.y.t = f.y;
      cam.s.t = f.s;
      updateBadges();
      pins.forEach((p) => p.b.snapTo(p.badge ? 1 : 0));
      openCard(sel0);
      hideHint();
    }
    render();
  } else if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      (en, ob) => {
        if (en.some((e) => e.isIntersecting)) {
          ob.disconnect();
          startIntro();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(vp);
  } else startIntro();

  const api: SavvyMapApi = {
    select,
    closeCard,
    goHome,
    applySize,
    setClock: (ymd: string) => {
      clock = ymd;
      paintStamp();
      const selected = openId;
      const pops = pins.map((p) => p.pop.x);
      buildPins();
      renderStrip();
      pins.forEach((p, i) => p.pop.snapTo(pops[i] ?? 1));
      if (selected) {
        openId = selected;
        showing = selected;
        fillCard(selected);
        pinById[selected]?.el.classList.add("sel");
        syncTabs();
      }
      applySize();
    },
    state: () => ({
      openId,
      showing,
      closing,
      camX: cam.x.x,
      camY: cam.y.x,
      camS: cam.s.x,
      s0,
      viewW: W,
      viewH: H,
      worldTransform: world.style.transform,
      reduced: reduce,
      clock,
      weekCount: weekCountNow(),
    }),
    destroy: () => {
      pinch = null;
      zoomIn.removeEventListener("click", onZoomIn);
      zoomOut.removeEventListener("click", onZoomOut);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("touchstart", onPinchStart);
      vp.removeEventListener("touchmove", onPinchMove);
      vp.removeEventListener("touchend", onPinchEnd);
      vp.removeEventListener("touchcancel", onPinchEnd);
      cancelPan();
      cancelPendingSelection();
      window.clearTimeout(flightTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("orientationchange", onOrient);
      vp.removeEventListener("pointerdown", onPanDown);
      vp.removeEventListener("lostpointercapture", onPanLost);
      vp.removeEventListener("click", onClickCapture, true);
      mq.removeEventListener("change", onMq);
      ro.disconnect();
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (window.__savvyMap === api) delete window.__savvyMap;
    },
  };

  window.__savvyMap = api;
  return api;
}

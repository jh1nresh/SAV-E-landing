// Enrich native controls without changing links, forms or keyboard behavior.
(() => {
  const root = document.documentElement;
  if (root.hasAttribute("data-sakura-static")) {
    const themeKey = "savvy.workspace.theme";
    let theme;
    try { theme = localStorage.getItem(themeKey); } catch {}
    if (theme === "dark") root.dataset.theme = theme;
    window.addEventListener("storage", event => {
      if (event.key === themeKey) root.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    });
  }

  const fx = window.SakugaFX;
  if (!fx) return;

  const controls = [
    ".editorial-tabs a", ".mobile-nav > summary", ".city-switch-item", ".chip",
    ".editorial-theme", ".guide-button", "a.guide-card", ".food-filters button",
    ".food-sources > summary", ".food-search-link", ".sd-trigger", ".sd-option",
    ".download-entry", ".test-list-launch", ".test-list-actions button",
    ".city-nav a", ".tools button", ".key-toggle", ".row", "#notesBtn",
  ].join(",");

  document.addEventListener("click", event => {
    const control = event.target instanceof Element && event.target.closest(controls);
    if (fx.calm || !control || control.matches(":disabled")) return;
    const point = fx.at(control, 0.8, 0);
    fx.ticks(point.x - 6, point.y - 4, { dir: -1.05, n: 3, r: 5, len: 17, fan: 0.36, life: 0.45 });
    if (control.matches(".guide-button, .test-list-launch")) {
      const center = fx.at(control);
      fx.ring(center.x, center.y, { rx: 24, ry: 10, life: 0.36 });
    }
  }, { capture: true, passive: true });

  document.addEventListener("input", event => {
    if (fx.calm || !event.isTrusted || event.isComposing || !event.target.matches?.(".sd-sheet input, .metro-map-page input[type='search']")) return;
    const point = fx.at(event.target, 0.95, 0.25);
    fx.ticks(point.x - 8, point.y + 4, { dir: -1.05, n: 2, r: 3, len: 10, life: 0.27 });
  }, { passive: true });
})();

(() => {
  const page = document.documentElement;
  const screen = document.querySelector('.opening-screen');
  const bar = screen.querySelector('sakuga-progress');
  const fallback = screen.querySelector('progress');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function reveal() {
    page.classList.remove('savvy-opening');
    screen.remove();
  }

  async function prepare() {
    if (!page.classList.contains('savvy-opening')) return reveal();
    if (reduced.matches || document.hidden || !bar.set) return reveal();
    if (page.lang === 'en') {
      bar.setAttribute('label', 'Loading Savvy');
      bar.setAttribute('done-label', 'Ready · 100%');
      fallback.setAttribute('aria-label', 'Loading Savvy');
    }
    bar.set(.01, true);
    // Paint the starting value before any of the readiness milestones advance it.
    await new Promise(resolve => setTimeout(resolve, 140));
    fallback.value = .76;
    bar.set(.76);

    const cover = document.querySelector('.trip-window video[poster], .trip-window img');
    if (cover && !reduced.matches) {
      const image = cover instanceof HTMLImageElement ? cover : new Image();
      if (image !== cover) image.src = cover.poster;
      let timeout;
      await Promise.race([
        image.decode().catch(() => {}),
        new Promise(resolve => { timeout = setTimeout(resolve, 900); })
      ]);
      clearTimeout(timeout);
    }

    if (reduced.matches || document.hidden) return reveal();
    fallback.value = 1;
    const deadline = setTimeout(reveal, 2600);
    bar.addEventListener('sakuga:done', () => {
      clearTimeout(deadline);
      setTimeout(reveal, 160);
    }, { once: true });
    bar.set(1);
  }

  document.addEventListener('DOMContentLoaded', prepare, { once: true });
})();

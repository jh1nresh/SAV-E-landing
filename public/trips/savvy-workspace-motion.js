(() => {
  const page = document.documentElement;
  const themeSwitch = document.querySelector('.theme-switch');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lastDust = -Infinity;

  if (customElements.get('sakuga-toggle')) {
    themeSwitch.checked = page.dataset.theme === 'dark';
  }
  themeSwitch.addEventListener('change', () => {
    page.dataset.theme = themeSwitch.checked ? 'dark' : 'light';
    try {
      localStorage.setItem('savvy.workspace.theme', page.dataset.theme);
    } catch {}
  });
  window.addEventListener('storage', event => {
    if (event.key !== 'savvy.workspace.theme') return;
    page.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light';
    if (customElements.get('sakuga-toggle')) themeSwitch.checked = page.dataset.theme === 'dark';
  });

  const waitlist = document.querySelector('.waitlist-dialog');
  const waitlistForm = waitlist.querySelector('form');
  const waitlistStatus = waitlist.querySelector('[role="status"]');
  let email = waitlistForm.querySelector('#waitlist-email');
  if (customElements.get('sakuga-input')) {
    const field = document.createElement('sakuga-input');
    for (const { name, value } of email.attributes) field.setAttribute(name, value);
    field.className = 'waitlist-email';
    field.setAttribute('label', 'Email');
    email.replaceWith(field);
    email = field;
  }

  // A modal is above document-level canvases, so put the effects layer in it.
  function placeEffects(target) {
    const canvas = document.querySelector('canvas.sakuga-fx');
    if (canvas && canvas.parentNode !== target) target.append(canvas);
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-open-waitlist]')) return;
    waitlist.showModal();
    email.focus();
    placeEffects(waitlist);
  });
  // Keep native buttons if the optional effects script fails to load.
  function enhanceButton(button, variant) {
    if (!customElements.get('sakuga-button')) return button;
    const effect = document.createElement('sakuga-button');
    for (const { name, value } of button.attributes) effect.setAttribute(name, value);
    effect.setAttribute('variant', variant);
    effect.textContent = button.textContent;
    button.replaceWith(effect);
    return effect;
  }
  const close = enhanceButton(waitlist.querySelector('.waitlist-close'), 'secondary');
  const submit = enhanceButton(waitlistForm.querySelector('[type="submit"]'), 'primary');
  let closeTimer;
  close.addEventListener('click', () => {
    if (reduced.matches || close.localName === 'button') return waitlist.close();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => waitlist.close(), 210);
  });
  const feedback = {
    submitting: ["正在提交報名…", "Submitting your signup…"],
    confirmed: ["已收到報名。開放試用時，我們會寄信通知你。", "You’re on the waitlist. We’ll email you when testing opens."],
    confirmation_pending: ["已收到報名。暫時無法確認寄信結果，你可以稍後重試。", "We received your signup. We couldn’t confirm the email status. You can try again later."],
    confirmation_unknown: ["已收到報名。如果沒收到確認信，請聯絡 Savvy。", "We received your signup. Contact Savvy if you didn’t receive a confirmation email."],
    preview: ["已完成本機測試，沒有寄出 Email。", "Local test complete. No email was sent."],
    invalid: ["請確認 Email 格式後再送出。", "Check your email address and try again."],
    slow_down: ["提交次數過多，請稍候一分鐘再試。", "Too many attempts. Please try again in a minute."],
    unavailable: ["暫時無法完成報名，請稍後再試。", "We couldn’t complete the signup. Please try again later."],
  };
  function report(state) {
    waitlistStatus.textContent = feedback[state][page.lang === 'en' ? 1 : 0];
  }
  waitlistForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    report('submitting');
    try {
      const response = await fetch(waitlistForm.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: new FormData(waitlistForm).get('email') }),
        signal: AbortSignal.timeout(30_000)
      });
      const result = await response.json();
      const state = Object.hasOwn(feedback, result.state) ? result.state : 'unavailable';
      report(state);
      if (state === 'confirmed' || state === 'preview') {
        waitlistForm.reset();
        if (waitlist.open && !reduced.matches) submit.done?.();
      }
    } catch {
      report('unavailable');
    } finally {
      submit.disabled = false;
    }
  });
  waitlist.addEventListener('close', () => {
    clearTimeout(closeTimer);
    placeEffects(document.body);
    if (!submit.disabled) {
      waitlistForm.reset();
      waitlistStatus.textContent = '';
    }
  });
  waitlistForm.addEventListener('input', () => placeEffects(waitlist));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing || !event.target.matches('sakuga-input')) return;
    const form = event.target.closest('.waitlist-form, .ws-form form');
    if (!form) return;
    event.preventDefault();
    if (form === waitlistForm && submit.disabled) return;
    if (form === waitlistForm && email.shadowRoot?.querySelector('input')?.validity.valid && !reduced.matches) submit.impact?.();
    form.requestSubmit();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || waitlist.open) return;
    for (const tip of document.querySelectorAll('.waitlist-tooltip')) tip.hide?.();
  });

  const fx = window.SakugaFX;
  if (!fx) return;

  document.querySelectorAll('.shell-social a').forEach(link => {
    link.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      const { x, y } = fx.at(link, .73, .28);
      fx.kira(x, y, { r: 7, life: .38, col: '#ffe0ed' });
      fx.ticks(x + 5, y - 5, { n: 2, r: 4, len: 6, dir: -.8, life: .25 });
    });
  });

  // Use the Sakuga primary button's impact on existing links and controls.
  function primaryImpact({x, y}, large = false) {
    if (reduced.matches) return;
    const edge = large ? 44 : 28;
    x = fx.clamp(x - scrollX, edge, Math.max(edge, innerWidth - edge)) + scrollX;
    y = fx.clamp(y - scrollY, 18, Math.max(18, innerHeight - 24)) + scrollY;
    const letteringGap = large ? 36 : 26;
    const letteringY = y - scrollY < letteringGap + 25 ? y + letteringGap : y - letteringGap;
    fx.burst(x, y, { r: large ? 29 : 20, spikes: 11, life: .33 });
    fx.shards(x, y, { n: large ? 8 : 5, size: 4, speed: 138, life: .48, arc: Math.PI * 2, grav: 250 });
    fx.puff(x - 13, y + 7, { n: 4, size: 7, vx: -32, vy: -10, life: .48 });
    fx.puff(x + 13, y + 5, { n: 4, size: 6, vx: 31, vy: -12, life: .45 });
    fx.sfx('don', x, letteringY, { size: large ? 84 : 52, life: .6 });
  }
  window.savvyPrimaryImpact = primaryImpact;

  const languageSelect = document.querySelector('#workspace-language');
  languageSelect.addEventListener('pointerdown', () => {
    if (reduced.matches) return;
    const {x, y} = fx.at(languageSelect, .88, .08);
    fx.ticks(x, y - 3, { n: 3, r: 8, len: 9, life: .27 });
    fx.kira(x - 9, y - 5, { r: 6, life: .34 });
  });

  const actionSelector = '.shellbar, #workspace, .shellfoot, .waitlist-dialog';
  const pressAnimations = new WeakMap();
  let linkNavigationTimer;
  document.addEventListener('click', event => {
    if (reduced.matches || !(event.target instanceof Element)) return;
    const control = event.target.closest('button, a[href], summary, [role="button"]');
    if (!control?.closest(actionSelector) || control.matches(':disabled, [aria-disabled="true"]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    clearTimeout(linkNavigationTimer);
    if (control.closest('.workspace-tabs:defined') || event.composedPath().some(node => node.localName === 'sakuga-button')) return;
    const bounds = control.getBoundingClientRect();
    const usePointer = event.detail > 0 && (bounds.width > 200 || bounds.height > 100);
    const x = usePointer ? event.clientX : bounds.left + bounds.width * .67;
    const y = usePointer ? event.clientY : bounds.top + bounds.height * .52;
    const strong = control.matches('.app-download, .trip-create, .trip-spot, .trip-mini, .trip-tools button, .ws-btn, .col-ws-add, .journey-ws-save');
    const paint = () => primaryImpact({ x: x + scrollX, y: y + scrollY }, strong);

    if (bounds.width < 220 && bounds.height < 90 && control.animate && getComputedStyle(control).display !== 'inline') {
      pressAnimations.get(control)?.cancel();
      pressAnimations.set(control, control.animate([
        { scale: '1.04 .84' }, { scale: '1.02 1.09', offset: .55 }, { scale: '1' }
      ], { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' }));
    }

    const href = control.getAttribute('href');
    if (href?.startsWith('#') && href !== location.hash && !control.hasAttribute('target')) {
      // The workspace scrolls to the top on hash navigation. Paint after that scroll.
      const finish = () => {
        clearTimeout(fallback);
        window.removeEventListener('hashchange', finish);
        paint();
      };
      const fallback = setTimeout(finish, 100);
      window.addEventListener('hashchange', finish, { once: true });
    } else {
      paint();
    }

  }, { capture: true });

  document.addEventListener('click', event => {
    if (reduced.matches || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
        !(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]:not([download])');
    if (!link?.closest(actionSelector) || link.closest('.workspace-tabs:defined') ||
        (link.target && link.target !== '_self') || link.getAttribute('href').startsWith('#') ||
        !['https:', 'http:'].includes(link.protocol)) return;
    // Keep the impact visible before a same-tab document navigation.
    event.preventDefault();
    linkNavigationTimer = setTimeout(() => location.assign(link.href), 280);
  });

  const notices = '.col-ws-status, .journey-ws-hint[role="status"]';
  new MutationObserver(records => {
    if (reduced.matches) return;
    const notice = records
      .map(record => record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target)
      .find(target => target?.matches(notices) && target.textContent.trim());
    if (!notice) return;
    const { x, y } = fx.at(notice, .08, .4);
    fx.lines(x - 8, y, { n: 4, len: 20, spread: 7, life: .26 });
    fx.puff(x, y + 8, { n: 3, size: 5, vx: -10, life: .36 });
  }).observe(document.querySelector('#workspace'), { subtree: true, childList: true, characterData: true });

  document.addEventListener('change', event => {
    if (reduced.matches || !event.target.matches('#workspace :is(select, input[type="checkbox"], input[type="radio"], input[type="range"]), #workspace-language')) return;
    primaryImpact(fx.at(event.target, .85, .45));
  }, { capture: true });

  document.addEventListener('input', event => {
    if (reduced.matches || event.isComposing || performance.now() - lastDust < 150 ||
        !event.target.matches('#workspace :is(textarea, input:not([type]), input:is([type="text"], [type="number"], [type="search"], [type="url"]))')) return;
    lastDust = performance.now();
    const { x, y } = fx.at(event.target, 1, .33);
    fx.puff(x - 6, y, { n: 3, size: 3, vx: 9, vy: -13, life: .3 });
  }, { capture: true });
})();

(() => {
  // Seed only the returning visitor's consent flag. Every context is logged out.
  localStorage.setItem('accepted-terms', '1');

  const visible = (element) => element?.checkVisibility({
    opacityProperty: true, visibilityProperty: true
  }) && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
  const text = (element) => element.textContent.trim().replace(/\s+/g, ' ');
  const hasVisibleText = (selector, expected) =>
    Array.from(document.querySelectorAll(selector)).some((element) => visible(element) && text(element) === expected);
  const nav = () => document.querySelector('button[aria-label="Wallet navigation"]');
  const panel = () => document.getElementById(nav()?.getAttribute('aria-controls'));
  const navigationClosed = () => nav()?.getAttribute('aria-expanded') === 'false' && !visible(panel());
  const onImport = () => location.pathname === '/import' && hasVisibleText('h1', 'Import wallet');
  const finished = (menu) =>
    menu.getAnimations({ subtree: true }).every((animation) => animation.playState === 'finished');
  const browseReady = () =>
    Array.from(document.querySelectorAll('input[type="file"]')).some((field) => {
      if (field.disabled || !field.accept.includes('.tez')) return false;
      // Older builds activate the file field through its label. Current builds use a button.
      return Array.from(field.labels).some((label) => visible(label) && text(label) === 'Browse') ||
        Array.from(field.form?.querySelectorAll('button:not([disabled])') ?? [])
          .some((button) => visible(button) && text(button) === 'Browse');
    });
  const seedFormReady = () => {
    const tab = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'))
      .find((element) => visible(element) && text(element) === 'Seed Words');
    const recoveryPanel = tab && document.getElementById(tab.getAttribute('aria-controls'));
    if (tab && !visible(recoveryPanel)) return false;
    if (!tab && !hasVisibleText('.import-options .selected', 'Seed Words')) return false;
    return Array.from((recoveryPanel || document).querySelectorAll('textarea')).some((field) => {
      const labelledRecovery = Array.from(field.labels).some((label) => text(label) === 'Recovery (seed) words');
      return (labelledRecovery || field.placeholder === 'Seed Words (required)') &&
        visible(field) && field.value === '' && !field.readOnly && !field.disabled;
    });
  };

  const ready = {
    cold_home_ms: () => {
      const hero = document.querySelector('#bg-mobile');
      return location.pathname === '/' && visible(nav()) && navigationClosed() &&
        hasVisibleText('h1', 'A Secure Home for your Digital Assets') &&
        hasVisibleText('button', 'CONTINUE WITH GOOGLE') && hero?.complete && hero.naturalWidth > 0;
    },
    warm_menu_ms: () => {
      const menu = panel();
      return nav()?.getAttribute('aria-expanded') === 'true' && visible(menu) && !menu.inert &&
        hasVisibleText('#wallet-navigation-panel a[href="/import"]', 'Import Wallet') && finished(menu);
    },
    warm_import_ms: () => {
      if (!onImport() || !browseReady()) return false;
      if (navigationClosed()) return true;
      const menu = panel();
      if (nav()?.getAttribute('aria-expanded') === 'true' && visible(menu) && finished(menu)) {
        return 'menu-stayed-open';
      }
      return false;
    },
    warm_seed_form_ms: () => onImport() && navigationClosed() && seedFormReady()
  };

  function measure(step, timeOfStart, timeout) {
    return new Promise((resolve) => {
      let frames = 0;
      let previous;
      let request;
      const deadline = setTimeout(() => {
        cancelAnimationFrame(request);
        resolve({ error: 'visible completion timed out' });
      }, timeout);
      function check() {
        const state = ready[step]();
        frames = !state ? 0 : state === previous ? frames + 1 : 1;
        previous = state;
        // The first matching callback precedes paint. Two more give the browser paint opportunities.
        if (frames === 3) {
          clearTimeout(deadline);
          resolve(state === true ? { ms: performance.now() - timeOfStart } : { error: state });
          return;
        }
        request = requestAnimationFrame(check);
      }
      request = requestAnimationFrame(check);
    });
  }

  window.walletBenchmark = {
    // Navigation started at time origin. Register the readiness check before the application loads.
    cold: measure('cold_home_ms', 0, 15000),
    arm(target, step) {
      this.click = new Promise((resolve) => {
        const deadline = setTimeout(() => resolve({ error: 'click timed out' }), 15000);
        target.addEventListener('click', () => {
          const start = performance.now();
          clearTimeout(deadline);
          resolve(measure(step, start, 15000));
        }, { capture: true, once: true });
      });
    }
  };
})();

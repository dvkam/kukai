(() => {
  function visible(element) {
    if (!element?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0 &&
      bounds.top < window.innerHeight && bounds.left < window.innerWidth;
  }
  const settled = (element) => element.getAnimations({ subtree: true })
    .every((animation) => animation.playState === 'finished');
  const short = (address) => address.slice(0, 7) + '...' + address.slice(-4);
  const path = (address) => '/account/' + address;

  function ready(trigger, address, opening, input) {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel || !visible(trigger) || !settled(trigger) || !settled(panel) ||
        location.pathname !== path(address) || !trigger.getAttribute('aria-label')?.endsWith(', ' + address) ||
        trigger.querySelector('.address')?.textContent.trim() !== short(address) ||
        !visible(document.querySelector('app-account-view app-balances h1'))) return false;

    if (opening) {
      const links = [...panel.querySelectorAll('a[href]')];
      const selected = panel.querySelector('a[aria-current="page"]');
      return trigger.getAttribute('aria-expanded') === 'true' && !panel.inert && visible(panel) &&
        links.length === 2 && links.every(visible) && selected?.getAttribute('href') === path(address);
    }
    return trigger.getAttribute('aria-expanded') === 'false' && panel.inert && !visible(panel) &&
      (!input || (document.activeElement === trigger &&
        (input !== 'keyboard' || trigger.matches(':focus-visible'))));
  }

  window.accountPickerBenchmark = {
    ready,
    arm(target, { triggerSelector, address, opening, input }) {
      const trigger = document.querySelector(triggerSelector);
      const eventType = input === 'keyboard' ? 'keydown' : 'click';
      this.result = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          target.removeEventListener(eventType, start, true);
          resolve({ error: 'trusted input timed out' });
        }, 5000);

        function start(event) {
          if (!event.isTrusted || (input === 'keyboard' && event.key !== 'Enter')) return;
          const started = performance.now();
          target.removeEventListener(eventType, start, true);
          clearTimeout(timeout);

          let frame;
          let matching = 0;
          const deadline = setTimeout(() => {
            cancelAnimationFrame(frame);
            resolve({ error: 'account picker completion timed out' });
          }, 5000);

          function check() {
            matching = ready(trigger, address, opening, input) ? matching + 1 : 0;
            // Give the browser two paint opportunities after the first matching frame.
            if (matching === 3) {
              clearTimeout(deadline);
              resolve({ ms: performance.now() - started });
            } else {
              frame = requestAnimationFrame(check);
            }
          }
          frame = requestAnimationFrame(check);
        }
        target.addEventListener(eventType, start, true);
      });
    }
  };
})();

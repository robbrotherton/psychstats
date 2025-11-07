// Generic Tutorial engine. Works with any .tutorial (or .about) block composed of <p> steps.
// Each paragraph may include a data-action JSON string with keys mapped to controller methods.
// Example: <p data-action='{"variability":2, "number":100, "hiveOffset":40, "advance":2000}'></p>

(function() {
  function parseAction(el) {
    const raw = el.getAttribute('data-action');
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { console.warn('[tutorial] invalid data-action JSON', e); return {}; }
  }

  function applyAction(controller, action) {
    if (!controller) return;
    try { console.debug('[tutorial] applying action', action); } catch(_) {}
    if (action.variability !== undefined) controller.setVariability(action.variability);
    if (action.number !== undefined) controller.setNumber(action.number);
    if (action.hiveOffset !== undefined) controller.setHiveOffset(action.hiveOffset);
    if (action.advance) controller.advance(action.advance);
    if (action.pause === true) { try { console.debug('[tutorial] pause'); } catch(_) {}; controller.pause(); }
    if (action.play === true) { try { console.debug('[tutorial] play'); } catch(_) {}; controller.play(); }
    if (action.togglePause === true && typeof controller.togglePause === 'function') { try { console.debug('[tutorial] togglePause'); } catch(_) {}; controller.togglePause(); }
    if (action.reset === true) controller.resetAll();
    if (action.layers) {
      Object.entries(action.layers).forEach(([name, vis]) => controller.toggleLayer(name, !!vis));
    }
  }

  function initContainer(container, controller) {
    const steps = Array.from(container.querySelectorAll(':scope > p'));
    if (!steps.length) return;

    // Inject nav if not present
    let nav = container.querySelector('.tutorial-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'tutorial-nav';
      nav.innerHTML = '<button data-nav="prev" disabled>Previous</button>\n        <span class="tutorial-progress"><span data-id="current">1</span> / <span data-id="total">'+steps.length+'</span></span>\n        <button data-nav="next">Next</button>';
      container.appendChild(nav);
    } else {
      const total = nav.querySelector('[data-id="total"]');
      if (total) total.textContent = steps.length;
    }

    let index = 0;

    function show(i) {
      steps.forEach(p => p.classList.remove('active'));
      if (steps[i]) {
        steps[i].classList.add('active');
        const action = parseAction(steps[i]);
        applyAction(controller, action);
      }
      const prevBtn = nav.querySelector('[data-nav="prev"]');
      const nextBtn = nav.querySelector('[data-nav="next"]');
      const cur = nav.querySelector('[data-id="current"]');
      if (prevBtn) prevBtn.disabled = i === 0;
      if (nextBtn) nextBtn.disabled = i === steps.length - 1;
      if (cur) cur.textContent = i + 1;
      index = i;
      container.dispatchEvent(new CustomEvent('tutorial:step', { detail: { index } }));
    }

    nav.addEventListener('click', (e) => {
      const which = e.target.getAttribute('data-nav');
      if (which === 'prev' && index > 0) show(index - 1);
      if (which === 'next' && index < steps.length - 1) show(index + 1);
    });

    // First show
    show(0);
  }

  function initAll(opts) {
    const controller = (opts && opts.controller) || (window.beesController);
    const containers = document.querySelectorAll('.tutorial, .about');
    containers.forEach(c => initContainer(c, controller));
  }

  // Expose
  window.Tutorial = { initAll };

  document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.tutorial, .about')) {
      initAll();
    }
  });
})();

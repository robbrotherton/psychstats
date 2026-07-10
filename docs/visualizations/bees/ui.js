function setupUI() {
    // Create container divs for each control group
  let attractionContainer = createDiv('');
  let numberContainer = createDiv('');
  let differenceContainer = createDiv('');
  let isSyncingUI = false;
  
  attractionContainer.parent('parameters');
  numberContainer.parent('parameters');
  differenceContainer.parent('parameters');
  
  // Style the containers
  [attractionContainer, differenceContainer, numberContainer].forEach(container => {
    container.style('display', 'flex');
    container.style('align-items', 'center');
    container.style('margin', '5px 0');
  });

  // Create attraction buttons container
  attractionLabel = createSpan('Variability');
  attractionLabel.parent(attractionContainer);
  let attractionButtonsContainer = createDiv('');
  attractionButtonsContainer.parent(attractionContainer);
  attractionButtonsContainer.style('display', 'flex');
  attractionButtonsContainer.style('gap', '5px');

  // Create variability buttons
  let lowButton = createButton('Low');
  let medButton = createButton('Medium');
  let highButton = createButton('High');
  
  [lowButton, medButton, highButton].forEach(btn => {
    btn.parent(attractionButtonsContainer);
    btn.class("btn btn-outline-primary")
    btn.style('padding', '5px 10px');
  });

  // Set initial active state
  medButton.class('btn btn-success');
  
  // Button click handlers
  lowButton.mousePressed(() => { updateVariability(0, lowButton, [medButton, highButton]); beesController.setVariability(0); });
  medButton.mousePressed(() => { updateVariability(1, medButton, [lowButton, highButton]); beesController.setVariability(1); });
  highButton.mousePressed(() => { updateVariability(2, highButton, [lowButton, medButton]); beesController.setVariability(2); });


  attractionLabel.style('margin-right', '10px');
  // attractionLabel.style('min-width', '120px');
  // attractionLabel.style('text-align', 'right');

  
  // Style the containers
  [differenceContainer, numberContainer].forEach(container => {
    container.style('display', 'flex');
    container.style('align-items', 'center');
    container.style('margin', '5px 0');
  });

  // Create and setup controls with their containers
  differenceSlider = createSlider(0, 100, 0);
  differenceSlider.class("form-range");
  differenceSlider.input(() => {
    if (isSyncingUI) return;
    // Delegate to controller to keep stats consistent
    beesController.setHiveOffset(differenceSlider.value());
    beesController.resetAll();
  });

  // Create number buttons container
  numberLabel = createSpan('Number of Bees');
  numberLabel.parent(numberContainer);
  let numberButtonsContainer = createDiv('');
  numberButtonsContainer.parent(numberContainer);
  numberButtonsContainer.style('display', 'flex');
  numberButtonsContainer.style('gap', '5px');

  // Create number buttons
  let smallButtonN = createButton('15');
  let medButtonN = createButton('50');
  let largeButtonN = createButton('100');
  
  [smallButtonN, medButtonN, largeButtonN].forEach(btn => {
    btn.parent(numberButtonsContainer);
    btn.class("btn btn-outline-primary")
    btn.style('padding', '5px 10px');
  });

  // Set initial active state
  medButtonN.class('btn btn-success');
  
  // Button click handlers
  smallButtonN.mousePressed(() => { updateNumber(0, smallButtonN, [medButtonN, largeButtonN]); beesController.setNumber(0); });
  medButtonN.mousePressed(() => { updateNumber(1, medButtonN, [smallButtonN, largeButtonN]); beesController.setNumber(1); });
  largeButtonN.mousePressed(() => { updateNumber(2, largeButtonN, [smallButtonN, medButtonN]); beesController.setNumber(2); });

  numberLabel.style('margin-right', '10px');
  // numberLabel.style('min-width', '120px');
  // numberLabel.style('text-align', 'right');

  differenceLabel = createSpan("Hive position (Cohen's d): " + differenceSlider.value());

  // Style the labels
  [differenceLabel, numberLabel].forEach(label => {
    label.style('margin-right', '10px');
    // label.style('min-width', '120px');
    label.style('text-align', 'left');
  });

  // Add controls to their containers
  differenceLabel.parent(differenceContainer);
  differenceSlider.parent(differenceContainer);


  // create the pause and reset buttons, add them to the indicator container
  pauseButton = createButton("pause");
  pauseButton.class("btn btn-outline-warning")
  pauseButton.mousePressed(pauseButtonClicked);
  pauseButton.parent('indicator-container');

  resetButton = createButton("reset");
  resetButton.class("btn btn-outline-danger")
  resetButton.mousePressed(resetButtonClicked);
  resetButton.parent('indicator-container');

  advanceButton = createButton('<i class="bi bi-fast-forward"></i>');
  advanceButton.class("btn btn-outline-info")
  advanceButton.mousePressed(advanceTimeButtonClicked);
  advanceButton.parent('indicator-container');

  createToggle("toggles", "hive", "Hive");
  createToggle("toggles", "mean-line", "Swarm average");
  createToggle("toggles", "distribution", "Null distribution");
  createToggle("toggles", "swarm-histogram", "Swarm distribution");

  // Keep UI in sync with controller state (tutorial or programmatic changes)
  window.addEventListener('bees:paramsChanged', (e) => {
    try {
      const detail = e.detail || {};
      const p = (detail.params) ? detail.params : beesController.getParams();
      // Update Cohen's d label
      if (differenceLabel) {
        differenceLabel.html("Hive position (Cohen's d): " + round(p.d, 2));
      }

      // Sync variability buttons
      const varIndex = p.attractorStrengthIndex;
      [lowButton, medButton, highButton].forEach((btn, idx) => {
        if (!btn) return;
        if (idx === varIndex) {
          btn.class('btn btn-success');
        } else {
          btn.class('btn btn-outline-primary');
        }
      });

      // Sync number buttons
      const nIndex = p.nBeesIndex;
      [smallButtonN, medButtonN, largeButtonN].forEach((btn, idx) => {
        if (!btn) return;
        if (idx === nIndex) {
          btn.class('btn btn-success');
        } else {
          btn.class('btn btn-outline-primary');
        }
      });

      // Sync slider to hive offset (avoid feedback loop)
      isSyncingUI = true;
      try {
        if (typeof swarm !== 'undefined' && swarm.attractor) {
          differenceSlider.value(swarm.attractor.x);
        } else if (p.sd !== undefined && p.d !== undefined) {
          differenceSlider.value(p.d * p.sd);
        }
      } finally {
        isSyncingUI = false;
      }

      // Sync pause button UI (if tutorial paused/played)
      if (typeof pauseButton !== 'undefined' && pauseButton) {
        // Prefer event detail; fall back to controller's isPaused (handles late listener attachment)
        const paused = (detail.paused !== undefined)
          ? !!detail.paused
          : (typeof beesController !== 'undefined' && typeof beesController.isPaused === 'function'
              ? beesController.isPaused()
              : !!pause);
        if (paused) {
          pauseButton.class("btn btn-warning");
          pauseButton.html("play");
        } else {
          pauseButton.html("pause");
          pauseButton.class("btn btn-outline-warning");
        }
      }

    } catch (_) {}
  });
}

function createToggle(parent, target, label) {
  const newToggle = createDiv('<div class="form-check form-switch">' + 
    '<label class="form-check-label" for="' + target + 'Toggle">' + label + '</label>' +
    '<input class="form-check-input" type="checkbox" id="' + target + 'Toggle" checked></div>'
  )
  newToggle.parent(parent);

  const t = document.getElementById(target + 'Toggle');
  const e = document.getElementsByClassName(target);
  
  
  t.addEventListener('change', () => {
    const isHidden = e[0].classList.contains("hidden-element");
    if (isHidden) {
      e.forEach(elm => elm.classList.remove('hidden-element'));
    } else {
      e.forEach(elm => elm.classList.add('hidden-element'));
    }
  });
}

function pauseButtonClicked() {
  // Delegate to controller so events propagate and other consumers stay in sync
  if (typeof beesController !== 'undefined' && typeof beesController.togglePause === 'function') {
    beesController.togglePause(); // UI will update via bees:paramsChanged listener
    return;
  }
  // Fallback (should rarely run): local toggle & manual UI update
  pause = !pause;
  if (pause) {
    pauseButton.class("btn btn-warning");
    pauseButton.html("play");
  } else {
    pauseButton.html("pause");
    pauseButton.class("btn btn-outline-warning");
  }
}
  
  function resetButtonClicked() {
    sigCounter = { sigs: 0, obs: 0 };
    // meanHistogram = new Histogram()
    meanHistogram = new Histogram(0, 840, 840);
  }

    
  function advanceTimeButtonClicked() {
    advanceSwarmOfflineAsync(swarm, 3600);
    // updatePieChart();
  }
  
  function updateVariability(value, activeButton, inactiveButtons) {
    // Update button states (controller handles stat resets)
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
    // Core stat updates handled by beesController
  }
  
  function updateNumber(value, activeButton, inactiveButtons) {
    // Update button states
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
    // Core stat updates handled by beesController
    // (controller resets histogram when appropriate)
  }

 

// (UI sync handled inside setupUI())
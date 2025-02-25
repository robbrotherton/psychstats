function setupUI() {
    // Create container divs for each control group
  let attractionContainer = createDiv('');
  let numberContainer = createDiv('');
  let differenceContainer = createDiv('');
  
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
  lowButton.mousePressed(() => updateVariability(0, lowButton, [medButton, highButton]));
  medButton.mousePressed(() => updateVariability(1, medButton, [lowButton, highButton]));
  highButton.mousePressed(() => updateVariability(2, highButton, [lowButton, medButton]));


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
    swarm.attractor = createVector(differenceSlider.value());
    hive.attr("transform", "translate(" + (canvasWidth * 0.5 + differenceSlider.value()) + " " + canvasHeight * 0.5 + ")rotate(45)");

    resetButtonClicked();
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html("Hive position (Cohen's d): " + round(params.d, 2));
    console.log("Cohen's d: " + params.d);
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
  smallButtonN.mousePressed(() => updateNumber(0, smallButtonN, [medButtonN, largeButtonN]));
  medButtonN.mousePressed(() => updateNumber(1, medButtonN, [smallButtonN, largeButtonN]));
  largeButtonN.mousePressed(() => updateNumber(2, largeButtonN, [smallButtonN, medButtonN]));

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
    pause = !pause;
    if (pause) {
      pauseButton.class("btn btn-warning")
      pauseButton.html("play");
    } else {
      pauseButton.html("pause");
      pauseButton.class("btn btn-outline-warning")
    }
  }
  
  function resetButtonClicked() {
    sigCounter = { sigs: 0, obs: 0 };
    // meanHistogram = new Histogram()
    meanHistogram = new Histogram(0, 840, 840);
  }

    
  function advanceTimeButtonClicked() {
    advanceSwarmOffline(swarm, 3600);
    // updatePieChart();
  }
  
  function updateVariability(value, activeButton, inactiveButtons) {
    resetButtonClicked();
    // Update button states
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
  
    params.attractorStrengthIndex = value;
    params.attractorStrength = params.attractorStrengthValues[value];
  
    params.se = seValues[value][params.nBeesIndex];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html("Hive position (Cohen's d): " + round(params.d, 2));
    console.log("Cohen's d: " + params.d);

    params.lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, params.se);
    params.upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, params.se);

    drawNullDistribution(params);
  }
  
  function updateNumber(value, activeButton, inactiveButtons) {

    // console.log('currently at ' + params.nBees);
    // Update button states
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
    params.nBeesIndex = value;
    params.nBees = params.nBeesValues[value];

    // console.log('setting nBees to: ' + params.nBees);
    const difference = params.nBees - swarm.bees.length;
    // console.log('difference: ' + difference);

    if (swarm.bees.length < params.nBees) {
      for (let i = 1; i <= difference; i++) {
        // console.log('adding ' + i);
        swarm.bees.push(new Bee(swarm.attractor.x, swarm.attractor.y));
      }
    }
  
    if (swarm.bees.length > params.nBees) {
      // Remove excess bees
      swarm.bees.splice(params.nBees);
    //  console.log('keeping  ' + params.nBees);
    }

    // console.log('new N: ' + swarm.bees.length);
    
    params.se = seValues[params.attractorStrengthIndex][value];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html("Hive position (Cohen's d): " + round(params.d, 2));
    console.log("Cohen's d: " + params.d);
    
    params.lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, params.se);
    params.upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, params.se);
    
    drawNullDistribution(params);
    resetButtonClicked();
  }
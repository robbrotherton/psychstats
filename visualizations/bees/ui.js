function setupUI() {
    // Create container divs for each control group
  let attractionContainer = createDiv('');
  let numberContainer = createDiv('');
  let differenceContainer = createDiv('');
  
  attractionContainer.parent('controls-container');
  numberContainer.parent('controls-container');
  differenceContainer.parent('controls-container');
  
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
    meanHistogram = new Histogram()
    meanHistogram = new Histogram(CANVAS_WIDTH * 0.3, CANVAS_WIDTH * 0.7, CANVAS_WIDTH);
  }
  
  function updateVariability(value, activeButton, inactiveButtons) {
    resetButtonClicked();
    // Update button states
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
  
    params.attractorStrengthIndex = value;
    params.attractorStrength = params.attractorStrengthValues[value];
    
    // Update parameters
    // switch (value) {
    //   case 0:
    //     params.attractorStrength = 1;
    //     break;
    //   case 1:
    //     params.attractorStrength = 2;
    //     break;
    //   case 2:
    //     params.attractorStrength = 4;
    //     break;
    // }
  
    params.se = seValues[value][params.nBeesIndex];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html("Hive position (Cohen's d): " + round(params.d, 2));
    console.log("Cohen's d: " + params.d);
  }
  
  function updateNumber(value, activeButton, inactiveButtons) {
    resetButtonClicked();
    // Update button states
    activeButton.class('btn btn-success');
    inactiveButtons.forEach(btn => btn.class('btn btn-outline-primary'));
    params.nBeesIndex = value;
    params.nBees = params.nBeesValues[value];
    // Update parameters
    // switch (value) {
    //   case 0:
    //     params.nBees = 15;
    //     break;
    //   case 1:
    //     params.nBees = 50;
    //     break;
    //   case 2:
    //     params.nBees = 100;
    //     break;
    // }
  
    params.se = seValues[params.attractorStrengthIndex][value];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html('Difference: ' + round(params.d, 2));
    console.log("Cohen's d: " + params.d);
  }
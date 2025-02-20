let swarm, meanHistogram, estimatedParams;
let pause;
let xArray;
let observations = 0;
let sigs = 0;
let canvasWidth = 840;
let canvasHeight = 400;
let nullMu = canvasWidth * 0.5;
let attractionLabel, differenceLabel, numberLabel;

let palette = {
  null: "steelblue",
  bees: "#f9c901",
  hive: "#926900"
}

// a 2d array of standard error values that work for different input combos
// the numbers were derived by advancing the simulation at least 100,000 clicks
// and determining the variability of the sample means
// this might differ depending on processor speed etc?
let seValues = [
  // nBees = [15, 50, 100]
  [5.14, 3.206, 2.396], // attractorStrength = 1
  [9.1, 5.49, 4.21], // attractorStrength = 2
  [17.761, 10.098, 7.075], // attractorStrength = 4
]

let params = {
  attractorStrength: 2,
  attractorStrengthIndex: 1,
  attractorStrengthValues: [1, 2, 4],
  nBees: 50,
  nBeesIndex: 1,
  nBeesValues: [15, 50, 100],
  se: 5.49
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
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
}

function handleSwarms() {
  // the swarm's x attractor distance, in pixels, from the center of the canvas
  swarm.attractor = createVector(canvasWidth * 0.5 + differenceSlider.value(), canvasHeight * 0.5);

  if (swarm.bees.length < params.nBees) {
    for (let i = 0; i <= params.nBees - swarm.bees.length; i++) {
      swarm.bees.push(new Bee(swarm.attractor.x, swarm.attractor.y));
    }
  }

  if (swarm.bees.length > params.nBees) {
    // Remove excess bees and their DOM elements
    const removedBees = swarm.bees.splice(params.nBees);
    removedBees.forEach(bee => bee.remove());
  }

}

function setup() {

  angleMode(DEGREES);

  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('swarm-container');

  xArray = jStat.seq(0, width, 301);
  pause = false;

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
  

  setupDistributionViz();

  // create the pause and reset buttons, add them to the indicator container
  pauseButton = createButton("pause");
  pauseButton.class("btn btn-outline-warning")
  pauseButton.mousePressed(pauseButtonClicked);
  pauseButton.parent('indicator-container');

  resetButton = createButton("reset");
  resetButton.class("btn btn-outline-danger")
  resetButton.mousePressed(resetButtonClicked);
  resetButton.parent('indicator-container');
  
  
  swarm = new Swarm(params.nBees, palette.bees);
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  

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

function draw() {
  background(255); // #aab574

  if (pause == false) {
    handleSwarms();
    swarm.run();
    let stats = swarm.getStats(); // currently necessary to update swarm's this.currentMean

    // Update distribution visualization
    updateDistribution(swarm, meanHistogram);

  }

  swarm.display();

}


// simulate the swarm offline for numIterations frames and update histogram
function simulateSwarmOffline(swarm, numIterations) {
  
  // let hist = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  let sdSum = 0;
  let total = 0;

  const lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, params.se);
  const upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, params.se);

  for (let i = 0; i < numIterations; i++) {
    swarm.run();
    meanHistogram.add(swarm.currentMean);

    // determine significance: current mean falls outside the 95% interval?
    const isSignificant = (swarm.currentMean < lowerCrit) || (swarm.currentMean > upperCrit);
    
    sigCounter.obs++;
    if (isSignificant) sigCounter.sigs++;

    let currentSd = round(swarm.getStats().sd, 3);
    sdSum += currentSd;
    total++;
  }
  // return sdSum / total;
  const estSd = sdSum / total;
  const estSe = meanHistogram.getSd();
  const calcSe = estSd / Math.sqrt(params.nBees);

  return {estSd, estSe, calcSe, useSe: params.se};
}

function advanceSwarmOffline(swarm, numIterations) {
  
  // let hist = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  let sdSum = 0;
  let total = 0;

  const lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, params.se);
  const upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, params.se);

  for (let i = 0; i < numIterations; i++) {
    swarm.run();
    swarm.getStats();
    meanHistogram.add(swarm.currentMean);

    // determine significance: current mean falls outside the 95% interval?
    const isSignificant = (swarm.currentMean < lowerCrit) || (swarm.currentMean > upperCrit);
    
    sigCounter.obs++;
    if (isSignificant) sigCounter.sigs++;

    // let currentSd = round(swarm.getStats().sd, 3);
    // sdSum += currentSd;
    // total++;
  }
  // return sdSum / total;
  // const estSd = sdSum / total;
  const estSe = meanHistogram.getSd();
  // const calcSe = estSd / Math.sqrt(params.nBees);

  return { params, clicks: meanHistogram.total, empiricalSe: estSe };
}

function getEstimatedParams() {

  // if (attractionSlider.value() == 2.0 && numberSlider.value() == 50) {
  //   return { se: 5.5, sd: 5.5 * Math.sqrt(50)};
  // }

  const iv1 = params.attractorStrength;
  const n = params.nBees;

  const coef = {
    iv1sq: 0.0185,
    iv1: 2.2205,
    intercept: 0.92  
  }

  let se = coef.iv1 * iv1 + coef.iv1sq * (iv1 * iv1) + coef.intercept;

  const sd = se * Math.sqrt(50);

  if ( n != 50.0 ) {
    console.log("adjusting for n");
    se = sd / Math.sqrt(n);
  }

  console.log(se);
  return { se, sd };
}


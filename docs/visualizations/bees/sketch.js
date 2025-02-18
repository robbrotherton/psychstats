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

let seValues = [
  // nBees = [15, 50, 100]
  [5.0341, 3.206, 2.396], // attractorStrength = 1
  [9.29, 5.51, 4.21], // attractorStrength = 2
  [17.761, 10.098, 7.075], // attractorStrength = 4
]

let params = {
  attractorStrength: 2,
  nBees: 50,
  se: 5.51
}


function pauseButtonClicked() {
  pause = !pause;
  if (pause) {
    button.html("go");
  } else {
    button.html("stop");
  }
}

function handleSwarms() {
  // the swarm's x attractor distance, in pixels, from the center of the canvas
  swarm.attractor = createVector(canvasWidth * 0.5 + differenceSlider.value(), canvasHeight * 0.5);

  if (swarm.bees.length < params.nBees) {
    for (let i = 0; i <= params.nBees - swarm.bees.length; i++) {
      swarm.bees.push(new Bee(random(width), random(-height)));
    }
  }

  if (swarm.bees.length > params.nBees) {
    swarm.bees.splice(params.nBees, swarm.bees.length);
  }

}

function mouseReleased() {
  sigCounter = { sigs: 0, obs: 0 };
  meanHistogram = new Histogram()
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
}

function setup() {

  angleMode(DEGREES);

  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('swarm-container');

  xArray = jStat.seq(0, width, 301);
  pause = false;

  // Create container divs for each slider-label pair
  let attractionContainer = createDiv('');
  let differenceContainer = createDiv('');
  let numberContainer = createDiv('');
  
  attractionContainer.parent('controls-container');
  differenceContainer.parent('controls-container');
  numberContainer.parent('controls-container');
  
  // Style the containers
  [attractionContainer, differenceContainer, numberContainer].forEach(container => {
    container.style('display', 'flex');
    container.style('align-items', 'center');
    container.style('margin', '5px 0');
  });

  // Create and setup controls with their containers
  attractionSlider = createSlider(0, 2, 1);
  attractionSlider.input(() => {
    
    const newValue = parseInt(attractionSlider.value());

    switch (newValue) {
      case 0:
        params.attractorStrength = 1;
        attractionLabel.html('Variability: low');
        break;

      case 1:
        params.attractorStrength = 2;
        attractionLabel.html('Variability: medium');
        break;

      case 2:
        params.attractorStrength = 4;
        attractionLabel.html('Variability: high');
        break;
    }

    params.se = seValues[newValue][numberSlider.value()];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html('Difference: ' + round(params.d, 2));
    console.log("Cohen's d: " + params.d);

  });
  
  differenceSlider = createSlider(0, 200, 0);
  differenceSlider.input(() => {
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html('Difference: ' + round(params.d, 2));
    console.log("Cohen's d: " + params.d);
  });

  numberSlider = createSlider(0, 2, 1);
  numberSlider.input(() => {

    const newValue = parseInt(numberSlider.value());

    switch (newValue) {
      case 0:
        params.nBees = 15;
        numberLabel.html('Number of bees: 15');
        break;

      case 1:
        params.nBees = 50;
        numberLabel.html('Number of bees: 50');
        break;

      case 2:
        params.nBees = 100;
        numberLabel.html('Number of bees: 100');
        break;
    }

    params.se = seValues[attractionSlider.value()][numberSlider.value()];
    params.sd = params.se * Math.sqrt(params.nBees);
    params.d = differenceSlider.value() / params.sd;
    differenceLabel.html('Difference: ' + round(params.d, 2));
    console.log("Cohen's d: " + params.d);

  });

  attractionLabel = createSpan('Variability: medium');
  differenceLabel = createSpan('Difference: ' + differenceSlider.value());
  numberLabel = createSpan('Number of Bees: ' + params.nBees);

  // Style the labels
  [attractionLabel, differenceLabel, numberLabel].forEach(label => {
    label.style('margin-right', '10px');
    label.style('min-width', '120px');
    label.style('text-align', 'right');
  });

  // Add controls to their containers
  attractionLabel.parent(attractionContainer);
  attractionSlider.parent(attractionContainer);
  
  differenceLabel.parent(differenceContainer);
  differenceSlider.parent(differenceContainer);
  
  numberLabel.parent(numberContainer);
  numberSlider.parent(numberContainer);


  button = createButton("stop");
  button.mousePressed(pauseButtonClicked);
  button.parent('controls-container');


  swarm = new Swarm(params.nBees, palette.bees);
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  
  setupDistributionViz();

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


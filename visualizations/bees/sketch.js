let swarm, meanHistogram, estimatedSe;
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

  if (swarm.bees.length < numberSlider.value()) {
    for (let i = 0; i <= numberSlider.value() - swarm.bees.length; i++) {
      swarm.bees.push(new Bee(random(width), random(-height)));
    }
  }

  if (swarm.bees.length > numberSlider.value()) {
    swarm.bees.splice(numberSlider.value(), swarm.bees.length);
  }

}

function mouseReleased() {
  sigCounter = { sigs: 0, obs: 0 };
  meanHistogram = new Histogram()
  console.log((attractionSlider.value() * 19.5) / Math.sqrt(50));
  console.log(meanHistogram.getSd());
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
  attractionSlider = createSlider(1, 5, 2, 0.1);
  differenceSlider = createSlider(0, 200, 0);
  numberSlider = createSlider(10, 200, 50);

  attractionLabel = createSpan('Variability: ' + attractionSlider.value());
  differenceLabel = createSpan('Difference: ' + differenceSlider.value());
  numberLabel = createSpan('Number of Bees: ' + numberSlider.value());

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


  swarm = new Swarm(numberSlider.value(), palette.bees);
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);

  setupDistributionViz();
  
  // estimatedSe = simulateSwarmOffline(swarm, 1000);
  // estimatedSe = 5.6;
}

function draw() {
  background(255); // #aab574

  if (pause == false) {
    handleSwarms();
    swarm.run();

    // Update distribution visualization
    let stats = swarm.getStats();
    updateDistribution(stats, swarm, meanHistogram);
    // drawHistogram(meanHistogram);

  }

  // Update slider labels
  attractionLabel.html('Variability: ' + attractionSlider.value());
  differenceLabel.html('Actual difference: ' + differenceSlider.value());
  numberLabel.html('Number of Bees: ' + numberSlider.value());

  swarm.display();

  console.log(getEstimatedSe());

}


// simulate the swarm offline for numIterations frames and update histogram
function simulateSwarmOffline(swarm, numIterations) {
  
  let hist = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  for (let i = 0; i < numIterations; i++) {
    swarm.run();
    let stats = swarm.getStats();
    hist.add(stats.mean);
  }
  return hist.getSd();
}

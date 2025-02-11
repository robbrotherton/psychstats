let swarm, meanHistogram;
let pause;
let xArray;
let observations = 0;
let sigs = 0;
let canvasWidth = 840;
let canvasHeight = 400;
let attractionLabel, differenceLabel, numberLabel;

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
  button = createButton("stop");
  button.mousePressed(pauseButtonClicked);

  attractionSlider = createSlider(1, 5, 2, 0.1);  // Changed range and default
  differenceSlider = createSlider(0, 200, 0);
  numberSlider = createSlider(10, 200, 50);

  // Create labels with current values
  attractionLabel = createSpan('Attraction: ' + attractionSlider.value());
  differenceLabel = createSpan('Difference: ' + differenceSlider.value());
  numberLabel = createSpan('Number of Bees: ' + numberSlider.value());

  let controls = [button, attractionLabel, attractionSlider, differenceLabel, differenceSlider, numberLabel, numberSlider];
  for (let c of controls) {
    c.parent('controls-container');
    if (c !== button) {
      c.style('margin', '0 10px');
    }
  };

  swarm = new Swarm(numberSlider.value(), "#f9c901");
  meanHistogram = new Histogram(canvasWidth * 0.3, canvasWidth * 0.7, canvasWidth);
  // swarm2 = new Swarm(numberSlider.value(), "#643C0B");

  // makeHistoryChart('#history-container');

  setupDistributionViz();
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
  differenceLabel.html('Difference: ' + differenceSlider.value());
  numberLabel.html('Number of Bees: ' + numberSlider.value());

  swarm.display();

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

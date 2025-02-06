// import jStat;


function pauseButtonClicked() {
  pause = !pause;
  if (pause) {
    button.html("go");
  } else {
    button.html("stop");
  }
}

function handleSwarms() {
  swarm.attractor = createVector(width / 2 - differenceSlider.value(), height / 2);
  
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
  observations = 0;
  sigs = 0;
}


let swarm;
let pause;
let xArray;
let observations = 0;
let sigs = 0;
let canvasWidth = 840;
let canvasHeight = 520;

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

  let controls = [button, attractionSlider, differenceSlider, numberSlider];
  for ( let c of controls ) {
    c.parent('controls-container');
  };
  
  swarm = new Swarm(numberSlider.value(), "#f9c901");
  // swarm2 = new Swarm(numberSlider.value(), "#643C0B");

  // makeHistoryChart('#history-container');
  
  setupDistributionViz();
}

function draw() {
  background(255); // #aab574
  
  if (pause == false) {
    handleSwarms();
    swarm.run();
  }
  
  swarm.display();
  
  // Update distribution visualization
  let stats = swarm.getStats();
  updateDistribution(stats);
}

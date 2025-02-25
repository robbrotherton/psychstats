let CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 400;
const CANVAS_SCALE = 2; // Canvas is 2x the size of viz area
const canvasWidth = 840;
const canvasHeight = 400;

let swarm, meanHistogram, estimatedParams;
let pause;
let xArray;
let observations = 0;
let sigs = 0;
let nullMu = CANVAS_WIDTH * 0.5;
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
  [4.86, 3, 2.28], // attractorStrength = 1 (variability low)
  [8.3, 5.18, 3.9], // attractorStrength = 2 (variability medium)
  [15.83, 9.1, 6.3], // attractorStrength = 4 (variability high)
]

let params = {
  attractorStrength: 2,
  attractorStrengthIndex: 1,
  attractorStrengthValues: [1, 2, 4],
  nBees: 50,
  nBeesIndex: 1,
  nBeesValues: [15, 50, 100],
  se: seValues[1][1],
  lowerCrit: jStat.normal.inv(0.025, canvasWidth * 0.5, seValues[1][1]),
  upperCrit: jStat.normal.inv(0.975, canvasWidth * 0.5, seValues[1][1])
}



function handleSwarms() {
  // the swarm's x attractor distance, in pixels, from the center of the canvas
  // swarm.attractor = createVector(differenceSlider.value());

  // if (swarm.bees.length < params.nBees) {
  //   for (let i = 0; i <= params.nBees - swarm.bees.length; i++) {
  //     swarm.bees.push(new Bee(swarm.attractor.x, swarm.attractor.y));
  //   }
  // }

  // if (swarm.bees.length > params.nBees) {
  //   // Remove excess bees and their DOM elements
  //   const removedBees = swarm.bees.splice(params.nBees);
  //   // removedBees.forEach(bee => bee.remove());
  // }

}

function setup() {

  // frameRate(120);
  angleMode(DEGREES);

  // Create canvas twice the size of viz area
  let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT * CANVAS_SCALE);
  canvas.parent('swarm-container');
  // canvas.position(-CANVAS_WIDTH * 0.5, -CANVAS_HEIGHT * 0.5);
  
  // xArray = jStat.seq(0, width, 301);
  pause = false;

  swarm = new Swarm(params.nBees, palette.bees);
  meanHistogram = new Histogram(0, 840, 840);
  
  setupDistributionViz();
  setupUI();

  windowResized();

  drawNullDistribution(params);

}

function windowResized() {

    CANVAS_WIDTH = min(840, window.innerWidth);
    resizeCanvas(CANVAS_WIDTH, canvasHeight * CANVAS_SCALE);
    // canvas.position(-newWidth * 0.5, -newHeight * 0.5);
    // scale(scaleFactor);
    // canvas.style("scale", 0.5);
  // resizeCanvas(CANVAS_WIDTH * CANVAS_SCALE, CANVAS_HEIGHT * CANVAS_SCALE);
}

// Add this helper to convert mouse coordinates
// function getCanvasCoordinates(x, y) {
//   let canvas = select('canvas').elt;
//   let rect = canvas.getBoundingClientRect();
//   let scaleX = CANVAS_WIDTH / rect.width;
//   let scaleY = CANVAS_HEIGHT / rect.height;
//   return {
//       x: (x - rect.left) * scaleX,
//       y: (y - rect.top) * scaleY
//   };
// }



function draw() {
  clear(); // Use clear instead of background to keep canvas transparent
  
  // Center the viz area in the canvas
  
  
  if (pause == false) {
    // Update the swarm
    swarm.run();

    // Update distribution visualization
    updateDistribution(swarm, meanHistogram);

  }
  push();
  translate(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT);
  swarm.display();
  pop();
}


function advanceSwarmOffline(swarm, numIterations) {
  
  // let hist = new Histogram(CANVAS_WIDTH * 0.3, CANVAS_WIDTH * 0.7, CANVAS_WIDTH);
  let sdSum = 0;
  let total = 0;

  // const lowerCrit = jStat.normal.inv(0.025, CANVAS_WIDTH * 0.5, params.se);
  // const upperCrit = jStat.normal.inv(0.975, CANVAS_WIDTH * 0.5, params.se);

  for (let i = 0; i < numIterations; i++) {
    swarm.run();
    // swarm.getStats();
    const currentMean = swarm.currentMean + canvasWidth * 0.5;
    meanHistogram.add(currentMean);

    // determine significance: current mean falls outside the 95% interval?
    const isSignificant = (currentMean < params.lowerCrit) || (currentMean > params.upperCrit);
    
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

let CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 400;
const CANVAS_SCALE = 2; // Canvas is 2x the size of viz area
const canvasWidth = 840;
const canvasHeight = 400;

let swarm, meanHistogram, estimatedParams;
// Global pause flag; mirror to window.pause for compatibility with external consumers.
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

function setup() {

  // frameRate(120);
  angleMode(DEGREES);

  // Create canvas twice the size of viz area
  let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT * CANVAS_SCALE);
  canvas.parent('swarm-container');

  pause = false;
  try { window.pause = pause; } catch(_) {}

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
}

function originaldraw() {
  clear(); // Use clear instead of background to keep canvas transparent

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

function draw() {
  // Normalize frame rate as soon as playback mode is finished,
  // even if user paused before draw reaches the normal render branch.
  if (!isAdvancing && playbackFrameRateIsReduced) {
    frameRate(60);
    playbackFrameRateIsReduced = false;
  }

  if (pause) {
    return; // early exit preserves last frame
  }

  if (!isAdvancing) {
    clear();
    swarm.run();
    updateDistribution(swarm, meanHistogram);
  }

  push();
  translate(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT);

  if (isAdvancing) {
    if (!playbackFrameRateIsReduced) {
      frameRate(10);
      playbackFrameRateIsReduced = true;
    }
    if (!playbackFillColor) {
      playbackFillColor = color(palette.bees);
    }

    if (framePlaybackIndex < capturedFrames.length) {
      clear();
      noStroke();
      for (let i = 0; i <= framePlaybackIndex; i++) {
        const frame = capturedFrames[i];
        // Scale alpha from 255 (newest frame) down to ~50 (oldest frame)
        const frameAlpha = map(i, framePlaybackIndex, framePlaybackIndex - 10, 100, 0);
        // fillAlpha = max(0, fillAlpha);
        playbackFillColor.setAlpha(frameAlpha);
        fill(playbackFillColor);

        for (const bee of frame) {
          circle(bee.position.x, bee.position.y, 20);
        }
      }

      // for (bee of capturedFrames[framePlaybackIndex]) {
      //   push()
      //   noStroke();
      //   fill("#f9c701");
      //   circle(bee.position.x, bee.position.y, 16);
      //   pop();
      // }

      framePlaybackIndex++;
    }
    // playbackInterval = min(playbackInterval + 1, 10); // slow down progressively
  } else {
    swarm.display();
  }

  pop();
}
let fillAlpha = 255;
let newFPS;
let playbackFillColor;
let playbackFrameRateIsReduced = false;
function advanceSwarmOffline(swarm, numIterations) {

  for (let i = 0; i < numIterations; i++) {
    swarm.run();
    const currentMean = swarm.currentMean + canvasWidth * 0.5;
    meanHistogram.add(currentMean);

    // determine significance: current mean falls outside the 95% interval?
    const isSignificant = (currentMean < params.lowerCrit) || (currentMean > params.upperCrit);
    sigCounter.obs++;
    if (isSignificant) sigCounter.sigs++;
  }

  const estSe = meanHistogram.getSd();

  return { params, clicks: meanHistogram.total, empiricalSe: estSe };
}


let isAdvancing = false;
let frameCounter = 0;
let offlineIterationsLeft = 0;
let capturedFrames = [];
let framePlaybackIndex = 0;
let playbackInterval = 1; // controls the slowing effect

function advanceSwarmOfflineAsync(swarm, numIterations) {
  isAdvancing = true;
  frameCounter = 0;
  offlineIterationsLeft = numIterations;
  capturedFrames = [];
  framePlaybackIndex = 0;
  playbackInterval = 1;
  playbackFrameRateIsReduced = false;

  // **capture the first 30 frames**
  for (let i = 0; i < 30; i++) {
    swarm.run();
    capturedFrames.push(swarm.getFrame());

    const currentMean = swarm.currentMean + canvasWidth * 0.5;
    meanHistogram.add(currentMean);

    const isSignificant = (currentMean < params.lowerCrit) || (currentMean > params.upperCrit);
    sigCounter.obs++;
    if (isSignificant) sigCounter.sigs++;
    
    offlineIterationsLeft--;
  }
  
  updateTime();
  function processChunk() {
    let chunkSize = 60; // process 100 steps per tick to prevent UI freeze
    for (let i = 0; i < chunkSize && offlineIterationsLeft > 0; i++) {
      swarm.run();
      const currentMean = swarm.currentMean + canvasWidth * 0.5;
      meanHistogram.add(currentMean);

      const isSignificant = (currentMean < params.lowerCrit) || (currentMean > params.upperCrit);
      sigCounter.obs++;
      if (isSignificant) sigCounter.sigs++;

      offlineIterationsLeft--;

    }
    
    if (offlineIterationsLeft > 0) {
      updateTime();
      updatePieChart();
      setTimeout(processChunk, 0); // schedule next chunk
    } else {
      isAdvancing = false;
      if (playbackFrameRateIsReduced) {
        frameRate(60); // reset normal speed
        playbackFrameRateIsReduced = false;
      }
    }
  }

  processChunk(); // start processing

  return meanHistogram.getSd();
}

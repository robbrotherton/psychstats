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
  
  swarm2.attractor = createVector(width / 2 + differenceSlider.value(), height / 2);
  
  
  if (swarm.bees.length < numberSlider.value()) {
    for (let i = 0; i <= numberSlider.value() - swarm.bees.length; i++) {
      swarm.bees.push(new Bee(random(width), random(-height)));
      swarm2.bees.push(new Bee(random(width), random(-height)));
    }
  }
  
  if (swarm.bees.length > numberSlider.value()) {
    swarm.bees.splice(numberSlider.value(), swarm.bees.length);
    swarm2.bees.splice(numberSlider.value(), swarm2.bees.length);
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

function setup() {
  // import * as jStat from 'jstat';
  // frameRate(30);
  let canvas = createCanvas(840, 520);
  canvas.parent('swarm-container');

  xArray = jStat.seq(0, width, 301);
  pause = false;
  button = createButton("stop");
  button.mousePressed(pauseButtonClicked);
  
  attractionSlider = createSlider(0.5, 3, 2, 0.1);
  differenceSlider = createSlider(0, 200, 0);
  numberSlider = createSlider(10, 200, 50);

  let controls = [button, attractionSlider, differenceSlider, numberSlider];
  for ( let c of controls ) {
    c.parent('controls-container');
  };
  
  swarm = new Swarm(numberSlider.value(), "#643C0B");
  swarm2 = new Swarm(numberSlider.value(), "#f9c901");

  makeHistoryChart('#history-container');
}

function draw() {
  background(255); // #aab574
  
  if (pause == false) {
    handleSwarms();
    swarm.run();
    swarm2.run();
  }
  
  swarm.display();
  swarm2.display();
  
  let sdA = jStat.stdev(swarm.bees.map(bee => bee.position.x));
  let sdB = jStat.stdev(swarm2.bees.map(bee => bee.position.x));
  let sdTrue = (sdA + sdB) / 2;
  let sd = attractionSlider.value()*25;
  swarm.showDistribution(sd / sqrt(numberSlider.value()));
  swarm2.showDistribution(sd / sqrt(numberSlider.value()));
  
  let diff = abs(swarm.average - swarm2.average);
  // let p = jStat.ttest( 0, diff, sdTrue, numberSlider.value(), 2 );
  let z = (swarm.average - swarm2.average) / (sdTrue / sqrt(numberSlider.value()));
  let p = jStat.ztest(z);

  updateHistoryChart([swarm, swarm2]);

  strokeWeight(20);
  stroke(p < 0.05 ? 'red' : 'green');
  point(20, height - 20);
  
  observations ++;
  if ( p < 0.05) sigs ++;
  
  // console.log(sigs / observations);
  noFill();
  strokeWeight(1);
  stroke(0);
  text(round(sigs / observations, 2), 20, height - 20);
}

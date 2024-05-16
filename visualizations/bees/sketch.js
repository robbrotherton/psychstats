// import jStat;
// Bee class
class Bee {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.9; // Maximum steering force
    this.maxSpeed = 5; // Maximum speed
  }

  edges() {
    if (this.position.x > width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = height;
  }

  align(bees) {
    let perceptionRadius = 50;
    let steering = createVector();
    let total = 0;
    for (let other of bees) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(bees) {
    let perceptionRadius = 10;
    let steering = createVector();
    let total = 0;
    for (let other of bees) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.sub(this.position);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(bees) {
    let perceptionRadius = 30;
    let steering = createVector();
    let total = 0;
    for (let other of bees) {
      let d = dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (other != this && d < perceptionRadius) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.div(d * d); // Weight by distance
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.acceleration.mult(0);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }
  
  // Add attraction method
  attract(attractor) {
    let force = p5.Vector.sub(attractor, this.position);
    force.setMag(1/attractionSlider.value()); // Control the strength of attraction
    return force;
  }

  // Modify flock method to include attraction
  flock(bees, attractor) {
    // let alignment = this.align(bees).mult(0);
    // let cohesion = this.cohesion(bees).mult(0);
    let separation = this.separation(bees);
    let attraction = this.attract(attractor);
    let randomForce = p5.Vector.random2D().mult(2); // Add some random movement


    // this.applyForce(alignment);
    // this.applyForce(cohesion);
    this.applyForce(separation);
    this.applyForce(attraction); // Apply the attraction force
    this.applyForce(randomForce); // Apply the random movement force
  }

  show() {
    strokeWeight(8);
    // stroke(this.col);
    point(this.position.x, this.position.y);
  }
}

// Swarm class manages all the bees and the attractor
class Swarm {
  constructor(num, col) {
    this.average;
    this.col = col;
    this.bees = [];
    this.attractor = createVector(width / 2, height / 2); // Attractor point (x, y)
    for (let i = 0; i < num; i++) {
      let x = random(width);
      let y = random(-height);
      this.bees.push(new Bee(x, y));
    }
  }

  run() {
    for (let bee of this.bees) {
      bee.flock(this.bees, this.attractor);
      bee.update();
      // bee.edges();
    }
  }
  
  display() {
    for (let bee of this.bees) {
      stroke(this.col);
      bee.show();
    }
  }
  
  showDistribution(sd) {

    this.average = jStat.mean(this.bees.map(bee => bee.position.x));
    
    // console.log(sd);
    // strokeWeight(10);
    // stroke(this.col);
    // point(average, height - 10);
    
    
    
    let y;
    beginShape();
    for (let p of xArray) {
      
      y = jStat.normal.pdf(p, this.average, sd);
      strokeWeight(0);
      // stroke(0);
      fill(concat(this.col, 80));
      vertex(p, height - y * 1000);
    }
    endShape(CLOSE);
    
  }
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
  let canvas = createCanvas(640, 520);
  canvas.parent('sketch-holder');
  
  xArray = jStat.seq(0, width, 301);
  pause = false;
  button = createButton("stop");
  button.mousePressed(pauseButtonClicked);
  
  attractionSlider = createSlider(0.5, 3, 2, 0.1);
  differenceSlider = createSlider(0, 200, 0);
  numberSlider = createSlider(10, 200, 50);
  
  swarm = new Swarm(numberSlider.value(), "#643C0B");
  swarm2 = new Swarm(numberSlider.value(), "#f9c901");
}

function draw() {
  background("#aab574");
  
  if (pause == false) {
    handleSwarms();
    swarm.run();
    swarm2.run();
  }
  
  swarm.display();
  swarm2.display();
  
  let sdTrue = jStat.stdev(swarm.bees.map(bee => bee.position.x));
  let sd = attractionSlider.value()*25;
  swarm.showDistribution(sd / sqrt(numberSlider.value()));
  swarm2.showDistribution(sd / sqrt(numberSlider.value()));
  
  let diff = abs(swarm.average - swarm2.average);
  let p = jStat.ttest( 0, diff, sdTrue, numberSlider.value(), 2 );
  
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

// Bee class
class Bee {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.9; // Maximum steering force
    this.maxSpeed = 5; // Maximum speed
    this.size = 8; // Half of  al DOM element size
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
    force.setMag(1 / params.attractorStrength); // Control the strength of attraction
    return force;
  }

  // Modify flock method to include attraction
  flock(bees, attractor) {
    let separation = this.separation(bees);
    let attraction = this.attract(attractor);
    let randomForce = p5.Vector.random2D().mult(1.5); // Add some random movement

    this.applyForce(separation);
    this.applyForce(attraction); // Apply the attraction force
    this.applyForce(randomForce); // Apply the random movement force
  }

  show() {
    // Draw bee on p5js canvas
    push();
    noStroke();
    // stroke(palette.hive);
    fill(palette.bees);
    circle(this.position.x, this.position.y, this.size * 2);

    pop();
  }

}

// Swarm class manages all the bees and the attractor
class Swarm {
  constructor(num, col) {
    // this.average;
    this.col = col;
    this.bees = [];
    this.attractor = createVector(0, 0); // will be updated externally by slider
    this.currentMean;
    this.meanHistory = [];

    for (let i = 0; i < num; i++) {
      // let x = randomGaussian(this.attractor.x, 50);
      // let y = randomGaussian(this.attractor.y, 50);
      this.bees.push(new Bee(0, 0));
    }
  }

  run() {
    for (let bee of this.bees) {
      bee.flock(this.bees, this.attractor);
      bee.update();
    }
    this.currentMean = jStat.mean(this.bees.map(bee => bee.position.x));
  }

  display() {
    this.bees.forEach(bee => bee.show());
  }

  getFrame() {
    return this.bees.map(bee => ({
      position: bee.position.copy(),
      velocity: bee.velocity.copy(),
      acceleration: bee.acceleration.copy()
    }));
  }

  setFrame(frame) {
    frame.forEach((beeState, index) => {
      this.bees[index].position = beeState.position.copy();
      this.bees[index].velocity = beeState.velocity.copy();
      this.bees[index].acceleration = beeState.acceleration.copy();
    });
  }
}

// histogram class to bin sample means
class Histogram {
  constructor(min, max, numBins) {
    this.min = min;
    this.max = max;
    this.numBins = numBins;
    this.bins = {
      x: {},      // Will store x positions as keys
      counts: {}  // Will store counts for corresponding x positions
    };
    this.total = 0;
  }

  add(value) {
    if (value < this.min || value > this.max) return;
    const x = Math.floor(value);
    if (!this.bins.counts[x]) {
      this.bins.x[x] = x;
      this.bins.counts[x] = 0;
    }
    this.bins.counts[x]++;
    this.total++;
  }

  getSd() {
    
    let mean = 0;
    Object.keys(this.bins.counts).forEach(x => {
      mean += Number(x) * this.bins.counts[x];
    });
    mean /= this.total;

    let variance = 0;
    Object.keys(this.bins.counts).forEach(x => {
      variance += this.bins.counts[x] * Math.pow(Number(x) - mean, 2);
    });
    variance /= this.total;
    return Math.sqrt(variance);

  }
}
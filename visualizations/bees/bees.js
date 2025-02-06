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
    let separation = this.separation(bees);
    let attraction = this.attract(attractor);
    let randomForce = p5.Vector.random2D().mult(2); // Add some random movement

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
    this.attractor; // attractor point (x, y); determined by handleSwarms();
    this.hiveWidth = 5;

    for (let i = 0; i < num; i++) {
      let x = random(width);
      let y = random(-height);
      this.bees.push(new Bee(x, y));
    }
  }

  getStats() {
    let xPositions = this.bees.map(bee => bee.position.x);
    const currentMean = jStat.mean(xPositions);
    this.average = currentMean;  // Store the current mean
    return {
      mean: currentMean,
      sd: jStat.stdev(xPositions),
      n: this.bees.length
    };
  }

  run() {
    for (let bee of this.bees) {
      bee.flock(this.bees, this.attractor);
      bee.update();
    }
    console.log(this.attractor.y);
  }
  
  display() {
    // draw the individual bees
    for (let bee of this.bees) {
      stroke(this.col);
      bee.show();
    }

    // draw the TRUE center (the attractor point) of the swarm
    stroke("#7d2a00");
    push();
    translate(this.attractor.x, this.attractor.y);
    rotate(45);
    square(-this.hiveWidth * 0.5, -this.hiveWidth * 0.5, this.hiveWidth); 
    pop();

    // draw the NULL HYPOTHESIS center
    stroke("#000000");
    point(width/2, this.attractor.y); 

    // draw the CURRENT center (average of x positions)
    stroke("#0062ff");
    point(this.average, this.attractor.y); 

  }

}
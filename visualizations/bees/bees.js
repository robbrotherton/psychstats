// Bee class
class Bee {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(2, 4));
    this.acceleration = createVector();
    this.maxForce = 0.9; // Maximum steering force
    this.maxSpeed = 5; // Maximum speed

    // Create DOM element for the bee
    this.element = createDiv()
      .addClass('bee')
      .style('position', 'absolute')
      .style('width', '8px')
      .style('height', '8px')
      .style('border-radius', '50%')
      .style('background-color', palette.bees)
      .style('transform-origin', 'top left') // Add this line
      .style('top', '0')  // Add this line
      .style('left', '0') // Add this line
      .parent('swarm-container');
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
    let randomForce = p5.Vector.random2D().mult(2); // Add some random movement

    this.applyForce(separation);
    this.applyForce(attraction); // Apply the attraction force
    this.applyForce(randomForce); // Apply the random movement force
  }

  show() {
    // Adjust for the container's position
    // const containerRect = document.getElementById('swarm-container').getBoundingClientRect();
    const x = this.position.x;
    const y = this.position.y;
    this.element.style('transform', `translate3d(${x}px, ${y}px, 0)`);
  }

  // Add method to clean up DOM element
  remove() {
    this.element.remove();
  }
}

// Swarm class manages all the bees and the attractor
class Swarm {
  constructor(num, col) {
    this.average;
    this.col = col;
    this.bees = [];
    this.attractor = { x: canvasWidth * 0.5, y: canvasHeight * 0.5 }; // set externally
    this.hiveWidth = 5;
    this.currentMean;
    this.meanHistory = [];
    this.sdHistory = {
      sd: {},      // Will store x positions as keys
      count: {}  // Will store counts for corresponding x positions
    };
    this.total = 0;

    for (let i = 0; i < num; i++) {
      let x = randomGaussian(this.attractor.x, 50);
      let y = randomGaussian(this.attractor.y, 50);
      this.bees.push(new Bee(x, y));
    }
  }

  getStats() {
    let xPositions = this.bees.map(bee => bee.position.x);
    const currentMean = jStat.mean(xPositions);
    const currentSd = jStat.stdev(xPositions);
    this.average = currentMean;
    this.currentMean = currentMean;
    return {
      mean: currentMean,
      sd: currentSd,
      n: this.bees.length
    };
  }

  // helper to compute empirical quantiles from meanHistory
  getEmpiricalCI(alpha = 0.05) {
    let sorted = this.meanHistory.slice().sort((a, b) => a - b);
    let lowerIndex = Math.floor((alpha / 2) * sorted.length);
    let upperIndex = Math.floor((1 - alpha / 2) * sorted.length);
    return {
      lower: sorted[lowerIndex],
      upper: sorted[upperIndex]
    };
  }

  run() {
    for (let bee of this.bees) {
      bee.flock(this.bees, this.attractor);
      bee.update();
    }
  }

  display() {
    for (let bee of this.bees) {
      bee.show();
    }

    // draw the attractor point
    stroke(palette.hive);
    push();
    translate(this.attractor.x, this.attractor.y);
    rotate(45);
    square(-this.hiveWidth * 0.5, -this.hiveWidth * 0.5, this.hiveWidth);
    pop();

    // draw null hypothesis center
    stroke(palette.null);
    point(width / 2, this.attractor.y);

    // draw current center (average of x positions)
    // stroke("#0062ff");
    // point(this.average, this.attractor.y);
  }

  // Modify the part where bees are removed to clean up DOM elements
  handleSwarms() {
    // ...existing code...
    if (swarm.bees.length > params.nBees) {
      // Remove excess bees and their DOM elements
      const removedBees = swarm.bees.splice(params.nBees, swarm.bees.length);
      removedBees.forEach(bee => bee.remove());
    }
  }

  // Add this method to properly cleanup bees
  removeBees(count) {
    const removedBees = this.bees.splice(0, count);
    removedBees.forEach(bee => bee.remove());
  }

  // Optional: Add a cleanup method for complete removal
  cleanup() {
    this.bees.forEach(bee => bee.remove());
    this.bees = [];
  }
}

// histogram class to bin sample means
class Histogram {
  constructor(min, max, numBins) {
    // this.estimatedSe;
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
    // if (this.total < 1000) return attractionSlider.value() * 19 / Math.sqrt(numberSlider.value());
    // return getEstimatedSe().se;
    // if (this.total < 5000) return estimatedParams.se;
    
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

  getPercentile(p) {
    let target = p * this.total;
    let cum = 0;
    const sortedX = Object.keys(this.bins.counts).sort((a, b) => Number(a) - Number(b));
    
    for (let x of sortedX) {
      cum += this.bins.counts[x];
      if (cum >= target) {
        return Number(x);
      }
    }
    return this.max;
  }
}
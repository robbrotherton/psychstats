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
let svg, path, x, y, lineGenerator;
let leftTail, rightTail, meanLine;  // Add meanLine variable
const margin = { top: 20, right: 0, bottom: 30, left: 0 };
const width = canvasWidth;
const height = canvasHeight;
let sampleFrame = 0;
let sigCounter = { sigs: 0, obs: 0 };

let pieSvg, pieG;
const pieRadius = 40;

function setupDistributionViz() {
  // Create SVG with viewBox and preserveAspectRatio for proper scaling
  svg = d3.select("#distribution-container")
    .append("svg")
    // .attr("viewBox", `0 0 ${width} ${height}`)
    // .attr("preserveAspectRatio", "xMidYMid meet")
    // .style("width", "100%")
    // .style("height", "100%")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  // Create scales
  x = d3.scaleLinear()
    .domain([0, width])
    .range([0, width]);

  // Adjust y scale for better visibility
  y = d3.scaleLinear()
    .domain([0, 0.12])  // Increased upper bound
    .range([height - margin.bottom, height * 0.5]);

  // Add X axis
  // svg.append("g")
  //     .attr("transform", `translate(0,${height})`)
  //     .call(d3.axisBottom(x));

  // Create line generator
  lineGenerator = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

  // Add paths for rejection regions (before the line path)
  leftTail = svg.append("path")
    .attr("class", "distribution")
    .attr("fill", "rgba(255, 0, 0, 0.4)")
    .attr("stroke", "none");

  rightTail = svg.append("path")
    .attr("class", "distribution")
    .attr("fill", "rgba(255, 0, 0, 0.4)")
    .attr("stroke", "none");

  // Add vertical line for mean (add this before the path)
  meanLine = svg.append("line")
    .attr("class", "mean-line")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4");  // Make it dashed

  // Add empty path that we'll update
  path = svg.append("path")
    .attr("class", "distribution")
    .attr("fill", "none")
    .attr("stroke", palette.null)
    .attr("stroke-width", 1.5);

  hive = svg.append("rect")
    .attr("class", "hive")
    .attr("x", -8)
    .attr("y", -8)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", palette.hive)
    .attr("transform", "translate(" + (canvasWidth * 0.5) + " " + canvasHeight * 0.5 + ")rotate(45)");

    // .attr("x", swarm.attractor.x + canvasWidth * 0.5)
    // .attr("y", canvasHeight * 0.5);

  nullHive = svg.append("rect")
    .attr("class", "distribution")
    .attr("x", -8)
    .attr("y", -8)
    .attr("width", 16)
    .attr("height", 16)
    .attr("stroke", palette.null)
    .attr("fill", "none")
    .attr("stroke-dasharray", [4, 2])
    .attr("transform", "translate(" + (canvasWidth * 0.5) + " " + canvasHeight * 0.5 + ")rotate(45)");

  bars = svg.append("g")
    .attr("class", "swarm-histogram")
    .attr("fill", palette.bees)
    .attr("opacity", 0.5)
  // .attr("stroke", palette.bees)
  // .attr("stroke-width", 0.1)

  setupIndicators();  // Add this at the end
}

function setupIndicators() {
  pieSvg = d3.select("#indicator-container")
    .append("svg")
    .attr("viewBox", `0 0 ${pieRadius * 2} ${pieRadius * 2}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", pieRadius * 2 + "px")
    .style("height", pieRadius * 2 + "px");

  pieG = pieSvg.append("g")
    .attr("transform", `translate(${pieRadius},${pieRadius})`);

  d3.select("#indicator-container")
    .append("div")
    .append("text")
    .html("Proportion Significant")

}

function updatePieChart() {
  const sigProp = sigCounter.sigs / sigCounter.obs;
  const data = [
    { value: sigProp, color: "#ff0000" },
    { value: 1 - sigProp, color: "#cccccc" }
  ];

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(pieRadius);

  const paths = pieG.selectAll("path")
    .data(pie(data));

  paths.enter()
    .append("path")
    .merge(paths)
    .attr("d", arc)
    .attr("fill", d => d.data.color);

  paths.exit().remove();

  // Add percentage text in center
  const percentText = pieG.selectAll("text")
    .data([sigProp.toFixed(3)]);

  percentText.enter()
    .append("text")
    .merge(percentText)
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .style("font-size", "16px")
    .text(d => `${d}`);
}


function updateDistribution(swarm, histogram) {

  // add the current sample mean to the histogram
  const currentMean = swarm.currentMean + (canvasWidth * 0.5);
  histogram.add(currentMean);

  const histogramData = Object.keys(histogram.bins.counts).map(x => ({
    x: Number(x),
    count: histogram.bins.counts[x] / histogram.total
  }));

  // Update the bars
  const bars = svg.select("g").selectAll("rect")
    .data(histogramData, d => d.x);

  // Enter new bars
  bars.enter()
    .append("rect")
    .merge(bars)
    .attr("x", d => x(d.x))
    .attr("height", d => height - margin.bottom - y(d.count))
    .attr("width", 1) // 1 pixel wide by default
    .attr("y", d => y(d.count));

  // Remove old bars
  bars.exit().remove();

  // determine significance: current mean falls outside the 95% interval?
  const isSignificant = (currentMean < params.lowerCrit) || (currentMean > params.upperCrit);

  sigCounter.obs++;
  if (isSignificant) sigCounter.sigs++;
  updatePieChart();

  // update mean line position and color based on significance
  meanLine
    .attr("x1", x(currentMean))
    .attr("x2", x(currentMean))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", isSignificant ? "#ff0000" : palette.hive);

}


function drawNullDistribution(params) {
    // shade regions at lowerCrit and upperCrit 
    const points = d3.range(width * 0.25, width * 0.75, 1).map(x => ({
      x: x,
      y: Math.min(0.5, jStat.normal.pdf(x, canvasWidth * 0.5, params.se))
    }));
  
    // // update main distribution curve
    path.datum(points).attr("d", lineGenerator);
    // build left tail region for rejection area
    const leftPoints = points.filter(p => p.x <= params.lowerCrit);
    leftPoints.push({ x: params.lowerCrit, y: jStat.normal.pdf(params.lowerCrit, canvasWidth * 0.5, params.se) });
    leftPoints.push({ x: params.lowerCrit, y: -0.002 });
    leftPoints.unshift({ x: leftPoints[0].x, y: -0.002 });
  
    // build right tail region
    const rightPoints = [{ x: params.upperCrit, y: -0.002 },
    { x: params.upperCrit, y: jStat.studentt.pdf(params.upperCrit, canvasWidth * 0.5, params.se) }]
      .concat(points.filter(p => p.x >= params.upperCrit));
    rightPoints.push({ x: rightPoints[rightPoints.length - 1].x, y: -0.002 });
  
    // update rejection region visuals
    leftTail.datum(leftPoints).attr("d", lineGenerator);
    rightTail.datum(rightPoints).attr("d", lineGenerator);
}
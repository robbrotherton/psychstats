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
  // Create SVG
  svg = d3.select("#distribution-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
  // .attr("transform", `translate(${margin.left},${margin.top})`);

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
    .attr("fill", "rgba(255, 0, 0, 0.4)")
    .attr("stroke", "none");

  rightTail = svg.append("path")
    .attr("fill", "rgba(255, 0, 0, 0.4)")
    .attr("stroke", "none");

  // Add vertical line for mean (add this before the path)
  meanLine = svg.append("line")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4");  // Make it dashed

  // Add empty path that we'll update
  path = svg.append("path")
    .attr("fill", "none")
    .attr("stroke", palette.null)
    .attr("stroke-width", 1.5);

  bars = svg.append("g")
    .attr("fill", palette.bees)
    .attr("opacity", 0.5)
  // .attr("stroke", palette.bees)
  // .attr("stroke-width", 0.1)

  setupIndicators();  // Add this at the end
}

function setupIndicators() {
  pieSvg = d3.select("#indicator-container")
    .append("svg")
    .attr("width", pieRadius * 2)
    .attr("height", pieRadius * 2);

  pieG = pieSvg.append("g")
    .attr("transform", `translate(${pieRadius},${pieRadius})`);

  d3.select("#indicator-container")
    .append("div")
    .append("text")
    .html("Proportion Significant")

  d3.select("#indicator-container")
    .append("div")
    .append("text")
    .html("Proportion Significant")

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
  const currentMean = swarm.currentMean;

  histogram.add(currentMean);

  // const se = histogram.getSd();
  const se = params.se;

  const histogramData = Object.keys(histogram.bins.counts).map(x => ({
    x: Number(x),
    count: histogram.bins.counts[x] / histogram.total
  }));

  // Update the bars
  // const barScale = d3.scaleLinear()
  //   .domain([0, 0.12])
  //   .range([canvasHeight - margin.bottom, canvasHeight * 0.5]); // match the null dist scale

  const bars = svg.select("g").selectAll("rect")
    .data(histogramData, d => d.x);

  // Enter new bars
  bars.enter()
    .append("rect")
    .merge(bars)
    .attr("x", d => d.x)
    .attr("height", d => height - margin.bottom - y(d.count))
    .attr("width", 1) // 1 pixel wide by default
    .attr("y", d => y(d.count));

  // Remove old bars
  bars.exit().remove();


  const lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, se);
  const upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, se);


  // determine significance: current mean falls outside the 95% interval?
  const isSignificant = (currentMean < lowerCrit) || (currentMean > upperCrit);

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


  // shade regions at lowerCrit and upperCrit 
  const points = d3.range(width * 0.25, width * 0.75, 1).map(x => ({
    x: x,
    y: Math.min(0.5, jStat.normal.pdf(x, canvasWidth * 0.5, se))
  }));

  // // update main distribution curve
  path.datum(points).attr("d", lineGenerator);
  // build left tail region for rejection area
  const leftPoints = points.filter(p => p.x <= lowerCrit);
  leftPoints.push({ x: lowerCrit, y: jStat.normal.pdf(lowerCrit, canvasWidth * 0.5, se) });
  leftPoints.push({ x: lowerCrit, y: -0.002 });
  leftPoints.unshift({ x: leftPoints[0].x, y: -0.002 });

  // build right tail region
  const rightPoints = [{ x: upperCrit, y: -0.002 },
  { x: upperCrit, y: jStat.studentt.pdf(upperCrit, canvasWidth * 0.5, se) }]
    .concat(points.filter(p => p.x >= upperCrit));
  rightPoints.push({ x: rightPoints[rightPoints.length - 1].x, y: -0.002 });

  // update rejection region visuals
  leftTail.datum(leftPoints).attr("d", lineGenerator);
  rightTail.datum(rightPoints).attr("d", lineGenerator);
}

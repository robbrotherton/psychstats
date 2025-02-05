let svg, path, x, y, lineGenerator;
let leftTail, rightTail, meanLine;  // Add meanLine variable
const margin = {top: 20, right: 0, bottom: 30, left: 0};
const width = 400;
const height = 200;

function setupDistributionViz() {
    // Create SVG
    svg = d3.select("#distribution-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    x = d3.scaleLinear()
        .domain([0, width])
        .range([0, width]);

    // Adjust y scale for better visibility
    y = d3.scaleLinear()
        .domain([0, 0.12])  // Increased upper bound
        .range([height, 0]);

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
        .attr("fill", "rgba(255, 0, 0, 0.2)")
        .attr("stroke", "none");

    rightTail = svg.append("path")
        .attr("fill", "rgba(255, 0, 0, 0.2)")
        .attr("stroke", "none");

    // Add vertical line for mean (add this before the path)
    meanLine = svg.append("line")
        .attr("stroke", "#0062ff")  // Match the blue square color
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4");  // Make it dashed

    // Add empty path that we'll update
    path = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5);
}

function updateDistribution(stats) {
    const criticalZ = 1.96;
    const se = stats.sd / Math.sqrt(stats.n);
    const mean = width/2;
    
    // More points for smoother curve
    const points = d3.range(0, width, 1).map(x => ({
        x: x,
        y: Math.min(0.5, jStat.normal.pdf(x, mean, se))  // Clip extreme values
    }));

    // Update main distribution line
    path.datum(points).attr("d", lineGenerator);

    // Calculate critical boundaries
    const leftCritical = mean - criticalZ * se;
    const rightCritical = mean + criticalZ * se;

    // Generate smoother tail regions
    const leftPoints = points
        .filter(p => p.x <= leftCritical)
        .concat([{x: leftCritical, y: jStat.normal.pdf(leftCritical, mean, se)},
                {x: leftCritical, y: 0}]);
    leftPoints.unshift({x: leftPoints[0].x, y: 0});

    const rightPoints = [{x: rightCritical, y: 0},
                        {x: rightCritical, y: jStat.normal.pdf(rightCritical, mean, se)}]
        .concat(points.filter(p => p.x >= rightCritical));
    rightPoints.push({x: rightPoints[rightPoints.length-1].x, y: 0});

    // Update rejection regions
    leftTail.datum(leftPoints).attr("d", lineGenerator);
    rightTail.datum(rightPoints).attr("d", lineGenerator);

    // Update mean line position
    meanLine
        .attr("x1", x(stats.mean))
        .attr("x2", x(stats.mean))
        .attr("y1", 0)
        .attr("y2", height);
}

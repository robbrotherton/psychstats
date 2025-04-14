let lastSummaryHeight = 200;
let currentMaxHeight = 200;

// component 1: data graph
function initDataGraph() {
    const width = 800, height = 800;
    const margin = { top: 150, right: 220, bottom: 200, left: 220 };
    const svg = d3.select("#data-graph")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto")
        .style("fill", "transparent");

    // scales: x for values, y for groups
    const xScale = d3.scaleLinear()
        .domain([-10, 10])
        .range([margin.left, width - margin.right]);

    // xAxis = svg.append("g")
    //     .attr("class", "x-axis")
    //     .attr("transform", `translate(0, ${height - margin.bottom})`)
    //     .call(d3.axisBottom(xScale).ticks(10));

    const yScale = d3.scaleBand().range([margin.top, height - margin.bottom]).padding(0.2);
    const colScale = d3.scaleOrdinal(d3.schemeCategory10);

    // add arrow marker definitions
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "black");


    // set up the secondary scale where the sums of squares or 
    // mean squares will be displayed
    const sumSquares = svg.append("g")
        .attr("class", "sum-squares")
        .attr("transform", `translate(0, ${height - margin.bottom})`);

    // get px/unit from scale1
    const pxPerUnit = pixelsPerUnit(xScale);
    // scale2: full-width range
    const scale2PixelSpan = width; // [0, width]
    const scale2DataSpan = scale2PixelSpan / pxPerUnit;
    // optional: pick data origin — e.g., start at 0
    const scale2Domain = [0, scale2DataSpan];

    const sumScale = d3.scaleLinear()
        .domain(scale2Domain)
        .range([0, width]);

    function makePopulations() {
        // Normal distribution PDF formula
        function normalPDF(x, mean, sd) {
            return (1 / (sd * Math.sqrt(2 * Math.PI))) *
                Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
        }

        // Create a line generator for our curves
        const lineGenerator = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveBasis); // smooth the curve

        // Area generator for filling under the curves
        const areaGenerator = d3.area()
            .x(d => d[0])
            .y0(margin.top * 0.9) // Bottom of area at the top of the data area
            .y1(d => d[1])
            .curve(d3.curveBasis);

        // Remove existing population curves if any
        svg.selectAll(".population-curve").remove();

        // Use a single standard deviation for all groups
        // Based on the population variability parameter that's used in data generation
        const commonSD = 2 * state.populationVariability;

        // Generate curves for each group
        state.groupStats.forEach(group => {
            const mean = group.mean;
            const groupColor = colScale(group.group);
            const groupNumber = +group.group; // Ensure it's a number

            // Generate points for the curve
            const curveData = [];
            const domain = xScale.domain();
            const rangeMin = Math.max(domain[0] * 3, mean - commonSD * 3);
            const rangeMax = Math.min(domain[1] * 3, mean + commonSD * 3);
            const step = (rangeMax - rangeMin) / 50;

            // Scale factor to make the curves fit nicely in the margin space
            const heightScale = margin.top * 0.8;

            for (let x = rangeMin; x <= rangeMax; x += step) {
                const scaledX = xScale(x);
                // Compute PDF value and scale it to fit in the margin
                const pdfValue = normalPDF(x, mean, commonSD);
                const maxPDFValue = normalPDF(mean, mean, commonSD); // max height at mean
                const scaledY = (margin.top * 0.9) - (pdfValue / maxPDFValue) * heightScale;

                curveData.push([scaledX, scaledY]);
            }

            // Create a group for all curve elements
            const curveGroup = svg.append("g")
                .attr("class", "population-curve")
                .attr("data-group", groupNumber)
                .style("cursor", "move"); // Change cursor to indicate draggable

            // Draw the shaded area under the curve first
            curveGroup.append("path")
                .datum(curveData)
                .attr("class", "curve-area")
                .attr("d", areaGenerator)
                .attr("fill", groupColor)
                .attr("fill-opacity", 0.2);

            // Draw the curve
            curveGroup.append("path")
                .datum(curveData)
                .attr("class", "curve-line")
                .attr("d", lineGenerator)
                .attr("fill", "none")
                .attr("stroke", groupColor)
                .attr("stroke-width", 2)
                .attr("opacity", 0.8);

            // Add drag behavior to the curve group
            curveGroup.call(d3.drag()
                .on("drag", function (event) {
                    // Calculate how much the curve has been dragged in data units
                    const deltaX = xScale.invert(event.x) - xScale.invert(event.x - event.dx);

                    // Update all data points for this group
                    const groupNum = +d3.select(this).attr("data-group");

                    // Move all points in this group by deltaX
                    state.dataset.forEach(d => {
                        if (d.group === groupNum) {
                            d.value += deltaX;
                        }
                    });

                    // Also update the base dataset values to persist changes
                    // This ensures changes remain when treatment effect or variability changes
                    state.baseDataset.forEach(d => {
                        if (d.group === groupNum) {
                            d.baseValue += deltaX;
                            d.value = d.baseValue;  // Keep these in sync
                        }
                    });

                    // Update the group effects array to account for this manual change
                    // Calculate new mean for this group
                    const groupData = state.dataset.filter(d => d.group === groupNum);
                    const newGroupMean = d3.mean(groupData, d => d.value);
                    const baseEffect = state.treatmentEffect * 5;

                    // Only recalculate if treatment effect isn't zero
                    if (baseEffect !== 0) {
                        // Update the group effect to maintain the new mean position
                        state.groupEffects[groupNum] = (newGroupMean - 5) / baseEffect;
                    }

                    // Recalculate statistics
                    state.computeSS();
                    updateAll();
                }));
        });
    }

    function makeSquare(d, x2, y, height) {
        const x1 = xScale(d.value);
        return `M ${x1} ${y} 
                L ${x1} ${y - height}
                L ${x2} ${y - height}
                L ${x2} ${y}
                Z`;
    }

    function drawTotalSquares(data) {
        const grandMeanX = xScale(state.grandMean);

        svg.selectAll("path.variability-square")
            .data(data, (d, i) => i)
            .join("path")
            .attr("class", "variability-square")
            // .transition().duration(200)
            .attr("fill", "grey")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "grey")
            .attr("d", d => {
                const height = Math.abs(xScale(d.value) - grandMeanX);
                return makeSquare(d, grandMeanX, computeCy(d), height);
            });
    }

    function computeSummaryValues(which) {
        if (which === "sumsquares") {
            return {
                total: state.ssTotal,
                totalSide: Math.sqrt(state.ssTotal),
                within: state.ssWithin,
                withinSide: Math.sqrt(state.ssWithin),
                between: state.ssBetween,
                betweenSide: Math.sqrt(state.ssBetween)
            };
        } else if (which === "meansquares") {
            return {
                total: state.ssTotal / (state.dataset.length - 1),
                totalSide: Math.sqrt(state.ssTotal / (state.dataset.length - 1)),
                within: state.ssWithin / (state.dataset.length - state.numGroups),
                withinSide: Math.sqrt(state.ssWithin / (state.dataset.length - state.numGroups)),
                between: state.ssBetween / (state.numGroups - 1),
                betweenSide: Math.sqrt(state.ssBetween / (state.numGroups - 1))
            };
        }
    }


    function drawSummarySquares(which) {

        let summaryValues = computeSummaryValues(which);

        // Clear previous squares
        sumSquares.selectAll("rect.summary-square").remove();
        sumSquares.selectAll("text.summary-square").remove();

        // total
        sumSquares.append("rect")
            .attr("class", "summary-square")
            .attr("fill", "grey")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "5 5")
            .attr("x", xScale(-summaryValues.totalSide))
            .attr("y", 0)
            .attr("width", xScale(0) - xScale(-summaryValues.totalSide))
            .attr("height", xScale(0) - xScale(-summaryValues.totalSide));

        sumSquares.append("text")
            .text(summaryValues.total.toFixed(2))
            .attr("class", "summary-square")
            .attr("stroke", "grey")
            .attr("x", xScale(-summaryValues.totalSide))
            .attr("y", 15);

        // between
        sumSquares.append("rect")
            .attr("class", "summary-square")
            .attr("fill", "lightblue")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "lightblue")
            .attr("x", xScale(0))
            .attr("y", 0)
            .attr("width", xScale(summaryValues.betweenSide) - xScale(0))
            .attr("height", xScale(summaryValues.betweenSide) - xScale(0));

        sumSquares.append("text")
            .text(summaryValues.between.toFixed(2))
            .attr("class", "summary-square")
            .attr("stroke", "grey")
            .attr("x", xScale(0))
            .attr("y", 15)

        // within
        sumSquares.append("rect")
            .attr("class", "summary-square")
            .attr("fill", "thistle")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "thistle")
            .attr("x", xScale(0))
            .attr("y", xScale(summaryValues.betweenSide) - xScale(0))
            .attr("width", xScale(summaryValues.withinSide) - xScale(0))
            .attr("height", xScale(summaryValues.withinSide) - xScale(0));

        sumSquares.append("text")
            .text(summaryValues.within.toFixed(2))
            .attr("class", "summary-square")
            .attr("stroke", "grey")
            .attr("x", xScale(0))
            .attr("y", xScale(summaryValues.betweenSide) - xScale(0) + 15)

        const totalSidePx = xScale(summaryValues.totalSide) - xScale(0);
        const betweenSidePx = xScale(summaryValues.betweenSide) - xScale(0);
        const withinSidePx = xScale(summaryValues.withinSide) - xScale(0);
        const maxHeight = Math.max(totalSidePx, betweenSidePx + withinSidePx);

        currentMaxHeight = maxHeight;

        updateControlHeights(maxHeight);

    }

    function drawWithinSquares(data) {
        // svg.selectAll("path.enlarged-variability-square").remove();
        svg.selectAll("path.variability-square")
            .data(data, (d, i) => i)
            .join("path")
            .attr("class", "variability-square")
            // .transition().duration(200)
            .attr("fill", "thistle")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "thistle")
            .attr("d", d => {
                const groupMean = state.groupStats.find(g => g.group === d.group).mean;
                const groupMeanX = xScale(groupMean);
                const height = Math.abs(xScale(d.value) - groupMeanX);
                return makeSquare(d, groupMeanX, computeCy(d), height);
            });
    }
    function drawBetweenSquares() {
        const grandMeanX = xScale(state.grandMean);

        svg.selectAll("path.variability-square")
            .data(state.groupStats, d => d.group)
            .join("path")
            .attr("class", "variability-square")
            .attr("fill", "lightblue")
            .attr("fill-opacity", 0.5)
            .attr("stroke", "lightblue")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 4")
            .attr("d", d => {
                const groupMeanX = xScale(d.mean);
                const height = Math.abs(groupMeanX - grandMeanX);
                return makeSquare({ value: d.mean }, grandMeanX, yScale(d.group) + yScale.bandwidth() / 2, height);
            });

        // Draw the enlarged squares, scaled by the number of observations in the group
        svg.selectAll("path.enlarged-variability-square")
            .data(state.groupStats, d => d.group)
            .join("path")
            .attr("class", "enlarged-variability-square")
            .attr("fill", "lightblue")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "lightblue")
            // .attr("stroke-dasharray", "4 4")
            .attr("d", d => {
                const groupMeanX = xScale(d.mean);
                const centerY = yScale(d.group) + yScale.bandwidth() / 2;

                // Compute the side length of the square, scaled by sqrt of group size
                const sideLength = Math.abs(xScale(d.mean) - grandMeanX) * Math.sqrt(d.count);

                // Compute the top-left corner of the square to center it
                let x1, y1
                if (groupMeanX > grandMeanX) {
                    x1 = groupMeanX - sideLength;
                    y1 = centerY - sideLength;
                } else {
                    x1 = groupMeanX;
                    y1 = centerY - sideLength;
                }

                // Create the path for the square
                return `M ${x1} ${y1} 
                L ${x1 + sideLength} ${y1} 
                L ${x1 + sideLength} ${y1 + sideLength} 
                L ${x1} ${y1 + sideLength} 
                Z`;
            });
    }



    function computeCy(d) {
        const groupDots = state.dataset.filter(item => item.group === d.group);
        const idx = groupDots.indexOf(d);
        return yScale(d.group) + ((idx + 1) / (groupDots.length + 1)) * yScale.bandwidth();
    }

    function drawTotalArrows(data) {
        svg.selectAll("line.variability-arrow")
            .data(data, (d, i) => i)
            .join("line")
            .attr("class", "variability-arrow")
            // .transition().duration(200)
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1)
            .attr("x1", d => xScale(d.value))
            .attr("x2", xScale(state.grandMean))
            .attr("y1", d => computeCy(d))
            .attr("y2", d => computeCy(d));
    }

    function drawWithinArrows(data) {
        svg.selectAll("line.variability-arrow")
            .data(data, (d, i) => i)
            .join("line")
            .attr("class", "variability-arrow")
            // .transition().duration(200)
            .attr("stroke", d => colScale(d.group))
            .attr("stroke-width", 1)
            .attr("x1", d => xScale(d.value))
            .attr("x2", d => {
                let groupStat = state.groupStats.find(g => g.group == d.group);
                return xScale(groupStat.mean);
            })
            .attr("y1", d => computeCy(d))
            .attr("y2", d => computeCy(d));
    }

    function drawBetweenArrows() {
        // Clear previous arrows
        svg.selectAll("line.variability-arrow").remove();

        const grandMeanX = xScale(state.grandMean);

        svg.selectAll("path.variability-square")
            .data(state.groupStats, d => d.group)
            .join("line")
            .attr("class", "variability-arrow")
            .attr("stroke", d => colScale(d.group))
            .attr("x1", d => xScale(d.mean))
            .attr("x2", grandMeanX)
            .attr("y1", d => yScale(d.group) + yScale.bandwidth() / 2)
            .attr("y2", d => yScale(d.group) + yScale.bandwidth() / 2)

    }

    function update() {

        const groups = Array.from(new Set(state.dataset.map(d => d.group)));
        yScale.domain(groups);
        colScale.domain(groups);

        const circles = svg.selectAll("circle.data-point")
            .data(state.dataset, (d, i) => i);

        circles.enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("r", 5)
            .attr("fill", d => colScale(d.group))
            .attr("cx", d => xScale(d.value))
            .attr("cy", d => computeCy(d))
            .call(d3.drag()
                .on("drag", function (event, d) {
                    d.value = xScale.invert(event.x);
                    state.computeSS();
                    updateAll();
                }))
            .merge(circles)
            // .transition().duration(200)
            .attr("fill", d => colScale(d.group))
            .attr("cx", d => xScale(d.value))
            .attr("cy", d => computeCy(d))

        circles.exit().remove();

        if (state.toggles.showMeans) {
            const groupMeans = svg.selectAll("line.group-mean")
                .data(state.groupStats, d => d.group);

            groupMeans.enter()
                .append("line")
                .attr("class", "group-mean")
                .attr("stroke", d => colScale(d.group))
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "8 6")
                .merge(groupMeans)
                // .transition().duration(200)
                .attr("x1", d => xScale(d.mean))
                .attr("x2", d => xScale(d.mean))
                .attr("y1", d => yScale(d.group))
                .attr("y2", d => yScale(d.group) + yScale.bandwidth());

            groupMeans.exit().remove();

            // Only show grand mean line when not showing within-group variability
            if (state.variabilityComponent !== "within") {
                const grandMeanLine = svg.selectAll("line.grand-mean")
                    .data([state.grandMean]);

                grandMeanLine.enter()
                    .append("line")
                    .attr("class", "grand-mean")
                    .attr("stroke", "grey")
                    .attr("stroke-dasharray", "20 10")
                    .attr("stroke-width", 4)
                    .merge(grandMeanLine)
                    // .transition().duration(200)
                    .attr("x1", d => xScale(d))
                    .attr("x2", d => xScale(d))
                    .attr("y1", margin.top)
                    .attr("y2", height - margin.bottom);

                grandMeanLine.exit().remove();
            } else {
                // Hide grand mean line when showing within-group variability
                svg.selectAll("line.grand-mean").remove();
            }
        } else {
            svg.selectAll("line.group-mean").remove();
            svg.selectAll("line.grand-mean").remove();
        }

        svg.selectAll(".variability-arrow").remove();
        svg.selectAll(".variability-square").remove();
        svg.selectAll(".enlarged-variability-square").remove();

        if (state.toggles.showArrows) {
            switch (state.variabilityComponent) {
                case "total":
                    drawTotalArrows(state.dataset);
                    break;
                case "within":
                    drawWithinArrows(state.dataset);
                    break;
                case "between":
                    drawBetweenArrows();
                    break;
            }
        }

        if (state.toggles.showSquares) {
            switch (state.variabilityComponent) {
                case "total":
                    drawTotalSquares(state.dataset);
                    break;
                case "within":
                    drawWithinSquares(state.dataset);
                    break;
                case "between":
                    drawBetweenSquares(state.dataset);
                    break;
            }
        }

        // Check which summary square type is selected and draw the appropriate visualization
        const summaryType = document.querySelector('input[name="summary-type"]:checked')?.value || "sumsquares";
        makePopulations();
        drawSummarySquares(summaryType);
    }

    // Create a wrapper function to call the modular animation function with the right parameters
    window.animateSquaresToCombined = function (type) {
        if (window.vizHelpers && window.vizHelpers.animateSquaresToCombined) {
            window.vizHelpers.animateSquaresToCombined({
                state: state,
                svg: svg,
                width: width,
                height: height,
                margin: margin,
                type: type
            });
        } else {
            console.error("vizHelpers not loaded properly");
        }
    };

    subscribe(update);
    update();
}

// initialize all components (components 1:4)
function init() {
    state.updateDataset(true);
    initDataGraph();
    // initVarianceBar();
    initFormulaPanel();
    initControlsPanel();
    initControlToggles(); // Initialize the controls toggle functionality

    window.addEventListener('resize', updateControlHeights);
    updateControlHeights(); // Call initially
}

// Add function to load the vizHelpers.js script
function loadVizHelpers() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'vizHelpers.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load vizHelpers.js'));
        document.head.appendChild(script);
    });
}

// More robust MathJax initialization check
function waitForMathJax() {
    return new Promise((resolve) => {
        if (window.MathJax && window.MathJax.typesetPromise) {
            resolve();
        } else {
            window.addEventListener('load', () => {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    resolve();
                } else {
                    resolve();
                }
            });
        }
    });
}

// Initialize the app after loading dependencies
Promise.all([waitForMathJax(), loadVizHelpers()])
    .then(init)
    .catch(error => {
        console.error('Initialization error:', error);
        // Fallback init if vizHelpers fails to load
        init();
    });

function updateControlHeights(summaryHeight = currentMaxHeight) {

    // Get the current width of the visualization area
    const visualizationWidth = document.querySelector('.visualization-area').getBoundingClientRect().width;

    // Calculate scale factor (how much it has shrunk from original 800px width)
    const scaleFactor = visualizationWidth / 800;

    // Update heights of control sections
    const controls = {
        '.population-controls': 150,  // original height
        '.sample-controls': 450,      // original height
        '.summary-controls': currentMaxHeight      // original base height
    };

        // Keep track of total height
        let totalHeight = 0;

    // Update each control section
    Object.entries(controls).forEach(([selector, baseHeight]) => {
        const element = document.querySelector(selector);
        if (element) {
            const newHeight = baseHeight * scaleFactor;
            element.style.height = `${newHeight}px`;
            totalHeight += newHeight;

            // Adjust top position for sample and summary controls
            if (selector === '.sample-controls') {
                element.style.top = `${150 * scaleFactor}px`;
            } else if (selector === '.summary-controls') {
                element.style.top = `${(150 + 450) * scaleFactor}px`;
            }
        }
    });

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.height = `${totalHeight}px`;
    }
}


// scale helpers
function pixelsPerUnit(scale) {
    const d = scale.domain();
    const r = scale.range();
    return Math.abs((r[1] - r[0]) / (d[1] - d[0]));
}

function unitsPerPixel(scale) {
    return 1 / pixelsPerUnit(scale);
}
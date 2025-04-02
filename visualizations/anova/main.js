// global state manager (ultra-modular, so every component can subscribe to changes)
const state = {
    numGroups: 3,
    individualsPerGroup: 10,
    dataset: [],
    baseDataset: [], // stores original random values
    groupEffects: [], // store random effect sizes for each group
    toggles: {
        showArrows: true,
        showSquares: false,
        showMeans: true
    },
    // Update default variability component to "total" to match the initial UI selection
    variabilityComponent: "total", // Options: "total", "within", "between"
    ssTotal: 0,
    ssWithin: 0,
    ssBetween: 0,
    groupStats: [],
    grandMean: 0,
    treatmentEffect: 1,
    populationVariability: 1,
    updateDataset: function (regenerate = false) {
        if (regenerate || this.baseDataset.length === 0) {
            // generate random effect sizes for each group
            this.groupEffects = Array(this.numGroups).fill(0)
                .map(() => (Math.random() - 0.5) * 2); // random effects between -1 and 1

            // generate new random base dataset
            this.baseDataset = [];
            for (let g = 0; g < this.numGroups; g++) {
                let baseGroupMean = Math.random() * 10;
                for (let i = 0; i < this.individualsPerGroup; i++) {
                    let baseVal = baseGroupMean + d3.randomNormal(0, 2)();
                    this.baseDataset.push({
                        group: g,
                        value: baseVal,
                        baseValue: baseVal,  // store original value
                        index: i
                    });
                }
            }
        } else {
            // Handle changes in number of individuals per group
            const currentGroups = Array.from(new Set(this.baseDataset.map(d => d.group)));
            
            // Process each group separately
            currentGroups.forEach(g => {
                const groupData = this.baseDataset.filter(d => d.group === g);
                const currentCount = groupData.length;
                
                // Get the base group mean for this group
                const baseGroupMean = d3.mean(groupData, d => d.baseValue);
                
                if (currentCount < this.individualsPerGroup) {
                    // We need to add more individuals
                    const toAdd = this.individualsPerGroup - currentCount;
                    for (let i = 0; i < toAdd; i++) {
                        // Get a new base value similar to existing ones
                        const baseVal = baseGroupMean + d3.randomNormal(0, 2)();
                        this.baseDataset.push({
                            group: g,
                            value: baseVal,
                            baseValue: baseVal,
                            index: currentCount + i
                        });
                    }
                } else if (currentCount > this.individualsPerGroup) {
                    // We need to remove some individuals
                    // Filter the dataset to keep only the desired number
                    // Sort by index to keep removing from the end
                    const sortedData = [...groupData].sort((a, b) => a.index - b.index);
                    const toKeep = sortedData.slice(0, this.individualsPerGroup);
                    
                    // Filter out this group entirely and then add back the ones to keep
                    this.baseDataset = this.baseDataset.filter(d => d.group !== g);
                    this.baseDataset = this.baseDataset.concat(toKeep);
                }
            });
        }

        // transform the base values using stored random group effects
        this.dataset = this.baseDataset.map(d => {
            const baseEffect = this.treatmentEffect * 5;
            const groupEffect = this.groupEffects[d.group] * baseEffect;
            const baseMean = 5 + groupEffect;
            const baseGroupMean = d3.mean(this.baseDataset.filter(bd => bd.group === d.group),
                bd => bd.baseValue);
            const deviation = (d.baseValue - baseGroupMean) * this.populationVariability;
            return {
                ...d,
                value: baseMean + deviation
            };
        });

        this.computeSS();
        updateAll();
    },
    computeSS: function () {
        // compute group means and grand mean
        const groups = d3.group(this.dataset, d => d.group);
        let groupStats = [];
        groups.forEach((vals, key) => {
            let mean = d3.mean(vals, d => d.value);
            groupStats.push({ group: key, mean: mean, count: vals.length });
        });
        this.groupStats = groupStats;
        this.grandMean = d3.mean(this.dataset, d => d.value);

        // total sum of squares
        this.ssTotal = d3.sum(this.dataset, d => Math.pow(d.value - this.grandMean, 2));
        // within-group sum of squares
        this.ssWithin = 0;
        groups.forEach((vals, key) => {
            let gMean = groupStats.find(g => g.group == key).mean;
            this.ssWithin += d3.sum(vals, d => Math.pow(d.value - gMean, 2));
        });
        // between-group sum of squares
        this.ssBetween = d3.sum(groupStats, g => g.count * Math.pow(g.mean - this.grandMean, 2));
    }
};

// basic pub/sub mechanism so that components update reactively
const subscribers = [];
function subscribe(callback) { subscribers.push(callback); }
function updateAll() { subscribers.forEach(cb => cb()); }

// component 1: data graph
function initDataGraph() {
    const width = 600, height = 500;
    const margin = { top: 150, right: 20, bottom: 30, left: 40 };
    const svg = d3.select("#data-graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // scales: x for values, y for groups
    const xScale = d3.scaleLinear().range([margin.left, width - margin.right]);
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
            .y0(margin.top) // Bottom of area at the top of the data area
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
            const rangeMin = Math.max(domain[0], mean - commonSD * 3);
            const rangeMax = Math.min(domain[1], mean + commonSD * 3);
            const step = (rangeMax - rangeMin) / 50;
            
            // Scale factor to make the curves fit nicely in the margin space
            const heightScale = margin.top * 0.7;
            
            for (let x = rangeMin; x <= rangeMax; x += step) {
                const scaledX = xScale(x);
                // Compute PDF value and scale it to fit in the margin
                const pdfValue = normalPDF(x, mean, commonSD);
                const maxPDFValue = normalPDF(mean, mean, commonSD); // max height at mean
                const scaledY = margin.top - (pdfValue / maxPDFValue) * heightScale;
                
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
                .on("drag", function(event) {
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
        
        // Add a label for the homogeneity of variances assumption
        svg.selectAll(".assumption-label").remove();
        svg.append("text")
            .attr("class", "assumption-label")
            .attr("x", margin.left)
            .attr("y", 20)
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .text(`Assumption: Homogeneity of variances (σ = ${commonSD.toFixed(2)})`);
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
            .transition().duration(200)
            .attr("fill", "grey")
            .attr("fill-opacity", 0.2)
            .attr("stroke", "grey")
            .attr("d", d => {
                const height = Math.abs(xScale(d.value) - grandMeanX);
                return makeSquare(d, grandMeanX, computeCy(d), height);
            });
    }
    
    function drawWithinSquares(data) {
        svg.selectAll("path.variability-square")
            .data(data, (d, i) => i)
            .join("path")
            .attr("class", "variability-square")
            .transition().duration(200)
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
        // Clear previous squares
        svg.selectAll("path.variability-square").remove();
        
        // Loop through each group first to ensure we correctly position dots within groups
        const groups = Array.from(new Set(state.dataset.map(d => d.group)));
        
        groups.forEach(groupId => {
            // Get data for this group
            const groupData = state.dataset.filter(d => d.group === groupId);
            const groupStat = state.groupStats.find(g => g.group == groupId);
            
            // Calculate positions for this group
            groupData.forEach((d, i) => {
                // Calculate y-position for this specific data point
                // This needs to match how points are laid out in computeCy
                const y = yScale(d.group) + ((i + 1) / (groupData.length + 1)) * yScale.bandwidth();
                
                const groupMeanX = xScale(groupStat.mean);
                const grandMeanX = xScale(state.grandMean);
                const height = Math.abs(groupMeanX - grandMeanX);
                
                // Draw the square for this data point
                svg.append("path")
                    .attr("class", "variability-square")
                    .attr("fill", "lightblue")
                    .attr("fill-opacity", 0.2)
                    .attr("stroke", "lightblue")
                    .attr("d", `M ${groupMeanX} ${y} 
                              L ${groupMeanX} ${y - height}
                              L ${grandMeanX} ${y - height}
                              L ${grandMeanX} ${y}
                              Z`);
            });
        });
    }

    // Make sure our computeCy function is consistent with the calculation above
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
            .transition().duration(200)
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
            .transition().duration(200)
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
        
        // Loop through each group first to ensure we correctly position arrows within groups
        const groups = Array.from(new Set(state.dataset.map(d => d.group)));
        
        groups.forEach(groupId => {
            // Get data for this group
            const groupData = state.dataset.filter(d => d.group === groupId);
            const groupStat = state.groupStats.find(g => g.group == groupId);
            
            // Calculate positions for this group
            groupData.forEach((d, i) => {
                // Calculate y-position for this specific data point
                const y = yScale(d.group) + ((i + 1) / (groupData.length + 1)) * yScale.bandwidth();
                const color = colScale(d.group);
                const groupMeanX = xScale(groupStat.mean);
                const grandMeanX = xScale(state.grandMean);
                
                // Draw the arrow for this data point
                svg.append("line")
                    .attr("class", "variability-arrow")
                    .attr("stroke", color)
                    .attr("stroke-width", 1)
                    .attr("x1", groupMeanX)
                    .attr("x2", grandMeanX)
                    .attr("y1", y)
                    .attr("y2", y);
            });
        });
    }

    function update() {
        const vals = state.dataset.map(d => d.value);
        const xExtent = d3.extent(vals);
        xScale.domain([xExtent[0] - 10, xExtent[1] + 10]);
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
            .transition().duration(200)
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
                .transition().duration(200)
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
                    .transition().duration(200)
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
                    drawBetweenSquares();
                    break;
            }
        }

        makePopulations();
    }
    subscribe(update);
    update();
}

// component 2: variance bar
function initVarianceBar() {
    const width = 600, height = 50;
    const svg = d3.select("#variance-bar")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    function update() {
        const total = state.ssTotal;
        const within = state.ssWithin;
        const between = state.ssBetween;
        const xScale = d3.scaleLinear().domain([0, total]).range([0, width]);

        const withinRect = svg.selectAll("rect.within")
            .data([within]);

        withinRect.enter()
            .append("rect")
            .attr("class", "within")
            .attr("fill", "thistle")
            .merge(withinRect)
            .transition().duration(200)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", xScale(within))
            .attr("height", height);

        withinRect.exit().remove();

        const betweenRect = svg.selectAll("rect.between")
            .data([between]);

        betweenRect.enter()
            .append("rect")
            .attr("class", "between")
            .attr("fill", "lightblue")
            .merge(betweenRect)
            .transition().duration(200)
            .attr("x", xScale(within))
            .attr("y", 0)
            .attr("width", xScale(between))
            .attr("height", height);

        betweenRect.exit().remove();

        const totalRect = svg.selectAll("rect.total")
            .data([total]);

        totalRect.enter()
            .append("rect")
            .attr("class", "within")
            .attr("stroke", "black")
            .attr("stroke-width", 4)
            .attr("fill", "none")
            .attr("stroke-dasharray", "5 5")
            .merge(totalRect)
            .transition().duration(200)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", xScale(total))
            .attr("height", height);

        withinRect.exit().remove();
    }
    subscribe(update);
    update();
}

// component 3: formula panel
function initFormulaPanel() {
    const container = d3.select("#formula-panel");
    function update() {
        container.html("");

        container.append("div")
            .html("$$ \\text{SS}_{\\text{total}} = \\sum (X - G)^2 = " + state.ssTotal.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{within}} = \\sum (X - M_{\\text{group}})^2 = " + state.ssWithin.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{between}} = \\sum n_{\\text{group}} (M_{\\text{group}} - G)^2 = " + state.ssBetween.toFixed(2) + " $$");

        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    }
    subscribe(update);
    update();
}

// component 4: controls panel
function initControlsPanel() {
    const container = d3.select("#controls-panel");
    container.html("");

    container.append("label").text("groups: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 1)
        .attr("max", 10)
        .attr("value", state.numGroups)
        .on("input", function () {
            state.numGroups = +this.value;
            d3.select("#groups-value").text(this.value);
            state.updateDataset(true);
        });
    container.append("span").attr("id", "groups-value").text(state.numGroups);

    container.append("br");

    container.append("label").text("individuals/group: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 5)
        .attr("max", 50)
        .attr("value", state.individualsPerGroup)
        .on("input", function () {
            state.individualsPerGroup = +this.value;
            d3.select("#individuals-value").text(this.value);
            state.updateDataset(false);
        });
    container.append("span").attr("id", "individuals-value").text(state.individualsPerGroup);

    container.append("br");

    container.append("label").text("treatment effect: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 3)
        .attr("step", "0.1")
        .attr("value", state.treatmentEffect)
        .on("input", function () {
            state.treatmentEffect = +this.value;
            d3.select("#effect-value").text(this.value);
            state.updateDataset(false);
        });
    container.append("span").attr("id", "effect-value").text(state.treatmentEffect);

    container.append("br");

    container.append("label").text("population variability: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 0.1)
        .attr("max", 3)
        .attr("step", "0.1")
        .attr("value", state.populationVariability)
        .on("input", function () {
            state.populationVariability = +this.value;
            d3.select("#variability-value").text(this.value);
            state.updateDataset(false);
        });
    container.append("span").attr("id", "variability-value").text(state.populationVariability);

    container.append("br");
    container.append("hr");
    container.append("h4").text("Visualization Options:");

    const variabilityForm = container.append("form").attr("id", "variability-form");
    
    variabilityForm.append("div").text("Variability to Show:").style("font-weight", "bold");
    
    const withinDiv = variabilityForm.append("div");
    withinDiv.append("input")
        .attr("type", "radio")
        .attr("id", "within-var")
        .attr("name", "variability")
        .attr("value", "within")
        .attr("checked", state.variabilityComponent === "within")
        .on("change", function() {
            state.variabilityComponent = "within";
            updateAll();
        });
    withinDiv.append("label")
        .attr("for", "within-var")
        .text(" Within-group Variability");
    
    const betweenDiv = variabilityForm.append("div");
    betweenDiv.append("input")
        .attr("type", "radio")
        .attr("id", "between-var")
        .attr("name", "variability")
        .attr("value", "between")
        .attr("checked", state.variabilityComponent === "between")
        .on("change", function() {
            state.variabilityComponent = "between";
            updateAll();
        });
    betweenDiv.append("label")
        .attr("for", "between-var")
        .text(" Between-group Variability");
        
    const totalDiv = variabilityForm.append("div");
    totalDiv.append("input")
        .attr("type", "radio")
        .attr("id", "total-var")
        .attr("name", "variability")
        .attr("value", "total")
        .attr("checked", state.variabilityComponent === "total")
        .on("change", function() {
            state.variabilityComponent = "total";
            updateAll();
        });
    totalDiv.append("label")
        .attr("for", "total-var")
        .text(" Total Variability");

    container.append("br");
    
    container.append("button")
        .text("toggle arrows")
        .on("click", function () {
            state.toggles.showArrows = !state.toggles.showArrows;
            updateAll();
        });

    container.append("button")
        .text("toggle squares")
        .style("margin-left", "10px")
        .on("click", function () {
            state.toggles.showSquares = !state.toggles.showSquares;
            updateAll();
        });

    container.append("button")
        .text("reset dataset")
        .style("margin-left", "10px")
        .on("click", function () {
            state.updateDataset(true);
        });
}

// initialize all components (components 1:4)
function init() {
    state.updateDataset(true);
    initDataGraph();
    initVarianceBar();
    initFormulaPanel();
    initControlsPanel();
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

waitForMathJax().then(init);

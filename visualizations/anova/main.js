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
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
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

    function makeSquare(d, xScale, computeCy) {
        const groupMean = state.groupStats.find(g => g.group === d.group).mean;
        const x1 = xScale(d.value);
        const x2 = xScale(groupMean);
        const y = computeCy(d);
        const width = Math.abs(x2 - x1);

        return `M ${x1} ${y} 
                L ${x1} ${y - width}
                L ${x2} ${y - width}
                L ${x2} ${y}
                Z`;
    }

    function update() {
        // update x domain based on dataset values
        const vals = state.dataset.map(d => d.value);
        const xExtent = d3.extent(vals);
        xScale.domain([xExtent[0] - 10, xExtent[1] + 10]);
        // y domain: unique groups
        const groups = Array.from(new Set(state.dataset.map(d => d.group)));
        yScale.domain(groups);
        colScale.domain(groups);

        function computeCy(d) {
            const groupDots = state.dataset.filter(item => item.group === d.group);
            const idx = groupDots.indexOf(d);
            return yScale(d.group) + ((idx + 1) / (groupDots.length + 1)) * yScale.bandwidth();
        }

        // join for individual dots
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
                    // update data point value based on drag position (x axis only)
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

        // draw group means if toggled on
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

            // draw grand mean line
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
            svg.selectAll("line.group-mean").remove();
            svg.selectAll("line.grand-mean").remove();
        }

        // conditionally draw arrows if toggled on
        if (state.toggles.showArrows) {
            // draw within-group arrows: from each data point to its group mean
            const withinArrows = svg.selectAll("line.within-arrow")
                .data(state.dataset, (d, i) => i);

            withinArrows.enter()
                .append("line")
                .attr("class", "within-arrow")
                .attr("stroke-width", 1)
                .merge(withinArrows)
                .transition().duration(200)
                .attr("stroke", d => colScale(d.group))
                .attr("x1", d => xScale(d.value))
                .attr("x2", d => {
                    let groupStat = state.groupStats.find(g => g.group == d.group);
                    return xScale(groupStat.mean);
                })
                .attr("y1", d => computeCy(d))
                .attr("y2", d => computeCy(d))

            withinArrows.exit().remove();

            // draw between-group arrows: from each group mean to the grand mean
            const betweenArrows = svg.selectAll("line.between-arrow")
                .data(state.groupStats, d => d.group);

            betweenArrows.enter()
                .append("line")
                .attr("class", "between-arrow")
                .attr("stroke", "brown")
                .attr("stroke-width", 2)
                .attr("marker-end", "url(#arrow)")
                .merge(betweenArrows)
                .transition().duration(200)
                .attr("x1", d => xScale(d.mean))
                .attr("x2", d => xScale(state.grandMean))
                .attr("y1", d => yScale(d.group) + yScale.bandwidth() / 2)
                .attr("y2", d => yScale(d.group) + yScale.bandwidth() / 2);

            betweenArrows.exit().remove();
        } else {
            // remove arrows when toggled off
            svg.selectAll("line.within-arrow").remove();
            svg.selectAll("line.between-arrow").remove();
        }

        if (state.toggles.showSquares) {
            // draw within-group squares: from each data point to its group mean
            const withinSquares = svg.selectAll("path.within-square")
                .data(state.dataset, (d, i) => i);

            withinSquares.enter()
                .append("path")
                .attr("class", "within-square")
                .merge(withinSquares)
                .transition().duration(200)
                .attr("fill", "thistle")
                .attr("fill-opacity", 0.2)
                .attr("stroke", "thistle")
                .attr("d", d => makeSquare(d, xScale, computeCy));

            withinSquares.exit().remove();

        } else {
            // remove arrows when toggled off   
            svg.selectAll("path.within-square").remove();
        }




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

        // within group variance rect
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

        // between group variance rect
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

        // outline representing total variance
        const totalRect = svg.selectAll("rect.total")
            .data([total]);

        totalRect.enter()
            .append("rect")
            .attr("class", "within")
            .attr("stroke", "black")
            .attr("stroke-width", 4)
            .attr("fill", "none")
            .attr("stroke-dasharray", "5 5")
            // .attr("fill", "thistle")
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
        container.html(""); // clear previous content

        // Use Quarto's built-in support for LaTeX-style math rendering
        container.append("div")
            .html("$$ \\text{SS}_{\\text{total}} = \\sum (X - G)^2 = " + state.ssTotal.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{within}} = \\sum (X - M_{\\text{group}})^2 = " + state.ssWithin.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{between}} = \\sum n_{\\text{group}} (M_{\\text{group}} - G)^2 = " + state.ssBetween.toFixed(2) + " $$");

        // Tell MathJax to reprocess the page
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

    // slider: number of groups
    container.append("label").text("groups: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 1)
        .attr("max", 10)
        .attr("value", state.numGroups)
        .on("input", function () {
            state.numGroups = +this.value;
            d3.select("#groups-value").text(this.value);
            state.updateDataset(true); // regenerate
        });
    container.append("span").attr("id", "groups-value").text(state.numGroups);

    container.append("br");

    // slider: individuals per group
    container.append("label").text("individuals/group: ");
    container.append("input")
        .attr("type", "range")
        .attr("min", 5)
        .attr("max", 50)
        .attr("value", state.individualsPerGroup)
        .on("input", function () {
            state.individualsPerGroup = +this.value;
            d3.select("#individuals-value").text(this.value);
            state.updateDataset(true); // regenerate
            console.log(state.dataset)
        });
    container.append("span").attr("id", "individuals-value").text(state.individualsPerGroup);

    container.append("br");

    // Treatment Effect slider
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
            state.updateDataset(false);  // don't regenerate
        });
    container.append("span").attr("id", "effect-value").text(state.treatmentEffect);

    container.append("br");

    // Population Variability slider
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
            state.updateDataset(false);  // don't regenerate
        });
    container.append("span").attr("id", "variability-value").text(state.populationVariability);

    container.append("br");

    // toggle: arrows (placeholder toggle)
    container.append("button")
        .text("toggle arrows")
        .on("click", function () {
            state.toggles.showArrows = !state.toggles.showArrows;
            updateAll();
        });

    // toggle: squares
    container.append("button")
        .text("toggle squares")
        .on("click", function () {
            state.toggles.showSquares = !state.toggles.showSquares;
            updateAll();
        });

    // reset / randomize dataset
    container.append("button")
        .text("reset dataset")
        .on("click", function () {
            state.updateDataset(true);  // regenerate
        });
}

// initialize all components (components 1:4)
function init() {
    state.updateDataset(true); // regenerate
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
                    // If MathJax isn't available, proceed anyway
                    resolve();
                }
            });
        }
    });
}

waitForMathJax().then(init);

// note: component 5 (pop-up story panel) can hook into state events later via the same pub/sub system

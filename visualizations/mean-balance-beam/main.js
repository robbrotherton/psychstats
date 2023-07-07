
let width = 600
let height = 400
let nBoxes = 5
let scale_width = 11 // how many spots are there?
let box_size = width / scale_width
let HALF_BOXSIZE = box_size * 0.5;
let beam_height = box_size / 4
let radius = box_size

const f = d3.format(".2f")
const formatDeviationLabels = d3.format("+.1f")

let xScale = d3.scaleLinear()
    .domain([0, scale_width])
    .range([0, width])

let meanX, meanPx, pivotX, pivotPx;

// multiply the deviations lined up at the bottom to fit on the screen
let multiplier = 6 / nBoxes

let deviations_hidden = false;
let squared_deviations_hidden = false;

let positionsArr = d3.range(scale_width).map(i => (0));


let boxPositions = randomXPositions(5, 11);

let svg = makeSvg("#chart", { width: width, height: height, nPositions: scale_width, boxSize: box_size, beam_height: beam_height });

let boxArr = makeBoxes(nBoxes, box_size, scale_width, width);
console.log(boxArr);
drawMean(meanX, svg.meanCircle);
drawPivot(xScale(meanX + 0.5), svg.pivot)
drawBoxes(boxArr, svg.boxes);
drawDeviations(boxArr, svg.deviations);

console.log(meanX, meanPx, pivotX, pivotPx);

svg.boxes.selectAll("polygon").call(d3.drag().on("start", startDragBox)
    .on("drag", draggingBox)
    .on("end", stopDragBox));


function makeSvg(element, attributes) {

    let svg = d3.select(element).append("svg")
        .attr("viewBox", [0, 0, attributes.width, attributes.height])
        .attr("stroke-width", 2);

    // draw the 'ground' (a box on which the pivot sits, and inside which the deviations appear)
    svg.append("rect")
        .attr("width", width)
        .attr("height", 50)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "none")
        .attr("transform", `translate(0, ${height - 51})`)

    let beam_and_boxes = svg.append("g")
        .attr("transform", `translate(0, ${attributes.height - 50 - attributes.boxSize - attributes.beam_height})`)

    // draw the beam
    beam_and_boxes.append("rect")
        .attr("width", attributes.width)
        .attr("height", attributes.beam_height)
        .attr("rx", 3)
        .attr("fill", "black");

    // for debugging
    beam_and_boxes.selectAll("text").data(d3.range(scale_width)).enter().append("text")
        .attr("x", (d, i) => box_size * 0.5 + i * box_size)
        .attr("y", attributes.beam_height)
        .text(d => d)
        .attr("fill", "white")
        .attr("text-anchor", "middle");


    let pivot = svg.append("polygon")
        .attr("points", [[0, -attributes.boxSize / 2], [attributes.boxSize / 2, attributes.boxSize / 2], [-attributes.boxSize / 2, attributes.boxSize / 2]])
        .attr("fill", "red")
        .call(d3.drag()
            .on("start", startDragPivot)
            .on("drag", draggingPivot)
            .on("end", stopDragPivot))

    let label = svg.append("text").attr("text-anchor", "middle");

    // for debugging
    let meanCircle = beam_and_boxes.append("circle")
        .attr("r", 5)
        .attr("fill", "pink");

    // append group elements for other elements to be drawn
    const boxes = beam_and_boxes.append("g");
    const deviations = beam_and_boxes.append("g");
    const deviations_vertical = deviations.append("g");
    const deviations_horizontal = deviations.append("g");
    const deviations_sum = svg.append("g").attr("transform", `translate(0, ${height - 25})`);
    const deviations_sum_negative = deviations_sum.append("g").attr("transform", `translate(0, -10)`);
    const deviations_sum_positive = deviations_sum.append("g").attr("transform", `translate(0, 10)`);

    return {
        beam_and_boxes,
        boxes,
        meanCircle,
        pivot: { triangle: pivot, label: label },
        deviations: {
            negative: deviations_sum_negative,
            positive: deviations_sum_positive
        }
    };
}

function startDragPivot(event, d) { svg.pivot.triangle.attr("fill", "dodgerblue") }

function stopDragPivot(event, d) { svg.pivot.triangle.attr("fill", "red") }

function draggingPivot(event, d) {
    pivotPx = event.x;
    pivotX = xScale.invert(pivotPx - HALF_BOXSIZE);
    drawPivot(pivotPx, svg.pivot);
    tipScale(meanPx, pivotPx, svg.beam_and_boxes);
    drawDeviations(boxArr, svg.deviations);
    moveBoxes(boxArr, svg.boxes);
}





function startDragBox(event, d) {
    d3.select(this).attr("stroke", "black");
    d.initialPosition = boxArr[d.id].x;
    d.initialPx = xScale(boxArr[d.id].x);
}


function draggingBox(event, d) {

    let current_position = boxArr[d.id].x;
    let current_level = boxArr[d.id].level;
    let new_position = rounded_position_index(d.initialPx + event.x);

    if (new_position != current_position) {
        // console.log("current: " + current_position + "; new: " + new_position);
        console.log("moved! from " + current_position + " to " + new_position);
        // d.currentSpotsMoved = spotsMoved;

        // update the box's position
        boxArr[d.id].x = new_position;
        boxArr[d.id].xPx = new_position * box_size + (box_size * 0.5);

        // now this box should go on top of the stack for new_position
        boxArr[d.id].level = positionsArr[new_position]

        // and update the total number of boxes in that position
        positionsArr[new_position]++;

        // for the old position, reduce the number of boxes by one, and
        // bump down any boxes that had a higher level that this box
        positionsArr[current_position]--
        for (let i = 0; i < boxArr.length; i++) {
            if (d.id == i) continue;
            if (boxArr[i].x == current_position && boxArr[i].level > current_level) {
                boxArr[i].level--;
                console.log("movin on down")
            }
        }

        
        meanX = jStat.mean(boxArr.map(x => x.x));
        meanPx = xScale(meanX + 0.5);
        boxArr = computeDeviations(boxArr);
        drawMean(meanX, svg.meanCircle);
        moveBoxes(boxArr, svg.boxes);
        tipScale(xScale(meanX + 0.5), pivotPx, svg.beam_and_boxes);
        drawDeviations(boxArr, svg.deviations);
    }
}

function stopDragBox(event, d) {
    d3.select(this).attr("stroke", "white");
}

function randomXPositions(nBoxes, nPositions) {
    return [1, 2, 6, 6, 10];
    // d3.range(nBoxes).map(i => ({
    //     x: Math.floor(Math.random() * nPositions),
    //     color: d3.schemeCategory10[i % 10]
    // }));
}


function makeBoxes(nBoxes, boxSize, nPositions, width) {

    let boxArr = d3.range(nBoxes).map(i => ({
        x: Math.floor(Math.random() * nPositions),
        color: d3.schemeCategory10[i % 10]
    }));

    // compute the pixel location of each box
    boxArr.map(box => box.xPx = box.x * box_size + (box_size * 0.5));

    // here we stack the boxes
    for (let i = 0; i < boxArr.length; i++) {
        boxArr[i].level = positionsArr[boxArr[i].x];
        positionsArr[boxArr[i].x]++;
    }

    meanX = jStat.mean(boxArr.map(box => box.x));
    meanPx = xScale(meanX + 0.5);

    pivotX = meanX;
    pivotPx = meanPx;

    boxArr = computeDeviations(boxArr);

    return sortBoxes(boxArr, meanX);
}



function sortBoxes(boxArr, pivot) {

    let sortedBoxArr = boxArr.sort(function (a, b) { return Math.abs(b.x - pivot) - Math.abs(a.x - pivot); });

    for (let i = 0; i < sortedBoxArr.length; i++) {
        sortedBoxArr[i].id = i
    }

    return sortedBoxArr;
}

function drawPivot(meanPx, svgElement) {
    svgElement.triangle.attr("transform", `translate(${meanPx}, ${height - 50 - radius / 2})`);

    // for debugging
    svgElement.label.text(f(pivotX))
    .attr("transform", `translate(${meanPx}, ${height - 50 - radius / 2})`);
}


function drawMean(meanX, svgElement) {
    svgElement.attr("transform", `translate(${xScale(meanX + 0.5)}, 6)`);
}


function drawBoxes(boxArr, svgGroup) {

    let boxPath = [[0, -HALF_BOXSIZE],
    [box_size, -HALF_BOXSIZE],
    [box_size, HALF_BOXSIZE],
    [0, HALF_BOXSIZE],
    [0, -HALF_BOXSIZE]]

    svgGroup.selectAll("polygon")
        .data(boxArr)
        .enter()
        .append("polygon")
        .attr("points", boxPath)
        .attr("transform", d => `translate(${xScale(d.x)}, ${-box_size * 0.5 + d.level * -box_size})`)
        .attr("fill", d => d.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1)

    svgGroup.selectAll("text")
        .data(boxArr)
        .enter()
        .append("text")
        .attr("class", "box-labels")
        .text(d => formatDeviationLabels(d.dev))
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("transform", d => `translate(${xScale(d.x + 0.5)}, ${-box_size * 0.5 + d.level * -box_size})`)
        .attr("fill", d => d.color)
        .attr("fill", "white")
}

function moveBoxes(boxArr, svgGroup) {
    svgGroup.selectAll("polygon")
        .attr("transform", d => `translate(${xScale(d.x)}, ${-box_size * 0.5 + d.level * -box_size})`)
    svgGroup.selectAll("text")
        .text(d => formatDeviationLabels(d.dev))
        .attr("transform", d => `translate(${xScale(d.x + 0.5)}, ${-box_size * 0.5 + d.level * -box_size})`)
}



function devStartAndEndPositions(devsArr) {
    for (let i = 0; i < devsArr.length; i++) {
        if (i == 0) { devsArr[i].dev_start = 0; }

        else { devsArr[i].dev_start = devsArr[i - 1].dev_end; }

        devsArr[i].dev_end = devsArr[i].dev_start + Math.abs(devsArr[i].dev);
    }

    return devsArr;
}

function computeDeviations(boxArr) {
    for (let i = 0; i < boxArr.length; i++) {
        boxArr[i].dev = boxArr[i].x - pivotX;
    }

    return boxArr;
}

function drawDeviations(boxArr, svgElement) {

    boxArr = computeDeviations(boxArr);

    let deviations_negative = boxArr.filter(function (d) { return d.dev < 0 });
    deviations_negative = devStartAndEndPositions(deviations_negative);
    console.log(deviations_negative);

    let deviations_positive = boxArr.filter(function (d) { return d.dev > 0 })
    deviations_positive = devStartAndEndPositions(deviations_positive);

    updateDeviations(deviations_negative, svgElement.negative);
    updateDeviations(deviations_positive, svgElement.positive);

}

function updateDeviations(data, svgElement) {
    svgElement.selectAll("line")
    .data(data)
    .join("line")
    .attr("x1", d => xScale(d.dev_start * multiplier))
    .attr("x2", d => xScale(d.dev_end * multiplier))
    .attr("stroke", d => d.color)
    .attr("stroke-width", 8)
}


function tipScale(trueMeanPixel, pivotPixel, svgElement) {

    let angle = Math.abs((trueMeanPixel - pivotPixel) * 0.5);
    let hypotenuse, direction;

    if (pivotPixel < trueMeanPixel) {
        hypotenuse = width - pivotPixel;
        direction = 1;
    } else {
        hypotenuse = pivotPixel;
        direction = -1;
    }

    let tri_angle = 90 - (Math.acos(radius / hypotenuse) * 180 / Math.PI);
    angle = direction * (Math.min(angle, tri_angle));

    svgElement
        .attr("transform", `translate(0, ${height - 50 - radius - beam_height}) rotate(${angle}, ${pivotPixel}, ${0})`);
}


// helper functions
function getTrueMean(boxArr) {
    return boxArr.reduce((total, next) => total + next.x, 0) / boxArr.length;
}


function rounded_position_index(x) {
    let interval = width / scale_width
    let x0 = Math.round(x / interval) * interval
    return Math.round(x0 / (width / scale_width))
}


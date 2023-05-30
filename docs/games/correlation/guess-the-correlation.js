const f = d3.format(".2f");
const res = d3.format("+.2f");
const line = d3.line();


// SVG

const w = 500;
const h = 350;
const margin = {top: 10, right: 10, bottom: 30, left: 10}
const radius = 4;
var r;
var p1error, p2error, winnerIndex;
var scores = [0,0];


const scoreValues = [d3.select("#p1-points"), d3.select("#p2-points")];


const svg = d3.select(".svg-container")
.append("svg")
.attr("class", "svg-content")
.attr("preserveAspectRatio", "xMinYMin meet")
.attr("viewBox", `0 0 ${w} ${h}`);

const axisLine = svg.append("path")
    .style("stroke", "black").style("fill", "none")
    .style("stroke-linecap", "square").style("stroke-width", 2);
    
axisLine.attr("d", line([[margin.left, margin.top],
                        [margin.left, h - margin.bottom],
                        [w - margin.right, h - margin.bottom]]));
                              

function makeChart() {
    var data = makeData(100);

    var x = d3.scaleLinear()
        .domain([d3.min(data, d => d.xVal), d3.max(data, d => d.xVal)])
        .range([margin.left + 2*radius, w - margin.right - 2*radius])
    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.yVal), d3.max(data, d => d.yVal)])
        .range([h - margin.bottom - 2*radius, margin.top + 2*radius])

    svg.selectAll("circle").remove();
    svg.selectAll("circle").data(data).enter()
        .append("circle")
        .attr("cx", d => x(d.xVal))
        .attr("cy", d => y(d.yVal))
        .attr("r", radius)
        .style("fill", "plum")
        .style("opacity", 0)
        .transition().delay((d,i) => i * 10).duration(0)
            .style("opacity" ,1)
 
}

function adjudicateGuesses() {
    var p1guess = d3.select("#p1-guess").property("value");
    var p2guess = d3.select("#p2-guess").property("value");
    p1error = r - p1guess;
    p2error = r - p2guess;

    var errors = [Math.abs(p1error), Math.abs(p2error)]
    winnerIndex = errors.indexOf(Math.min(...errors));
    
    showResults();
    addPoint(winnerIndex);
    d3.select("#refresh").text("Next").on("click", reset);
}

function showResults() {
    winner = Array(2).fill("");
    winner[winnerIndex] = "<span style='font-size: 2em;'>👑</span>";
    d3.select("#p1-error").html(res(p1error * -1) + "<br>" + winner[0]);
    d3.select("#p2-error").html(res(p2error * -1) + "<br>" + winner[1]);
    d3.select("#true-r").text("True r = " + f(r));
}

d3.select("#p1-points").selectAll("div").data([0,1,2]).enter().append("span").classed("placeholder-coin", true).text("🪙")
d3.select("#p2-points").selectAll("div").data([0,1,2]).enter().append("span").classed("placeholder-coin", true).text("🪙")

function addPoint(i) {
    scores[i]++;
    if(scores[i] > 2) {
        // declareWinner(i);
        scoreValues[i].selectAll("span").filter(d => d < scores[i]).classed("placeholder-coin", false);
    } else {
        scoreValues[i].selectAll("span").filter(d => d < scores[i]).classed("placeholder-coin", false);
    }
}

function declareWinner(winnerIndex) {
    // alert("Player " + (winnerIndex + 1) + " wins!!!")
    // window.location.reload();
}


function reset() {
    d3.selectAll(".resettable").html("")
    d3.selectAll(".guess").property("value", "");
    
    d3.select("#refresh").text("Guess").on("click", adjudicateGuesses);
    makeChart();
}

function makeData(n) {
    arr = [];

    var target_r = Math.random();
    console.log("target r = " + target_r);

    for (var i = 0; i < n; i++) {
        var A = jStat.normal.inv(Math.random(), 0, 1);
        var B = jStat.normal.inv(Math.random(), 0, 1);
        
        var X = A;
        var Y = A * target_r + B * Math.pow(1 - Math.pow(target_r, 2), 0.5);
        
        arr.push({xVal: X, yVal: Y})
    }
    var stats = new Statistics(arr, {xVal: 'metric', yVal: 'metric'});
    r = stats.correlationCoefficient('xVal', 'yVal').correlationCoefficient;
    console.log("Actual r = " + r);
    return arr;
}

d3.select("#refresh").on("click", adjudicateGuesses);
makeChart();
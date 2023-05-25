var start, myTimer, myTurner;
var sec = d3.select("#seconds")
var cli = d3.select("#clicks")
var flag = d3.select("#flag")
var flag2 = d3.select("#flag2")
var clicks = 0;
var state;
const target_clicks = 50;
var mode = practice;

var records = [{prev: 0, best: 0},{prev: 0, best: 0}]

var handleState = 0;
const handle = d3.select("#handle-text");
const handle2 = d3.select("#handle2-text");
const handleText = ["┘","└"]

function handleClicked() {
    handleState++;
    handle.text(handleText[handleState % 2]);
}

function turnHandle2() {
    var handle2State = 0;
    myTurner = setInterval( function(){
        handle2State++;
        handle2.text(handleText[handle2State % 2]);
        if (handle2State > target_clicks) clearInterval(myTurner);
    }, 7000 / target_clicks);
}

function clicked() {
    handleClicked();
    
    if (clicks==0) {startTimer(); turnHandle2();}
    if (clicks < target_clicks) {
        clicks++;
    cli.text(clicks);
    flag.transition().duration(300).style("left", `${clicks*(100/target_clicks)*1.00}%`);
    } 
    if (clicks == target_clicks) stopTimer();
}

function startTimer() {
    start = Date.now();
    myTimer= setInterval( function(){
        var delta = Date.now() - start; // milliseconds elapsed since start
        sec.html(delta / 1000);
    }, 10);

    flag2.transition().ease(d3.easeLinear).duration(7000).style("left", "100%")
}

function stopTimer() {
    clearInterval(myTimer);

    var time = Number(sec.html());

    if(state!="practice") {
        d3.select("#" + state + "-previous").text(time);

        var previousBest = Number(d3.select("#" + state + "-best").text());
        if(isNaN(previousBest)) d3.select("#" + state + "-best").text(time);
        else if (time < previousBest) d3.select("#" + state + "-best").text(time);
    }
}

// function updateTable(time, cell) {
//     d3.select(cell).text(time);
// }

function practice() {
    state = "practice";
    reset();
    d3.selectAll(".nav").classed("selected", false);
    d3.select("#practice-button").classed("selected", true);
    // d3.select("#practice").style("display", "block");
    d3.select("#instructions").style("display", "block");
    d3.select("#track2").style("display", "none");
    d3.select("#time").style("display", "none");
}

function alone() {
    state = "alone";
    reset();
    d3.selectAll(".nav").classed("selected", false);
    d3.select("#alone-button").classed("selected", true);
    d3.select("#time").style("display", "block");
    d3.select("#track2").style("display", "none");
    d3.select("#instructions").style("display", "none");
}

function competition() {
    state = "competition";
    reset();
    d3.selectAll(".nav").classed("selected", false);
    d3.select("#competition-button").classed("selected", true);
    d3.select("#time").style("display", "block");
    d3.select("#track2").style("display", "block");
    d3.select("#instructions").style("display", "none");
}

function reset() {
    clearInterval(myTimer);
    clearInterval(myTurner);
    sec.text("0.00");
    cli.text(0);
    flag.transition().duration(1000).style("left", "0%");
    flag2.transition().duration(1000).style("left", "0%");
    clicks = 0;
}

practice();
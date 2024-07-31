function makeHistoryChart(divId) {
    let div = d3.select(divId);
    // div.style('background', 'red');
    div.style('width', '100px');
    div.style('height', '100px');

    svg = div.append('svg')
                .attr('id', 'historyChart');
    svg.attr("viewBox", "0 0 " + 100 + " " + 100)
    
    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "red")
        .attr("opacity", "0.5");

    svg.append("rect")
        .attr("width", "97.5%")
        .attr("height", "100%")
        .attr("fill", "white");

    svg.append("rect")
        .attr("width", "2.5%")
        .attr("height", "100%")
        .attr("fill", "red")
        .attr("opacity", "0.5");

    svg.append('line')
        .attr('x1', "50%")
        .attr('y1', "0%")
        .attr('x2', "50%")
        .attr('y2', "100%")
        .style('stroke', 'black')
        .style('stroke-width', '1px')
        .style('stroke-dasharray', [5, 5]);

    svg.append('circle').attr('id', 'currentDiff')
        .attr('cx', '50%')
        .attr('cy', 3)
        .attr('r', 3)
        .attr('fill', 'pink');

}

function updateHistoryChart(swarmsArray) {

  let sdA = jStat.stdev(swarmsArray[0].bees.map(bee => bee.position.x));
  let sdB = jStat.stdev(swarmsArray[1].bees.map(bee => bee.position.x));
  let sd = (sdA + sdB) / 2;

  let diff = swarmsArray[0].average - swarmsArray[1].average;
  let n = swarmsArray[0].bees.length;
  let scaledDiff = diff / (sd / sqrt(n));
  let percentile = jStat.studentt.cdf(scaledDiff, n - 1);
  console.log(percentile);
  
  let point = d3.select(currentDiff);
    point.attr('fill', 'blue')
    point.attr('cx', percentile * 100 + '%');
}
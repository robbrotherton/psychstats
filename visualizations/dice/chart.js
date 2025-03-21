export function createSumsHistogram(width, height) {
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + (width * 0.92) + " " + height)
        // .attr("width", width * 0.92)
        // .attr("height", height)
        // .style("background", "pink")
        .style("margin", "0 auto")

        return svg;
}

export function updateSumsHistogram(svg, data, params) {

    const maxSum = params.numberOfDice * 6;
    const counts = data.map(d => d.count);
    const maxCount = counts.reduce((a, b) => Math.max(a, b), -Infinity);
    
    const totalRolls = counts.reduce((accumulator, value) => {
        return accumulator + value;
      }, 0);
    
    d3.select("#throw-counter").text(totalRolls);
    const svgWidth = 500 * 0.92; //svg.attr("width");
    const barWidth = svgWidth / maxSum;

    // Remove unused labs group
    // const labs = svg.append("g")

    
    const x = d3.scaleLinear()
        .domain([params.numberOfDice, params.numberOfDice * 6])
        .range([0, svgWidth- barWidth])
        
    svg.selectAll("rect").remove();
    svg.selectAll("text").remove();  // Clear existing text elements

    svg.selectAll("rect").data(data).enter()
        .append("rect")
        .attr("fill", "#D77")
        .attr("x", d => x(d.value))
        .attr("y", 15)
        .attr("width", barWidth)
        .attr("height", d => Math.min(d.count * 10, d.count / maxCount * 185));

    // Add text labels
    const fontSize = params.numberOfDice === 10 ? "8px" : "12px";

    svg.selectAll("text").data(data).enter()
        .append("text")
        .text(d => d.value)
        .attr("x", d => x(d.value) + barWidth/2)
        .attr("y", 10)  // Position above the bars
        .attr("text-anchor", "middle")
        .attr("font-size", fontSize);
}

export function resetChart(svg, data) {
    d3.select("#throw-counter").text('');
    data.length = 0;
    svg.selectAll("rect").remove();
}
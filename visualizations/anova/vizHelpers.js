/**
 * Animates squares to show their combined area
 * @param {Object} options - Configuration options
 * @param {Object} options.state - The state object containing SS values
 * @param {SVGElement} options.svg - The SVG element to render in
 * @param {number} options.width - Width of the SVG
 * @param {number} options.height - Height of the SVG
 * @param {Object} options.margin - Margins of the SVG
 * @param {string} options.type - Type of squares to animate: "total", "within", or "between"
 */
function animateSquaresToCombined(options) {
    const { state, svg, width, height, margin, type } = options;
    
    // Get the current squares in the visualization
    const squares = svg.selectAll("path.variability-square");
    
    if (squares.empty()) return;
    
    // Create target area at bottom of chart
    const targetY = height - margin.bottom + 50;
    
    // Calculate total area (sum of squares)
    let totalArea = 0;
    
    // Calculate area based on type of squares
    if (type === "total") {
        totalArea = state.ssTotal;
    } else if (type === "within") {
        totalArea = state.ssWithin;
    } else if (type === "between") {
        totalArea = state.ssBetween;
    }
    
    // Calculate side length of final square
    const sideLength = Math.sqrt(totalArea); // Scale factor for visibility
    
    // Position for the combined square (centered horizontally)
    const startX = (width - sideLength) / 2;

    // Clear any previous animations
    svg.selectAll(".animated-square, .combined-square, .area-counter, .animation-title, .combined-area-label, .combined-area-explanation, .remove-button, .temp-square").remove();
    
    // Create a "progress bar" type animation that shows the growing area
    const progressSquare = svg.append("rect")
        .attr("class", "temp-square")
        .attr("x", startX)
        .attr("y", targetY)
        .attr("width", 0)
        .attr("height", 0)
        .attr("fill", type === "total" ? "grey" : type === "within" ? "thistle" : "lightblue")
        .attr("fill-opacity", 0.5)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    // Counter text shows the current sum
    // const counterText = svg.append("text")
    //     .attr("class", "area-counter")
    //     .attr("x", width / 2)
    //     .attr("y", targetY - 20)
    //     .attr("text-anchor", "middle")
    //     .attr("font-size", "16px")
    //     .text(`Sum of Squares: 0.00`);
    
    // Add a title for the animation
    // svg.append("text")
    //     .attr("class", "animation-title")
    //     .attr("x", width / 2)
    //     .attr("y", targetY - 50)
    //     .attr("text-anchor", "middle")
    //     .attr("font-size", "18px")
    //     .attr("font-weight", "bold")
    //     .text(`${type.charAt(0).toUpperCase() + type.slice(1)} Variability`);

    // Track the total area as we add each square
    let currentArea = 0;
    let squareCounter = 0;
    
    // Simplified approach: Show each square contributing to the total
    // We'll create a running animation where each square adds to the cumulative area
    const squaresArray = squares.nodes().map(node => d3.select(node));
    
    // First create a visual copy of each square in its original position
    squaresArray.forEach((square, i) => {
        // Extract square dimensions - we'll calculate the actual area
        const pathData = square.attr("d");
        const fillColor = square.attr("fill");
        
        // Clone the square to leave original in place
        svg.append("path")
            .attr("class", "animated-square")
            .attr("data-index", i)
            .attr("d", pathData)
            .attr("fill", fillColor)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill-opacity", 0.8);
    });
    
    // Animate each square sequentially
    function animateNextSquare(index) {
        if (index >= squaresArray.length) {
            // Animation complete, show final square
            finishAnimation();
            return;
        }
        
        const square = d3.select(`.animated-square[data-index='${index}']`);
        
        // Calculate approximate area of this square 
        // (In reality, we'd use the actual SS value, but for animation we can estimate from the path)
        const pathData = square.attr("d");
        const parts = pathData.split(/[ML ]/);
        const points = [];
        for (let i = 1; i < parts.length; i++) {
            if (parts[i]) {
                const coords = parts[i].trim().split(" ");
                if (coords.length >= 2) {
                    points.push([parseFloat(coords[0]), parseFloat(coords[1])]);
                }
            }
        }
        
        // Calculate area based on the type of variability component
        let squareArea = 0;
        if (type === "total") {
            squareArea = state.ssTotal / squares.size();
        } else if (type === "within") {
            squareArea = state.ssWithin / squares.size();
        } else if (type === "between") {
            squareArea = state.ssBetween / squares.size();
        }
        
        // Add to running total
        currentArea += squareArea;
        
        // Calculate new dimensions for the growing square
        const currentSideLength = Math.sqrt(currentArea) * 5;
        
        // Animate this square moving to center and contributing to the area
        square.transition()
            .duration(300)
            .attr("transform", `translate(${width/2}, ${targetY + sideLength/2})`)
            // .style("opacity", 0)
            .on("end", function() {
                d3.select(this).remove();
                
                // Grow the progress square to include this square's area
                progressSquare.transition()
                    .duration(300)
                    .attr("x", startX + (sideLength - currentSideLength)/2)
                    .attr("y", targetY + (sideLength - currentSideLength)/2)
                    .attr("width", currentSideLength)
                    .attr("height", currentSideLength)
                    .on("end", function() {
                        // Update counter
                        counterText.text(`Sum of Squares: ${currentArea.toFixed(2)}`);
                        
                        // Process next square after a short delay
                        setTimeout(() => animateNextSquare(index + 1), 10);
                    });
            });
    }
    
    // Start the animation sequence with a slight delay
    setTimeout(() => animateNextSquare(0), 100);
    
    function finishAnimation() {
        // Transition to the final square
        progressSquare.transition()
            .duration(300)
            .attr("x", startX)
            .attr("y", targetY)
            .attr("width", sideLength)
            .attr("height", sideLength);
        
        // Add the final area label
        svg.append("text")
            .attr("class", "combined-area-label")
            .attr("x", width / 2)
            .attr("y", targetY + sideLength + 30)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .text(`Total Area = ${totalArea.toFixed(2)}`);
        
        // Add dimensional explanation
        svg.append("text")
            .attr("class", "combined-area-explanation")
            .attr("x", width / 2)
            .attr("y", targetY + sideLength + 50)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(`Side length = √${totalArea.toFixed(2)} × 5 = ${sideLength.toFixed(2)}`);
        
        // Add horizontal and vertical dimension lines
        svg.append("line")
            .attr("class", "combined-area-dimension")
            .attr("x1", startX)
            .attr("y1", targetY + sideLength + 10)
            .attr("x2", startX + sideLength)
            .attr("y2", targetY + sideLength + 10)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        
        svg.append("line")
            .attr("class", "combined-area-dimension")
            .attr("x1", startX + sideLength + 10)
            .attr("y1", targetY)
            .attr("x2", startX + sideLength + 10)
            .attr("y2", targetY + sideLength)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
            
        // Add arrows at ends of dimension lines
        svg.append("path")
            .attr("class", "combined-area-dimension")
            .attr("d", `M ${startX-5} ${targetY + sideLength + 10} L ${startX} ${targetY + sideLength + 5} L ${startX} ${targetY + sideLength + 15} Z`)
            .attr("fill", "black");
            
        svg.append("path")
            .attr("class", "combined-area-dimension")
            .attr("d", `M ${startX + sideLength + 5} ${targetY + sideLength + 10} L ${startX + sideLength} ${targetY + sideLength + 5} L ${startX + sideLength} ${targetY + sideLength + 15} Z`)
            .attr("fill", "black");
    }
    
    // Add a remove button
    const removeButton = svg.append("g")
        .attr("class", "remove-button")
        .attr("cursor", "pointer")
        .on("click", function() {
            // Remove all animation elements
            svg.selectAll(".animated-square, .temp-square, .combined-square, .area-counter, .animation-title, .combined-area-label, .combined-area-explanation, .combined-area-dimension, .remove-button")
                .remove();
        });
        
    removeButton.append("circle")
        .attr("cx", width - 20)
        .attr("cy", targetY - 40)
        .attr("r", 12)
        .attr("fill", "red")
        .attr("opacity", 0.7);
        
    removeButton.append("text")
        .attr("x", width - 20)
        .attr("y", targetY - 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "white")
        .text("×");
}

// Export the function globally so it can be accessed from main.js
window.vizHelpers = window.vizHelpers || {};
window.vizHelpers.animateSquaresToCombined = animateSquaresToCombined;
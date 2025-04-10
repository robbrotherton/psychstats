// Visualization helper functions for ANOVA visualization
window.vizHelpers = {
    // Animation function to transition squares to their combined representation
    animateSquaresToCombined: function(params) {
        const { state, svg, width, height, margin, type } = params;
        
        // Get the square elements
        const squares = svg.selectAll(".variability-square");
        
        // Animation duration
        const duration = 1000;
        
        // Animate based on type
        if (type === "combine") {
            // Animation to combine squares
            squares.transition()
                .duration(duration)
                .attr("transform", (d, i) => {
                    // Move to a central position
                    const targetX = width / 2;
                    const targetY = height - margin.bottom - 100;
                    return `translate(${targetX}, ${targetY}) scale(1)`;
                })
                .style("opacity", 0.8)
                .on("end", () => {
                    // After animation completes, update the visualization
                    updateAll();
                });
        } else {
            // Reset animation
            squares.transition()
                .duration(duration)
                .attr("transform", "translate(0,0) scale(1)")
                .style("opacity", 0.2)
                .on("end", () => {
                    // After animation completes, update the visualization
                    updateAll();
                });
        }
    }
};
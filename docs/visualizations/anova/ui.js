function initControlsPanel() {
    const container = d3.select("#controls-panel");
    container.html("");

    // Create the main flex container
    const flexContainer = container.append("div")
        .attr("class", "controls-flex-container");

    // Create the parameter controls section
    const paramControls = flexContainer.append("div")
        .attr("class", "controls-flex-item parameter-controls");
    
    paramControls.append("h3").text("Parameter Controls");

    // Groups slider
    const groupsControl = paramControls.append("div");
    groupsControl.append("label")
        // .attr("class", "form-label")
        .attr("for", "groups-slider")
        .text("groups: ");
    groupsControl.append("input")
        // .attr("class", "form-range")
        .attr("id", "groups-slider")
        .attr("type", "range")
        .attr("min", 1)
        .attr("max", 10)
        .attr("value", state.numGroups)
        .on("input", function () {
            state.numGroups = +this.value;
            d3.select("#groups-value").text(this.value);
            state.updateDataset(true);
        });
    groupsControl.append("span").attr("id", "groups-value").text(state.numGroups);

    // Individuals per group slider
    const indControl = paramControls.append("div").style("margin-top", "10px");
    indControl.append("label").text("individuals/group: ");
    indControl.append("input")
        .attr("type", "range")
        .attr("min", 5)
        .attr("max", 50)
        .attr("value", state.individualsPerGroup)
        .on("input", function () {
            state.individualsPerGroup = +this.value;
            d3.select("#individuals-value").text(this.value);
            state.updateDataset(false);
        });
    indControl.append("span").attr("id", "individuals-value").text(state.individualsPerGroup);

    // Treatment effect slider
    const effectControl = paramControls.append("div").style("margin-top", "10px");
    effectControl.append("label").text("treatment effect: ");
    effectControl.append("input")
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
    effectControl.append("span").attr("id", "effect-value").text(state.treatmentEffect);

    // Population variability slider
    const varControl = paramControls.append("div").style("margin-top", "10px");
    varControl.append("label").text("population variability: ");
    varControl.append("input")
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
    varControl.append("span").attr("id", "variability-value").text(state.populationVariability);

    // Reset button
    const resetDiv = paramControls.append("div").style("margin-top", "15px");
    resetDiv.append("button")
        .attr("class", "reset-button")
        .text("Reset Dataset")
        .on("click", function () {
            state.updateDataset(true);
        });

    // Create the visualization options section
    const visOptions = flexContainer.append("div")
        .attr("class", "controls-flex-item visualization-options");
    
    visOptions.append("h3").text("Visualization Options");

    // Variability options
    const variabilityForm = visOptions.append("div").attr("id", "variability-form");
    
    variabilityForm.append("div")
        .text("Variability to Show:")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px");
    
    // Total variability option - default checked
    const totalDiv = variabilityForm.append("div")
        .attr("class", "form-check");
    totalDiv.append("input")
        .attr("class", "form-check-input")
        .attr("type", "radio")
        .attr("id", "total-var")
        .attr("name", "variability")
        .attr("value", "total")
        .property("checked", state.variabilityComponent === "total")
        .on("change", function() {
            console.log("Total selected");
            state.variabilityComponent = "total";
            updateAll();
        });
    totalDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "total-var")
        .text(" Total");
    
    // Within-group option
    const withinDiv = variabilityForm.append("div")
        .attr("class", "form-check");
    withinDiv.append("input")
        .attr("class", "form-check-input")
        .attr("type", "radio")
        .attr("id", "within-var")
        .attr("name", "variability")
        .attr("value", "within")
        .property("checked", state.variabilityComponent === "within")
        .on("change", function() {
            console.log("Within selected");
            state.variabilityComponent = "within";
            updateAll();
        });
    withinDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "within-var")
        .text(" Within-groups");
    
    // Between-group option
    const betweenDiv = variabilityForm.append("div")
        .attr("class", "form-check");
    betweenDiv.append("input")
        .attr("class", "form-check-input")
        .attr("type", "radio")
        .attr("id", "between-var")
        .attr("name", "variability")
        .attr("value", "between")
        .property("checked", state.variabilityComponent === "between")
        .on("change", function() {
            console.log("Between selected");
            state.variabilityComponent = "between";
            updateAll();
        });
    betweenDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "between-var")
        .text(" Between-groups");

    // Toggle buttons
    const togglesDiv = visOptions.append("div")
        .attr("class", "toggle-buttons");
    
    const devsToggle = togglesDiv.append("div")
        .attr("class", "form-check form-switch");
    devsToggle.append("input")
        .attr("class", "form-check-input")
        .attr("id", "deviations-toggle")
        .attr("type", "checkbox")
        .property("checked", state.toggles.showArrows)
        .on("change", function() {
            state.toggles.showArrows = this.checked;
            updateAll();
        });
    devsToggle.append("label")
        .attr("class", "form-check-label")
        .attr("for", "deviations-toggle")
        .text("Deviations");

    const squaresToggle = togglesDiv.append("div")
        .attr("class", "form-check form-switch");
    squaresToggle.append("input")
        .attr("class", "form-check-input")
        .attr("id", "squares-toggle")
        .attr("type", "checkbox")
        .property("checked", state.toggles.showSquares)
        .on("change", function() {
            state.toggles.showSquares = this.checked;
            updateAll();
        });
    squaresToggle.append("label")
        .attr("class", "form-check-label")
        .attr("for", "squares-toggle")
        .text("Squares");
}
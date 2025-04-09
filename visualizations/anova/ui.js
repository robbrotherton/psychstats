function initControlsPanel() {
    // Clear previous controls
    d3.select("#population-controls").html("");
    d3.select("#sample-controls").html("");
    d3.select("#summary-controls").html("");

    // ----- POPULATION CONTROLS -----
    const populationControls = d3.select("#population-controls");
    
    // Groups slider
    const groupsControl = populationControls.append("div");
    groupsControl.append("label")
        .attr("for", "groups-slider")
        .text("Groups: ");
    groupsControl.append("input")
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
    const indControl = populationControls.append("div").style("margin-top", "10px");
    indControl.append("label").text("Individuals/Group: ");
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
    const effectControl = populationControls.append("div").style("margin-top", "10px");
    effectControl.append("label").text("Effect Size: ");

    effectControl.append("span")
        .attr("id", "effect-value")
        .attr("class", "slider-value")
        .text("less");
    effectControl.append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 3)
        .attr("step", "0.1")
        .style("width", "auto")
        .attr("value", state.treatmentEffect)
        .on("input", function () {
            state.treatmentEffect = +this.value;
            state.updateDataset(false);
        });
    effectControl.append("span")
        .attr("id", "effect-value")
        .attr("class", "slider-value")
        .text("more");

    // Population variability slider
    const varControl = populationControls.append("div").style("margin-top", "10px");
    varControl.append("label").text("Variability: ");
    
    varControl.append("span").attr("id", "variability-value").text("less");
    varControl.append("input")
        .attr("type", "range")
        .style("width", "auto")
        .attr("min", 0.1)
        .attr("max", 3)
        .attr("step", "0.1")
        .attr("value", state.populationVariability)
        .on("input", function () {
            state.populationVariability = +this.value;
            state.updateDataset(false);
        });
    varControl.append("span").attr("id", "variability-value").text("more");

    // Reset button
    const resetDiv = populationControls.append("div").style("margin-top", "15px");
    resetDiv.append("button")
        .attr("class", "reset-button")
        .text("New Data")
        .on("click", function () {
            state.updateDataset(true);
        });

    // ----- SAMPLE VISUALIZATION CONTROLS -----
    const sampleControls = d3.select("#sample-controls");
    
    // Variability options
    const variabilityForm = sampleControls.append("div").attr("id", "variability-form");
    
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
            state.variabilityComponent = "between";
            updateAll();
        });
    betweenDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "between-var")
        .text(" Between-groups");

    // Toggle buttons
    const togglesDiv = sampleControls.append("div")
        .attr("class", "toggle-buttons")
        .style("margin-top", "15px");
    
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

    // ----- SUMMARY CONTROLS -----
    const summaryControls = d3.select("#summary-controls");
    
    // Summary type selector (sums of squares vs mean squares)
    const summaryTypeForm = summaryControls.append("div")
        .attr("id", "summary-type-form");
    
    summaryTypeForm.append("div")
        .text("Summary Square Type:")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px");
    
    // Sum of squares option
    const ssDiv = summaryTypeForm.append("div")
        .attr("class", "form-check");
    ssDiv.append("input")
        .attr("class", "form-check-input")
        .attr("type", "radio")
        .attr("id", "ss-type")
        .attr("name", "summary-type")
        .attr("value", "sumsquares")
        .property("checked", true)
        .on("change", function() {
            if(this.checked) {
                updateAll();
            }
        });
    ssDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "ss-type")
        .text(" Sum of Squares");
    
    // Mean squares option
    const msDiv = summaryTypeForm.append("div")
        .attr("class", "form-check");
    msDiv.append("input")
        .attr("class", "form-check-input")
        .attr("type", "radio")
        .attr("id", "ms-type")
        .attr("name", "summary-type")
        .attr("value", "meansquares")
        .on("change", function() {
            if(this.checked) {
                updateAll();
            }
        });
    msDiv.append("label")
        .attr("class", "form-check-label")
        .attr("for", "ms-type")
        .text(" Mean Squares");
}

// Add toggle functionality for control sections
function initControlToggles() {
    // First set everything to be collapsed by default
    document.querySelectorAll('.control-content').forEach(content => {
        content.classList.remove('expanded');
    });
    
    // Add click handlers to section headers
    document.querySelectorAll('.control-section h3').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            
            // Toggle expanded class
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                this.classList.remove('collapsed');
            } else {
                content.classList.add('expanded');
                this.classList.add('collapsed');
            }
        });
    });
}

// Initialize controls when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Call this after the document is fully loaded
    setTimeout(initControlToggles, 100);
});
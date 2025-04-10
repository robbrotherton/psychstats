// component 3: formula panel
function initFormulaPanel() {
    const container = d3.select("#formula-panel");
    function update() {
        container.html("");

        container.append("div")
            .html("$$ \\text{SS}_{\\text{total}} = \\sum (X - M_{\\text{grand}})^2 = " + state.ssTotal.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{within}} = \\sum (X - M_{\\text{group}})^2 = " + state.ssWithin.toFixed(2) + " $$");
        container.append("div")
            .html("$$ \\text{SS}_{\\text{between}} = \\sum n_{\\text{group}} (M_{\\text{group}} - M_{\\text{grand}})^2 = " + state.ssBetween.toFixed(2) + " $$");

        const msBetween = state.ssBetween / (state.numGroups - 1);
        const msWithin = state.ssWithin / (state.individualsPerGroup * state.numGroups - state.numGroups);
        const fRatio = msBetween / msWithin;

        container.append("div")
            .html("$$ MS_{\\text{within}} = " + msWithin.toFixed(2) + " $$");
        container.append("div")
            .html("$$ MS_{\\text{between}} = " + msBetween.toFixed(2) + " $$");

        container.append("div")
            .html("$$ F = " + fRatio.toFixed(2) + " $$");

        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    }
    subscribe(update);
    update();
}
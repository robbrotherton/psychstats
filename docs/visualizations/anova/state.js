// global state manager (ultra-modular, so every component can subscribe to changes)
const state = {
    numGroups: 3,
    individualsPerGroup: 10,
    dataset: [],
    baseDataset: [], // stores original random values
    groupEffects: [], // store random effect sizes for each group
    toggles: {
        showArrows: true,
        showSquares: true,
        showMeans: true
    },
    // Make sure this is initialized to "total" which is our default
    variabilityComponent: "total",
    ssTotal: 0,
    ssWithin: 0,
    ssBetween: 0,
    groupStats: [],
    grandMean: 0,
    treatmentEffect: 1,
    populationVariability: 1,
    updateDataset: function (regenerate = false) {
        if (regenerate || this.baseDataset.length === 0) {
            // generate random effect sizes for each group
            this.groupEffects = Array(this.numGroups).fill(0)
                .map(() => (Math.random() - 0.5) * 2); // random effects between -1 and 1

            // generate new random base dataset
            this.baseDataset = [];
            for (let g = 0; g < this.numGroups; g++) {
                let baseGroupMean = (Math.random() - 0.5) * 10;
                for (let i = 0; i < this.individualsPerGroup; i++) {
                    let baseVal = baseGroupMean + d3.randomNormal(0, 2)();
                    this.baseDataset.push({
                        group: g,
                        value: baseVal,
                        baseValue: baseVal,  // store original value
                        index: i
                    });
                }
            }
        } else {
            // Handle changes in number of individuals per group
            const currentGroups = Array.from(new Set(this.baseDataset.map(d => d.group)));

            // Process each group separately
            currentGroups.forEach(g => {
                const groupData = this.baseDataset.filter(d => d.group === g);
                const currentCount = groupData.length;

                // Get the base group mean for this group
                const baseGroupMean = d3.mean(groupData, d => d.baseValue);

                if (currentCount < this.individualsPerGroup) {
                    // We need to add more individuals
                    const toAdd = this.individualsPerGroup - currentCount;
                    for (let i = 0; i < toAdd; i++) {
                        // Get a new base value similar to existing ones
                        const baseVal = baseGroupMean + d3.randomNormal(0, 2)();
                        this.baseDataset.push({
                            group: g,
                            value: baseVal,
                            baseValue: baseVal,
                            index: currentCount + i
                        });
                    }
                } else if (currentCount > this.individualsPerGroup) {
                    // We need to remove some individuals
                    // Filter the dataset to keep only the desired number
                    // Sort by index to keep removing from the end
                    const sortedData = [...groupData].sort((a, b) => a.index - b.index);
                    const toKeep = sortedData.slice(0, this.individualsPerGroup);

                    // Filter out this group entirely and then add back the ones to keep
                    this.baseDataset = this.baseDataset.filter(d => d.group !== g);
                    this.baseDataset = this.baseDataset.concat(toKeep);
                }
            });
        }

        // transform the base values using stored random group effects
        this.dataset = this.baseDataset.map(d => {
            const baseEffect = this.treatmentEffect * 5;
            const groupEffect = this.groupEffects[d.group] * baseEffect;
            const baseMean = groupEffect;
            const baseGroupMean = d3.mean(this.baseDataset.filter(bd => bd.group === d.group),
                bd => bd.baseValue);
            const deviation = (d.baseValue - baseGroupMean) * this.populationVariability;
            return {
                ...d,
                value: baseMean + deviation
            };
        });

        this.computeSS();
        updateAll();
    },
    computeSS: function () {
        // compute group means and grand mean
        const groups = d3.group(this.dataset, d => d.group);
        let groupStats = [];
        groups.forEach((vals, key) => {
            let mean = d3.mean(vals, d => d.value);
            groupStats.push({ group: key, mean: mean, count: vals.length });
        });
        this.groupStats = groupStats;
        this.grandMean = d3.mean(this.dataset, d => d.value);

        // total sum of squares
        this.ssTotal = d3.sum(this.dataset, d => Math.pow(d.value - this.grandMean, 2));
        // within-group sum of squares
        this.ssWithin = 0;
        groups.forEach((vals, key) => {
            let gMean = groupStats.find(g => g.group == key).mean;
            this.ssWithin += d3.sum(vals, d => Math.pow(d.value - gMean, 2));
        });
        // between-group sum of squares
        this.ssBetween = d3.sum(groupStats, g => g.count * Math.pow(g.mean - this.grandMean, 2));
    }
};

// basic pub/sub mechanism so that components update reactively
const subscribers = [];
function subscribe(callback) { subscribers.push(callback); }
function updateAll() { subscribers.forEach(cb => cb()); }
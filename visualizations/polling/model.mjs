// Teaching defaults live here; sampling logic is independent of the page and chart.
export const config = {
  populationSize: 50,
  populationProportionBlue: 0.5,
  sampleSize: 6,
  samplingMode: 'without-replacement',
  continuousSamplingSpeed: 150,
  manualCardRevealSpeed: 100,
  histogramBinCount: 101,
  initialYAxisMax: 20,
  maxSampleCards: 20,
  showPopulation: true,
  showTrueParameterLine: true,
  showRunningMean: true,
  showEmpiricalSD: false,
  showNormalApproximation: false,
  bulkSampleOptions: [100, 1000],
  sampleSizeOptions: [6, 10, 20, 50, 100, 400]
};

export class PollingModel {
  constructor(options = {}, random = Math.random) {
    this.options = { ...config, ...options };
    this.random = random;
    this.reset();
  }

  get finite() {
    return this.options.samplingMode === 'without-replacement'
      && this.options.sampleSize <= this.options.populationSize;
  }
  get bluePopulation() {
    return Math.round(this.options.populationSize * this.options.populationProportionBlue);
  }
  get p() {
    return this.finite ? this.bluePopulation / this.options.populationSize
      : this.options.populationProportionBlue;
  }
  get theoreticalSD() {
    const { sampleSize: n, populationSize: N } = this.options;
    const correction = this.finite ? (N > 1 ? (N - n) / (N - 1) : 0) : 1;
    return Math.sqrt(this.p * (1 - this.p) / n * correction);
  }
  get empiricalSD() {
    return this.count > 1 ? Math.sqrt(this.m2 / (this.count - 1)) : null;
  }
  reset(changes = {}) {
    Object.assign(this.options, changes);
    this.counts = new Array(this.options.sampleSize + 1).fill(0);
    this.count = 0;
    this.mean = 0;
    this.m2 = 0;
    this.last = null;
  }
  draw() {
    const { sampleSize: n, populationSize: N } = this.options;
    let blue = 0;
    const cards = [];
    const populationIndices = [];
    // Shuffle only the drawn part of a fresh deck, retaining each person's identity.
    const deck = this.finite ? Array.from({ length: N }, (_, index) => index) : null;
    for (let i = 0; i < n; i++) {
      let isBlue;
      if (deck) {
        const chosen = i + Math.floor(this.random() * (N - i));
        [deck[i], deck[chosen]] = [deck[chosen], deck[i]];
        populationIndices.push(deck[i]);
        isBlue = deck[i] < this.bluePopulation;
      } else {
        isBlue = this.random() < this.p;
      }
      if (isBlue) blue++;
      if (n <= this.options.maxSampleCards) cards.push(isBlue);
    }
    const proportion = blue / n;
    this.counts[blue]++;
    this.count++;
    const delta = proportion - this.mean;
    this.mean += delta / this.count;
    this.m2 += delta * (proportion - this.mean);
    this.last = { blue, proportion, cards, populationIndices };
    return this.last;
  }
  bins() {
    const n = this.options.sampleSize;
    // Center equal-width bins on 0% and 100%, including full end bins.
    // An odd step that divides n gives every bin the same outcomes, no outcome on a
    // bin edge, and (for even n) a bin centered on exactly 50%.
    const maxBins = this.options.histogramBinCount;
    let step = Math.max(1, Math.ceil((n + 1) / maxBins));
    for (let s = 1; s <= n; s += 2) {
      if (n % s === 0 && n / s + 1 <= maxBins) { step = s; break; }
    }
    const intervals = Math.max(1, Math.round(n / step));
    const width = 1 / intervals;
    const bins = Array.from({ length: intervals + 1 }, (_, index) => ({
      key: index, x: index * width,
      left: (index - 0.5) * width,
      right: (index + 0.5) * width,
      width, count: 0
    }));
    for (let k = 0; k <= n; k++) {
      bins[Math.round(k / n * intervals)].count += this.counts[k];
    }
    return bins;
  }
}

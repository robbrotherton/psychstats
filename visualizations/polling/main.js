import { config, PollingModel } from './model.mjs?v=4';

const d3 = window.d3;
const model = new PollingModel();
const byId = id => document.getElementById(id);
const percent = d3.format('.0%');
const estimate = d3.format('.1%');
const number = d3.format(',');
const sampleCards = byId('sample-cards');
const drawButton = byId('poll-draw');
const playButton = byId('poll-play');
const normalInput = byId('poll-normal');
const proportionInput = byId('poll-proportion');
const sizeInput = byId('poll-size');
let playing = false;
let timer;
let reveals = [];
let busy = false;
let width = 850;
const height = 350;
const margin = { left: 55, right: 22, top: 38, bottom: 65 };

const svg = d3.select('#poll-plot').append('svg')
  .attr('role', 'img').attr('aria-labelledby', 'poll-chart-title poll-chart-description');
svg.append('title').attr('id', 'poll-chart-title').text('Sampling distribution of the proportion blue');
const chartDescription = svg.append('desc').attr('id', 'poll-chart-description');
const grid = svg.append('g').attr('class', 'grid');
const marks = svg.append('g');
const curve = svg.append('path').attr('class', 'normal-curve');
const reference = svg.append('line').attr('class', 'true-line');
const referenceLabel = svg.append('text').attr('text-anchor', 'middle');
const xAxis = svg.append('g');
const yAxis = svg.append('g');
const xLabel = svg.append('text').attr('text-anchor', 'middle').text('Sample proportion blue (p̂)');
const yLabel = svg.append('text').text('Polls');
const emptyLabel = svg.append('text').attr('text-anchor', 'middle');

for (const n of config.sampleSizeOptions) {
  sizeInput.add(new Option(String(n), String(n), false, n === config.sampleSize));
}
for (const n of config.bulkSampleOptions) {
  const button = document.createElement('button');
  button.className = 'btn btn-outline-primary';
  button.textContent = `+${number(n)}`;
  button.setAttribute('aria-label', `Add ${number(n)} polls`);
  button.addEventListener('click', () => {
    stop();
    cancelReveal();
    for (let i = 0; i < n; i++) model.draw();
    showSample(model.last);
    render();
  });
  byId('bulk-controls').append(button);
}
normalInput.checked = config.showNormalApproximation;
proportionInput.value = config.populationProportionBlue * 100;
byId('running-mean').hidden = !config.showRunningMean;
byId('empirical-sd').hidden = !config.showEmpiricalSD;

function card(isBlue, blank = false) {
  const element = document.createElement('div');
  element.className = `playing-card-container playing-card-${isBlue ? 'blue' : 'red'}`;
  element.classList.toggle('playing-card-blank', blank);
  element.setAttribute('aria-label', blank ? 'Unrevealed card' : isBlue ? 'Blue' : 'Red');
  return element;
}

function population() {
  const { populationSize: N } = model.options;
  byId('poll-p-label').textContent = percent(model.p);
  byId('population-description').textContent = model.finite
    ? `${number(N)} people — ${model.bluePopulation} blue, ${N - model.bluePopulation} red · true p = ${percent(model.p)}`
    : `A very large population · ${percent(model.p)} support blue · true p = ${percent(model.p)}`;
  const deck = byId('population-cards');
  deck.hidden = !config.showPopulation;
  deck.replaceChildren();
  // In large-population mode these cards illustrate composition, not population size.
  const shown = model.finite ? N : Math.min(N, 100);
  deck.classList.remove('has-sample');
  for (let i = 0; i < shown; i++) deck.append(card(i < Math.round(shown * model.p)));
  deck.style.gridTemplateColumns = ''; // Responsive CSS supplies the column count.
  byId('sampling-note').textContent = model.finite
    ? model.options.sampleSize === N
      ? 'A census: polling everyone gives the exact population proportion every time.'
      : 'Draw distinct people without replacement. Outlined cards show this poll; return them before the next poll.'
    : 'The cards illustrate the population mix. Each poll samples independently from a very large population.';
}

function cancelReveal() {
  reveals.forEach(clearTimeout);
  reveals = [];
  busy = false;
  drawButton.disabled = playing;
}

function blankSample() {
  const compact = model.options.sampleSize > config.maxSampleCards;
  sampleCards.hidden = compact;
  byId('sample-bar').hidden = !compact;
  sampleCards.replaceChildren();
  if (!compact) {
    for (let i = 0; i < model.options.sampleSize; i++) sampleCards.append(card(true, true));
  }
  const bar = byId('sample-bar');
  bar.children[0].style.width = '0%';
  bar.children[1].style.width = '0%';
  byId('current-poll').textContent = 'Draw a sample to estimate the proportion blue.';
}

function showSample(sample, animate = false) {
  const { sampleSize: n } = model.options;
  const deck = byId('population-cards');
  deck.classList.toggle('has-sample', model.finite);
  for (const element of deck.children) element.classList.remove('is-selected');
  const highlight = index => deck.children[index]?.classList.add('is-selected');
  if (model.finite && !animate) sample.populationIndices.forEach(highlight);
  if (n <= config.maxSampleCards) {
    sampleCards.replaceChildren(...sample.cards.map(blue => card(blue, animate)));
    if (animate) sampleCards.childNodes.forEach((element, i) => {
      reveals.push(setTimeout(() => {
        element.classList.remove('playing-card-blank');
        element.setAttribute('aria-label', sample.cards[i] ? 'Blue' : 'Red');
        if (model.finite) highlight(sample.populationIndices[i]);
      }, (i + 1) * config.manualCardRevealSpeed));
    });
  } else {
    const bar = byId('sample-bar');
    bar.children[0].style.width = percent(sample.proportion);
    bar.children[1].style.width = percent(1 - sample.proportion);
    bar.setAttribute('aria-label', `${sample.blue} blue and ${n - sample.blue} red`);
  }
  const complete = () => {
    byId('current-poll').textContent = `${sample.blue} of ${n} blue → sample estimate = ${estimate(sample.proportion)}`;
    busy = false;
    drawButton.disabled = playing;
    render();
  };
  if (animate) {
    byId('current-poll').textContent = 'Drawing a new poll…';
    reveals.push(setTimeout(complete, (n + 1) * config.manualCardRevealSpeed));
  } else complete();
}

function draw(manual = false) {
  if (busy) return;
  cancelReveal();
  const animate = manual && model.options.sampleSize <= config.maxSampleCards
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  busy = animate;
  drawButton.disabled = animate || playing;
  showSample(model.draw(), animate);
}

function stop() {
  clearTimeout(timer);
  playing = false;
  playButton.className = 'btn btn-outline-success';
  playButton.innerHTML = '<i class="bi bi-play" aria-hidden="true"></i>';
  playButton.setAttribute('aria-label', 'Start continuous sampling');
  playButton.setAttribute('aria-pressed', 'false');
  drawButton.disabled = busy;
  byId('current-poll').setAttribute('aria-live', 'polite');
}

playButton.addEventListener('click', () => {
  if (playing) { stop(); return; }
  cancelReveal();
  playing = true;
  drawButton.disabled = true;
  playButton.className = 'btn btn-danger';
  playButton.innerHTML = '<i class="bi bi-stop" aria-hidden="true"></i>';
  playButton.setAttribute('aria-label', 'Stop continuous sampling');
  playButton.setAttribute('aria-pressed', 'true');
  byId('current-poll').setAttribute('aria-live', 'off');
  let ticks = 0;
  const tick = () => {
    draw();
    if (playing) timer = setTimeout(tick, ++ticks < 8 ? 500 : config.continuousSamplingSpeed);
  };
  tick();
});
drawButton.addEventListener('click', () => draw(true));

function reset(changes = {}) {
  stop();
  cancelReveal();
  model.reset(changes);
  population();
  blankSample();
  render();
}
byId('poll-reset').addEventListener('click', () => reset());
sizeInput.addEventListener('change', () => reset({ sampleSize: Number(sizeInput.value) }));
proportionInput.addEventListener('input', () => reset({ populationProportionBlue: Number(proportionInput.value) / 100 }));
normalInput.addEventListener('change', render);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', () => { stop(); cancelReveal(); });

function render() {
  const bins = model.bins();
  const n = model.options.sampleSize;
  const maxCount = d3.max(bins, b => b.count) || 0;
  const binWidth = bins[0].width;
  const x = d3.scaleLinear().domain([-binWidth / 2, 1 + binWidth / 2])
    .range([margin.left, width - margin.right]);
  const sd = model.theoreticalSD;
  const density = value => Math.exp(-0.5 * ((value - model.p) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  const showCurve = normalInput.checked && sd > 0 && model.count > 0;
  const peak = showCurve ? model.count * binWidth * density(model.p) : 0;
  const tallest = Math.max(maxCount, peak);
  const yMax = tallest <= config.initialYAxisMax ? config.initialYAxisMax : tallest * 1.12;
  const y = d3.scaleLinear().domain([0, yMax])
    .nice().range([height - margin.bottom, margin.top]);
  svg.attr('viewBox', `0 0 ${width} ${height}`);
  grid.attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(''));
  const ticks = n <= 10
    ? d3.range(n + 1).filter(k => width >= 500 || n <= 6 || k % 2 === 0).map(k => k / n)
    : d3.range(0, 1.01, .2);
  xAxis.attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(ticks).tickFormat(percent));
  yAxis.attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(value => Number.isInteger(value) ? number(value) : ''));
  xLabel.attr('x', (margin.left + width - margin.right) / 2).attr('y', height - 15);
  yLabel.attr('x', margin.left).attr('y', 19);

  marks.selectAll('rect').data(bins, b => b.key).join('rect')
    .attr('class', 'poll-mark').attr('x', b => x(b.left))
    .attr('width', b => Math.max(1, x(b.right) - x(b.left) - 1))
    .attr('y', b => y(b.count)).attr('height', b => y(0) - y(b.count))
    .selectAll('title').data(b => [b]).join('title')
    .text(b => `${percent(Math.max(0, b.left))}–${percent(Math.min(1, b.right))} blue: ${number(b.count)} polls`);

  reference.attr('x1', x(model.p)).attr('x2', x(model.p))
    .attr('y1', margin.top).attr('y2', height - margin.bottom)
    .attr('visibility', config.showTrueParameterLine ? 'visible' : 'hidden');
  referenceLabel.attr('x', Math.max(margin.left + 100, Math.min(width - margin.right - 100, x(model.p))))
    .attr('y', margin.top - 13).text(`True p = ${percent(model.p)}`)
    .attr('visibility', config.showTrueParameterLine ? 'visible' : 'hidden');
  // Include dense points around the center even when the distribution is very narrow.
  const points = showCurve ? [...new Set([...d3.range(501).map(i => i / 500),
    ...d3.range(-60, 61).map(i => model.p + i * sd / 10).filter(v => v >= 0 && v <= 1)])].sort((a, b) => a - b) : [];
  curve.attr('d', showCurve ? d3.line().x(v => x(v)).y(v => y(model.count * binWidth * density(v)))(points) : null);
  byId('normal-note').hidden = !normalInput.checked;
  byId('normal-note').textContent = sd === 0
    ? 'A census has no sampling variability, so there is no bell curve to overlay.'
    : `Normal approximation (red line)${model.finite ? ', with the finite-population correction' : ''}. It can fit poorly for small samples or proportions near 0 or 1.`;
  emptyLabel.attr('x', (margin.left + width - margin.right) / 2).attr('y', 155)
    .text(model.count ? '' : 'Draw polls to build the distribution.');
  byId('plot-note').textContent = 'Each poll adds one to a bar. The vertical scale starts at 20 polls and expands as the bars grow.';
  byId('poll-count').textContent = number(model.count);
  byId('poll-average').textContent = model.count ? estimate(model.mean) : '—';
  byId('poll-sd').textContent = model.empiricalSD === null ? '—' : estimate(model.empiricalSD);
  chartDescription.text(`${number(model.count)} polls of ${n} people. True proportion ${percent(model.p)}.`
    + (model.count ? ` Average estimate ${estimate(model.mean)}.` : ' No samples yet.'));
}

const observer = new ResizeObserver(entries => {
  width = Math.max(320, entries[0].contentRect.width);
  render();
});
observer.observe(byId('poll-plot'));
reset();

const CONFIG = {
  // Supabase project URL, e.g. https://YOURPROJECT.supabase.co
  supabaseUrl: "https://sazppibdmsmjusnlvuoq.supabase.co",
  // Supabase anon public key.
  supabaseAnonKey: "sb_publishable_d1UsWrJ7-xxBRkDaqax2Zw_BUQjJS1L",
  // Table for inserts and RPC for aggregated histogram.
  responsesTable: "personality_responses",
  sumHistogramRpc: "get_sum_histogram",
  choiceDistributionRpc: "get_personality_distributions",
  // Submit button UX delay (milliseconds) before results refresh.
  postSubmitDelayMs: 800,
  // Number of images shown per set.
  sampleSize: 6
};

const ROCK_OPTIONS = [
  { name: "basalt", file: "basalt.jpg" },
  { name: "diorite", file: "diorite.jpg" },
  { name: "gabbro", file: "gabbro.jpg" },
  { name: "gneiss", file: "gneiss.jpg" },
  { name: "rhyolite", file: "rhyolite.jpg" },
  { name: "schist", file: "schist.jpg" }
];

const SOIL_OPTIONS = [
  { name: "chalky", file: "chalky.webp" },
  { name: "clay", file: "clay.webp" },
  { name: "loam", file: "loam.webp" },
  { name: "peat", file: "peat.webp" },
  { name: "sand", file: "sand.webp" },
  { name: "silty", file: "silty.webp" }
];

const CATEGORY_PATHS = {
  rock: "images/rocks",
  soil: "images/soil"
};

const FILTER_MODES = {
  ALL: "all",
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  CUSTOM: "custom"
};

const DISTRIBUTION_SERIES = {
  ROCK_NAME: "rock_name",
  ROCK_NUMBER: "rock_number",
  SOIL_NAME: "soil_name",
  SOIL_NUMBER: "soil_number"
};

const state = {
  order: null,
  submittedSelection: null,
  picks: {
    rock: null,
    soil: null
  },
  filter: {
    mode: FILTER_MODES.ALL,
    customStart: "",
    customEnd: ""
  }
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  const requiredIds = ["pt-submit-response", "pt-show-results", "pt-rock-grid", "pt-soil-grid"];
  const hasAllRequired = requiredIds.every((id) => document.getElementById(id));
  if (!hasAllRequired) {
    return;
  }

  wireEvents();
  if (!hasEnoughImages()) {
    return;
  }

  state.order = makeFreshOrder();
  showConfigWarnings();
  updateFilterControlsUI();
  syncCustomInputsToState();
  renderAll();
  updateSelectionFlow();
}

function wireEvents() {
  bindClick("pt-submit-response", onSubmitResponse);
  bindClick("pt-show-results", onShowResults);
  bindClick("pt-refresh-results", onRefreshResults);
  bindClick("pt-back-to-form", onBackToForm);

  bindChange("pt-filter-mode", onFilterModeChange);
  bindClick("pt-edit-custom-filter", onEditCustomFilter);
  bindClick("pt-save-custom-filter", onSaveCustomFilter);
  bindClick("pt-cancel-custom-filter", onCancelCustomFilter);
}

function showConfigWarnings() {
  const warnings = [];
  const supabaseUrl = String(CONFIG.supabaseUrl || "").trim();
  const supabaseAnonKey = String(CONFIG.supabaseAnonKey || "").trim();

  if (!isHttpsUrl(supabaseUrl)) {
    warnings.push("Set CONFIG.supabaseUrl to your https://...supabase.co project URL.");
  }
  if (!supabaseAnonKey) {
    warnings.push("Set CONFIG.supabaseAnonKey (public anon key).");
  }
  if (!CONFIG.responsesTable) {
    warnings.push("Set CONFIG.responsesTable.");
  }
  if (!CONFIG.sumHistogramRpc) {
    warnings.push("Set CONFIG.sumHistogramRpc.");
  }
  if (!CONFIG.choiceDistributionRpc) {
    warnings.push("Set CONFIG.choiceDistributionRpc.");
  }

  if (warnings.length > 0) {
    showWarning(warnings.join(" "));
  }
}

async function onSubmitResponse() {
  setSubmitStatus("");

  if (!isSupabaseConfigured()) {
    setSubmitStatus("Supabase is not configured yet.", true);
    return;
  }

  if (state.picks.rock === null || state.picks.soil === null) {
    setSubmitStatus("Select one rock and one soil before submitting.", true);
    return;
  }

  const payload = makeSubmissionPayload();
  const submitButton = document.getElementById("pt-submit-response");
  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    setSubmitStatus("Submitting", false, true);
    await insertResponse(payload);

    setSubmitStatus("Submitted. Updating results", false, true);
    await sleep(CONFIG.postSubmitDelayMs);
    setSubmitStatus("Submitted.");

    state.submittedSelection = buildSubmittedSelection();

    renderSubmittedSummary();
    setHidden("pt-selection-layout", true);
    setHidden("pt-form-view", true);
    setHidden("pt-results-view", false);
    setHidden("pt-filter-controls", false);

    revealAboutSection();
    updateFilterControlsUI();
    await onRefreshResults();
  } catch (error) {
    setSubmitStatus(`Submit failed (${error.message}).`, true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function onShowResults() {
  renderSubmittedSummary();
  setHidden("pt-selection-layout", true);
  setHidden("pt-form-view", true);
  setHidden("pt-results-view", false);
  setHidden("pt-filter-controls", false);
  revealAboutSection();
  updateFilterControlsUI();
  onRefreshResults();
}

function onBackToForm() {
  state.picks.rock = null;
  state.picks.soil = null;
  state.submittedSelection = null;

  resetFilterState();
  closeCustomFilterModal();
  syncCustomInputsToState();
  updateFilterControlsUI();

  setFilterMeta("");
  setSubmitStatus("");

  setHidden("pt-selection-layout", false);
  setHidden("pt-form-view", false);
  setHidden("pt-results-view", true);
  setHidden("pt-custom-results", true);
  setHidden("pt-submitted-summary", true);

  renderAll();
  updateSelectionFlow();
}

function onFilterModeChange(event) {
  state.filter.mode = event.target.value;
  updateFilterControlsUI();

  if (state.filter.mode === FILTER_MODES.CUSTOM) {
    seedCustomRangeIfEmpty();
    syncCustomInputsToState();
    openCustomFilterModal();
  }

  onRefreshResults();
}

function onEditCustomFilter() {
  if (state.filter.mode !== FILTER_MODES.CUSTOM) {
    return;
  }
  syncCustomInputsToState();
  openCustomFilterModal();
}

function onSaveCustomFilter() {
  const start = getInputValue("pt-custom-start");
  const end = getInputValue("pt-custom-end");

  if (!start || !end) {
    setFilterMeta("Set both custom start and end dates.", true);
    return;
  }
  if (start > end) {
    setFilterMeta("Custom start date must be before end date.", true);
    return;
  }

  state.filter.customStart = start;
  state.filter.customEnd = end;

  closeCustomFilterModal();
  setFilterMeta("");
  onRefreshResults();
}

function onCancelCustomFilter() {
  syncCustomInputsToState();
  closeCustomFilterModal();
}

async function onRefreshResults() {
  if (!isSupabaseConfigured()) {
    showWarning("Supabase not configured. Add CONFIG.supabaseUrl and CONFIG.supabaseAnonKey.");
    return;
  }

  try {
    const range = resolveActiveFilterRange();
    if (range.error) {
      setFilterMeta(range.error, true);
      return;
    }

    setFilterMeta("");

    const [filteredRows, allRows, distributionRows] = await Promise.all([
      fetchSumHistogram(range.startDate, range.endDate),
      fetchSumHistogram(null, null),
      fetchChoiceDistributions(range.startDate, range.endDate)
    ]);

    const filteredCounts = mapHistogramRowsToCounts(filteredRows);
    const allCounts = mapHistogramRowsToCounts(allRows);

    const filteredTotal = filteredCounts.reduce((a, b) => a + b, 0);
    const allTotal = allCounts.reduce((a, b) => a + b, 0);

    setHidden("pt-custom-results", false);
    renderSumHistogram("pt-sum-chart", filteredCounts, getHighlightedSum());
    renderChoiceCharts(distributionRows);
    setFilterMeta(`${range.label}: showing ${filteredTotal} of ${allTotal} responses.`);
  } catch (error) {
    showWarning(`Results load error: ${error.message}`);
  }
}

function renderAll() {
  renderGrid("pt-soil-grid", "soil", CATEGORY_PATHS.soil, state.order.soil);
  renderGrid("pt-rock-grid", "rock", CATEGORY_PATHS.rock, state.order.rock);
  updatePickLabels();
}

function renderGrid(containerId, type, basePath, options) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.replaceChildren();

  options.forEach((option, index) => {
    const number = index + 1;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pt-image-card";
    button.dataset.type = type;
    button.dataset.number = String(number);
    if (state.picks[type] === number) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      state.picks[type] = number;
      markSelectedInContainer(container, number);
      updatePickLabels();
      updateSelectionFlow();
    });

    const badge = document.createElement("span");
    badge.className = "pt-number-badge";
    badge.textContent = String(number);

    const image = document.createElement("img");
    image.loading = "lazy";
    image.alt = option.name;
    setImageSource(image, basePath, option.file);

    const caption = document.createElement("span");
    caption.className = "pt-image-name";
    caption.textContent = formatOptionName(option.name, type);

    button.appendChild(badge);
    button.appendChild(image);
    button.appendChild(caption);
    container.appendChild(button);
  });
}

function renderSubmittedSummary() {
  const summary = state.submittedSelection;
  if (!summary) {
    setHidden("pt-submitted-summary", true);
    return;
  }

  setHidden("pt-submitted-summary", false);
  setSummaryCard("soil", summary.soil, summary.soilNumber);
  setSummaryCard("rock", summary.rock, summary.rockNumber);

  const sumNode = document.getElementById("pt-summary-sum");
  if (sumNode) {
    sumNode.textContent = String(summary.sum);
  }
}

function setSummaryCard(type, option, number) {
  const imageId = `pt-summary-${type}-img`;
  const textId = `pt-summary-${type}-text`;
  const image = document.getElementById(imageId);
  const text = document.getElementById(textId);
  const basePath = type === "rock" ? CATEGORY_PATHS.rock : CATEGORY_PATHS.soil;

  if (image) {
    setImageSource(image, basePath, option.file);
  }
  if (text) {
    text.replaceChildren();
    text.classList.add("pt-summary-choice");

    const badge = document.createElement("span");
    badge.className = "pt-number-badge";
    badge.textContent = String(number);

    const label = document.createElement("span");
    label.className = "pt-summary-choice-name";
    label.textContent = formatOptionName(option.name, type);

    text.appendChild(badge);
    text.appendChild(label);
  }
}

function updatePickLabels() {
  const rock = state.picks.rock === null ? null : getSelectedOption("rock");
  const soil = state.picks.soil === null ? null : getSelectedOption("soil");

  const rockText = rock ? `#${state.picks.rock} (${formatOptionName(rock.name, "rock")})` : "none";
  const soilText = soil ? `#${state.picks.soil} (${formatOptionName(soil.name, "soil")})` : "none";

  const rockPick = document.getElementById("pt-rock-pick");
  const soilPick = document.getElementById("pt-soil-pick");

  if (rockPick) {
    rockPick.textContent = `Selected rock: ${rockText}`;
  }
  if (soilPick) {
    soilPick.textContent = `Selected soil: ${soilText}`;
  }
}

function updateSelectionFlow() {
  const hasSoil = state.picks.soil !== null;
  const hasRock = state.picks.rock !== null;
  setHidden("pt-step-rock", !hasSoil);

  const submitButton = document.getElementById("pt-submit-response");
  if (submitButton) {
    submitButton.disabled = !(hasSoil && hasRock);
  }
}

function revealAboutSection() {
  setHidden("pt-about-section", false);
}

function markSelectedInContainer(container, number) {
  container.querySelectorAll(".pt-image-card.selected").forEach((element) => {
    element.classList.remove("selected");
  });

  const selected = container.querySelector(`.pt-image-card[data-number="${number}"]`);
  if (selected) {
    selected.classList.add("selected");
  }
}

function getHighlightedSum() {
  if (state.submittedSelection && Number.isInteger(state.submittedSelection.sum)) {
    return state.submittedSelection.sum;
  }
  return null;
}

function renderSumHistogram(containerId, counts, highlightedSum) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  if (!window.d3) {
    showWarning("D3 is not loaded.");
    return;
  }

  container.replaceChildren();

  const d3 = window.d3;
  const data = counts.map((count, index) => {
    const sum = index + 2;
    let base = count;
    let highlight = 0;

    if (highlightedSum === sum && count > 0) {
      base = count - 1;
      highlight = 1;
    }

    return { sum, count, base, highlight };
  });

  const margin = { top: 52, right: 20, bottom: 55, left: 45 };
  const width = 760;
  const height = 360;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.sum))
    .range([0, innerWidth])
    .padding(0.12);

  const yMaxCount = Math.max(1, d3.max(data, (d) => d.count) || 1);
  const yStep = chooseCountTickStep(yMaxCount, 6);
  const yUpper = Math.max(1, Math.ceil(yMaxCount / yStep) * yStep);
  const yTickValues = [];
  for (let value = 0; value <= yUpper; value += yStep) {
    yTickValues.push(value);
  }

  const y = d3.scaleLinear().domain([0, yUpper]).range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g").call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format("d")));

  g.selectAll(".bar-base")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.sum))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.base))
    .attr("height", (d) => y(0) - y(d.base))
    .attr("fill", "#6a9cf4");

  g.selectAll(".bar-highlight")
    .data(data.filter((d) => d.highlight > 0))
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.sum))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.count))
    .attr("height", (d) => y(d.base) - y(d.count))
    .attr("fill", "#d63b3b");

  g.append("text")
    .attr("class", "pt-axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Sum score");

  g.append("text")
    .attr("class", "pt-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -32)
    .attr("text-anchor", "middle")
    .text("Count");

  if (highlightedSum !== null) {
    const highlightedBar = data.find((d) => d.sum === highlightedSum && d.count > 0);
    if (highlightedBar) {
      const xCenter = x(highlightedBar.sum) + x.bandwidth() / 2;
      const yTop = y(highlightedBar.count);

      g.append("text")
        .attr("x", xCenter)
        .attr("y", yTop - 30)
        .attr("fill", "#d63b3b")
        .attr("text-anchor", "middle")
        .style("font-size", "0.9rem")
        .style("font-weight", "700")
        .text("YOU!");

      g.append("line")
        .attr("x1", xCenter)
        .attr("x2", xCenter)
        .attr("y1", yTop - 24)
        .attr("y2", yTop - 8)
        .attr("stroke", "#d63b3b")
        .attr("stroke-width", 2);

      g.append("path")
        .attr("d", `M ${xCenter - 5} ${yTop - 10} L ${xCenter + 5} ${yTop - 10} L ${xCenter} ${yTop - 2} Z`)
        .attr("fill", "#d63b3b");
    }
  }
}

function renderChoiceCharts(distributionRows) {
  const seriesMap = mapDistributionRows(distributionRows);

  const soilNames = SOIL_OPTIONS.map((option) => option.name);
  const rockNames = ROCK_OPTIONS.map((option) => option.name);

  const soilNameData = buildNameDistributionData(
    soilNames,
    seriesMap.get(DISTRIBUTION_SERIES.SOIL_NAME),
    "soil",
    { appendSoil: false }
  );
  const rockNameData = buildNameDistributionData(
    rockNames,
    seriesMap.get(DISTRIBUTION_SERIES.ROCK_NAME),
    "rock"
  );
  const soilNumberData = buildNumberDistributionData(
    CONFIG.sampleSize,
    seriesMap.get(DISTRIBUTION_SERIES.SOIL_NUMBER)
  );
  const rockNumberData = buildNumberDistributionData(
    CONFIG.sampleSize,
    seriesMap.get(DISTRIBUTION_SERIES.ROCK_NUMBER)
  );

  renderCategoryBarChart("pt-soil-name-chart", soilNameData, {
    barColor: "#f28e2b",
    rotateLabels: true
  });
  renderCategoryBarChart("pt-soil-number-chart", soilNumberData, {
    barColor: "#e15759"
  });
  renderCategoryBarChart("pt-rock-name-chart", rockNameData, {
    barColor: "#4e79a7",
    rotateLabels: true
  });
  renderCategoryBarChart("pt-rock-number-chart", rockNumberData, {
    barColor: "#59a14f"
  });
}

function mapDistributionRows(rows) {
  const seriesMap = new Map([
    [DISTRIBUTION_SERIES.ROCK_NAME, new Map()],
    [DISTRIBUTION_SERIES.ROCK_NUMBER, new Map()],
    [DISTRIBUTION_SERIES.SOIL_NAME, new Map()],
    [DISTRIBUTION_SERIES.SOIL_NUMBER, new Map()]
  ]);

  rows.forEach((row) => {
    const series = String(row.series || "");
    const label = String(row.label || "");
    const count = Number(row.count || 0);

    if (!seriesMap.has(series) || !label || Number.isNaN(count)) {
      return;
    }

    seriesMap.get(series).set(label, count);
  });

  return seriesMap;
}

function buildNameDistributionData(names, seriesCounts, type, options = {}) {
  const rows = names.map((name) => ({
    label: formatOptionName(name, type, options),
    count: seriesCounts && seriesCounts.has(name) ? Number(seriesCounts.get(name)) : 0
  }));

  return rows.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label);
  });
}

function buildNumberDistributionData(maxNumber, seriesCounts) {
  const rows = [];
  for (let number = 1; number <= maxNumber; number += 1) {
    const key = String(number);
    rows.push({
      label: key,
      count: seriesCounts && seriesCounts.has(key) ? Number(seriesCounts.get(key)) : 0
    });
  }
  return rows;
}

function renderCategoryBarChart(containerId, rows, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  if (!window.d3) {
    showWarning("D3 is not loaded.");
    return;
  }

  container.replaceChildren();

  const d3 = window.d3;
  const data = rows.map((row) => ({
    label: String(row.label),
    count: Math.max(0, Number(row.count) || 0)
  }));

  const rotateLabels = Boolean(options.rotateLabels);
  const margin = {
    top: 18,
    right: 14,
    bottom: rotateLabels ? 76 : 52,
    left: 42
  };
  const width = 540;
  const height = 275;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerWidth])
    .padding(0.18);

  const yMaxCount = Math.max(1, d3.max(data, (d) => d.count) || 1);
  const yStep = chooseCountTickStep(yMaxCount, 5);
  const yUpper = Math.max(1, Math.ceil(yMaxCount / yStep) * yStep);
  const yTickValues = [];
  for (let value = 0; value <= yUpper; value += yStep) {
    yTickValues.push(value);
  }

  const y = d3.scaleLinear().domain([0, yUpper]).range([innerHeight, 0]);

  const xAxis = g.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  if (rotateLabels) {
    xAxis
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end")
      .attr("dx", "-0.45em")
      .attr("dy", "0.3em");
  }

  const yAxis = g.append("g").call(d3.axisLeft(y).tickValues(yTickValues).tickFormat(d3.format("d")));
  xAxis.selectAll(".tick text").style("font-size", "0.95rem");
  yAxis.selectAll(".tick text").style("font-size", "0.95rem");

  g.selectAll(".pt-bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "pt-bar")
    .attr("x", (d) => x(d.label))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.count))
    .attr("height", (d) => y(0) - y(d.count))
    .attr("fill", options.barColor || "#4e79a7");

  if (options.xLabel) {
    g.append("text")
      .attr("class", "pt-axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + (rotateLabels ? 58 : 40))
      .attr("text-anchor", "middle")
      .text(options.xLabel);
  }

  g.append("text")
    .attr("class", "pt-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text("Count");
}

function resolveActiveFilterRange() {
  if (state.filter.mode === FILTER_MODES.ALL) {
    return { startDate: null, endDate: null, label: "All time" };
  }

  if (state.filter.mode === FILTER_MODES.TODAY) {
    const today = dateKeyToday();
    return { startDate: today, endDate: today, label: "Today" };
  }

  if (state.filter.mode === FILTER_MODES.WEEK) {
    return {
      startDate: dateKeyDaysAgo(6),
      endDate: dateKeyToday(),
      label: "Past week"
    };
  }

  if (state.filter.mode === FILTER_MODES.MONTH) {
    return {
      startDate: dateKeyDaysAgo(29),
      endDate: dateKeyToday(),
      label: "Past month"
    };
  }

  const start = state.filter.customStart;
  const end = state.filter.customEnd;
  if (!start || !end) {
    return { error: "Set both custom start and end dates." };
  }
  if (start > end) {
    return { error: "Custom start date must be before end date." };
  }

  return {
    startDate: start,
    endDate: end,
    label: `Custom (${start} to ${end})`
  };
}

function resetFilterState() {
  state.filter.mode = FILTER_MODES.ALL;
  state.filter.customStart = "";
  state.filter.customEnd = "";
}

function seedCustomRangeIfEmpty() {
  if (state.filter.customStart && state.filter.customEnd) {
    return;
  }
  const today = dateKeyToday();
  state.filter.customStart = today;
  state.filter.customEnd = today;
}

function updateFilterControlsUI() {
  const modeSelect = document.getElementById("pt-filter-mode");
  if (modeSelect && modeSelect.value !== state.filter.mode) {
    modeSelect.value = state.filter.mode;
  }

  setHidden("pt-edit-custom-filter", state.filter.mode !== FILTER_MODES.CUSTOM);
}

function openCustomFilterModal() {
  setHidden("pt-custom-filter-modal", false);
}

function closeCustomFilterModal() {
  setHidden("pt-custom-filter-modal", true);
}

function syncCustomInputsToState() {
  setInputValue("pt-custom-start", state.filter.customStart);
  setInputValue("pt-custom-end", state.filter.customEnd);
}

function dateKeyToday() {
  return dateKeyDaysAgo(0);
}

function dateKeyDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return formatDateKey(date);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function chooseCountTickStep(maxValue, targetTickCount = 6) {
  const roughStep = Math.max(1, maxValue / Math.max(1, targetTickCount));
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  if (residual <= 1) {
    return magnitude;
  }
  if (residual <= 2) {
    return 2 * magnitude;
  }
  if (residual <= 2.5 && magnitude >= 10) {
    return 2.5 * magnitude;
  }
  if (residual <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function makeSubmissionPayload() {
  const rock = getSelectedOption("rock");
  const soil = getSelectedOption("soil");

  return {
    rock_name: rock.name,
    rock_number: state.picks.rock,
    soil_name: soil.name,
    soil_number: state.picks.soil
  };
}

function buildSubmittedSelection() {
  if (state.picks.rock === null || state.picks.soil === null) {
    return null;
  }

  const rock = getSelectedOption("rock");
  const soil = getSelectedOption("soil");

  return {
    rock,
    soil,
    rockNumber: state.picks.rock,
    soilNumber: state.picks.soil,
    sum: state.picks.rock + state.picks.soil
  };
}

function getSelectedOption(type) {
  const number = state.picks[type];
  return state.order[type][number - 1];
}

function mapHistogramRowsToCounts(rows) {
  const counts = Array(11).fill(0);

  rows.forEach((row) => {
    const sum = Number(row.sum_score);
    const count = Number(row.count);
    if (!Number.isNaN(sum) && !Number.isNaN(count) && sum >= 2 && sum <= 12) {
      counts[sum - 2] = count;
    }
  });

  return counts;
}

function makeFreshOrder() {
  const allOptions = getAllOptions();
  return {
    rock: sampleOptions(allOptions.rock, CONFIG.sampleSize),
    soil: sampleOptions(allOptions.soil, CONFIG.sampleSize)
  };
}

function hasEnoughImages() {
  const allOptions = getAllOptions();
  const minCount = CONFIG.sampleSize;

  if (allOptions.rock.length < minCount || allOptions.soil.length < minCount) {
    showWarning(`Need at least ${minCount} options in both rock and soil lists.`);
    return false;
  }

  return true;
}

function getAllOptions() {
  return {
    rock: [...ROCK_OPTIONS],
    soil: [...SOIL_OPTIONS]
  };
}

function sampleOptions(options, n) {
  return shuffle(options).slice(0, n);
}

function shuffle(input) {
  const output = [...input];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

async function insertResponse(payload) {
  const url = `${CONFIG.supabaseUrl}/rest/v1/${CONFIG.responsesTable}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
}

async function fetchSumHistogram(startDate, endDate) {
  const url = `${CONFIG.supabaseUrl}/rest/v1/rpc/${CONFIG.sumHistogramRpc}`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchChoiceDistributions(startDate, endDate) {
  const url = `${CONFIG.supabaseUrl}/rest/v1/rpc/${CONFIG.choiceDistributionRpc}`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

function supabaseHeaders() {
  const key = String(CONFIG.supabaseAnonKey || "").trim();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

function isSupabaseConfigured() {
  return isHttpsUrl(String(CONFIG.supabaseUrl || "").trim()) && Boolean(String(CONFIG.supabaseAnonKey || "").trim());
}

function isHttpsUrl(value) {
  return value.startsWith("https://");
}

function showWarning(message) {
  const warning = document.getElementById("pt-config-warning");
  if (warning) {
    warning.hidden = false;
    warning.textContent = message;
  }
}

function setSubmitStatus(message, isError = false, showLoading = false) {
  const status = document.getElementById("pt-submit-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.style.color = isError ? "#b02a37" : "";
  status.classList.toggle("pt-loading-dots", showLoading);
}

function setFilterMeta(message, isError = false) {
  const meta = document.getElementById("pt-filter-meta");
  if (!meta) {
    return;
  }
  meta.textContent = message;
  meta.style.color = isError ? "#b02a37" : "";
}

function setImageSource(image, basePath, fileName) {
  const candidates = unique([
    `${basePath}/${fileName}`,
    `${basePath}/${encodeURI(fileName)}`,
    `${basePath}/${encodeURIComponent(fileName)}`
  ]);

  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      image.onerror = null;
      return;
    }
    image.src = candidates[i];
    i += 1;
  };

  image.onerror = tryNext;
  tryNext();
}

function unique(values) {
  return [...new Set(values)];
}

function formatOptionName(value, type = "", options = {}) {
  const { appendSoil = true } = options;
  const text = String(value || "").replace(/[_-]+/g, " ");
  if (!text) {
    return "";
  }
  const normalized = text.charAt(0).toUpperCase() + text.slice(1);
  if (type === "soil" && appendSoil) {
    return `${normalized} soil`;
  }
  return normalized;
}

function getInputValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = value;
  }
}

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("click", handler);
  }
}

function bindChange(id, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("change", handler);
  }
}

function setHidden(id, hidden) {
  const element = document.getElementById(id);
  if (element) {
    element.hidden = hidden;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

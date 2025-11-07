# Tutorial system (reusable)

This lightweight tutorial engine lets you step explanatory text paragraphs and trigger visualization changes via data attributes on each paragraph.

## Authoring

Wrap your paragraphs in a container with class `tutorial` (or reuse the existing `.about` block). Each `<p>` may include a `data-action` JSON describing what to change when that step becomes active.

Example:

```html
<div class="tutorial">
  <p data-action='{"variability":1}'>Intro to variability…</p>
  <p data-action='{"variability":0, "hiveOffset":20}'>Lower variability and shift hive.</p>
  <p data-action='{"variability":2, "number":100, "advance":1800}'>Increase variability, sample size, and fast-forward.</p>
</div>
```

You do NOT need to add navigation; the engine injects Previous/Next buttons and a progress indicator automatically.

## Wiring

Include the assets after your visualization scripts:

```html
<link rel="stylesheet" href="../tutorial/tutorial.css">
<script src="../tutorial/tutorial.js"></script>
```

By default, the engine uses `window.beesController`. For other pages, pass your own controller:

```js
Tutorial.initAll({ controller: myController });
```

## Action schema

`data-action` accepts a JSON object with these optional keys:
- `variability`: 0 | 1 | 2 (maps to your variability indices)
- `number`: 0 | 1 | 2 | 15 | 50 | 100 (index or explicit count)
- `hiveOffset`: number (pixels; affects Cohen's d)
- `advance`: number (iterations to fast-forward)
- `pause`: true to pause; `play`: true to resume
- `reset`: true to reset histogram/counters
- `layers`: object map of layerName -> visible (e.g., `{ "mean-line": true, "distribution": false }`)

## Controller contract (beesController)

- `setVariability(index)`
- `setNumber(indexOrValue)`
- `setHiveOffset(px)`
- `advance(steps)`
- `pause()`, `play()`
- `resetAll()`
- `toggleLayer(name, visible)`
- `getParams()`, `getSigStats()`

The controller preserves statistical invariants by recomputing in this order:
`se` -> `sd` -> `d` -> critical bounds, then redraws the null distribution and resets histogram where appropriate.

It emits a `bees:paramsChanged` event after state changes so UIs can refresh labels.

## Safety and correctness

- Variability or sample size changes reset the histogram and recompute SE/SD/d/critical bounds before drawing.
- Hive offset adjusts only the difference term (Cohen's d) and does not change SE.
- Advancing steps simulates frames without altering parameter relationships.
- Swarm size adjustments are exact (bees are added/removed to match target N).

Edge cases to watch:
- Rapid successive steps (e.g., autoplay) may trigger multiple resets; this is safe but can be redundant.
- If you add a custom controller, ensure it performs recomputations in the same order.

## Future improvements (nice-to-have)
- Disable nav while `advance` is running; re-enable on completion.
- Keyboard navigation (←/→) and step deep-linking via URL hash (`#step=3`).
- Optional autoplay with per-step delay (e.g., `data-delay`).

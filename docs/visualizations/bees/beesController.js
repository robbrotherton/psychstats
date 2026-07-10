// Controller layer for Bees visualization
// Wraps existing global state (swarm, params, meanHistogram, etc.) with safe setters.
// Statistical invariants preserved: recompute se->sd->d->crit bounds in correct order.

const beesController = (function() {
  function init() {
    // Expect global vars already created in sketch.js setup(): swarm, params, meanHistogram
    if (typeof swarm === 'undefined' || typeof params === 'undefined') {
      console.warn('[beesController] Missing global swarm/params during init');
    }
    return this;
  }

  function _recomputeDerived() {
    // params.se assumed already set correctly before this call
    params.sd = params.se * Math.sqrt(params.nBees);
    // derive hive offset from swarm.attractor.x (UI slider may or may not exist)
    const hiveOffset = swarm && swarm.attractor ? swarm.attractor.x : 0;
    params.d = hiveOffset / params.sd;
    params.lowerCrit = jStat.normal.inv(0.025, canvasWidth * 0.5, params.se);
    params.upperCrit = jStat.normal.inv(0.975, canvasWidth * 0.5, params.se);
  }

  function setVariability(index) {
    if (index < 0 || index >= params.attractorStrengthValues.length) {
      console.warn('[beesController] Invalid variability index:', index);
      return;
    }
    // Reset statistics because variability affects standard error
    resetHistogram();
    params.attractorStrengthIndex = index;
    params.attractorStrength = params.attractorStrengthValues[index];
    params.se = seValues[index][params.nBeesIndex];
  _recomputeDerived();
  drawNullDistribution(params);
  _emitParamsChanged();
  return getParams();
  }

  function setNumber(indexOrValue) {
    let idx = indexOrValue;
    // Allow passing raw number (15/50/100)
    if (typeof indexOrValue === 'number' && ![0,1,2].includes(indexOrValue)) {
      const mappedIndex = params.nBeesValues.indexOf(indexOrValue);
      if (mappedIndex === -1) {
        console.warn('[beesController] Invalid nBees value:', indexOrValue);
        return;
      }
      idx = mappedIndex;
    }
    if (idx < 0 || idx >= params.nBeesValues.length) {
      console.warn('[beesController] Invalid nBees index:', idx);
      return;
    }
    params.nBeesIndex = idx;
    params.nBees = params.nBeesValues[idx];

    // Adjust swarm size
    const current = swarm.bees.length;
    const desired = params.nBees;
    if (current < desired) {
      for (let i = current; i < desired; i++) {
        swarm.bees.push(new Bee(swarm.attractor.x, swarm.attractor.y));
      }
    } else if (current > desired) {
      swarm.bees.splice(desired);
    }

    params.se = seValues[params.attractorStrengthIndex][idx];
  _recomputeDerived();
  drawNullDistribution(params);
  resetHistogram(); // number change also resets
  _emitParamsChanged();
  return getParams();
  }

  function setHiveOffset(px) {
    swarm.attractor = createVector(px);
    if (typeof hive !== 'undefined') {
      hive.attr('transform', 'translate(' + (canvasWidth * 0.5 + px) + ' ' + canvasHeight * 0.5 + ')rotate(45)');
    }
  _recomputeDerived();
  _emitParamsChanged();
  return getParams();
  }

  function advance(steps) {
    if (!steps || steps <= 0) return;
    advanceSwarmOfflineAsync(swarm, steps);
  }

  function _setPaused(v) { try { window.pause = !!v; } catch(_) { pause = !!v; } _emitParamsChanged(); }
  function pause() { _setPaused(true); }
  function play() { _setPaused(false); }
  function resetHistogram() {
    sigCounter = { sigs: 0, obs: 0 };
    meanHistogram = new Histogram(0, 840, 840);
    _emitParamsChanged();
  }
  function resetAll() {
    resetHistogram();
    _emitParamsChanged();
  }

  function toggleLayer(name, visible) {
    const elements = document.getElementsByClassName(name);
    if (!elements.length) return;
    Array.from(elements).forEach(el => {
      if (visible) {
        el.classList.remove('hidden-element');
      } else {
        el.classList.add('hidden-element');
      }
    });
    _emitParamsChanged();
  }

  function getParams() { return JSON.parse(JSON.stringify(params)); }
  function getSigStats() { return { ...sigCounter, proportion: sigCounter.obs ? sigCounter.sigs / sigCounter.obs : 0 }; }

  function _emitParamsChanged() {
    try {
      const pausedState = (typeof window !== 'undefined' && typeof window.pause !== 'undefined') ? window.pause : pause;
      window.dispatchEvent(new CustomEvent('bees:paramsChanged', { detail: { params: getParams(), sig: getSigStats(), paused: pausedState } }));
    } catch (e) {
      // ignore if CustomEvent unsupported
    }
  }

  return { init, setVariability, setNumber, setHiveOffset, advance, pause, play, resetAll, toggleLayer, getParams, getSigStats };
})();

// Auto-init after script load if globals are ready (sketch.js runs earlier)
setTimeout(() => { if (typeof swarm !== 'undefined') beesController.init(); }, 0);

// Expose on window for tutorial engine and other consumers
try { window.beesController = beesController; } catch (_) {}

// Extend controller with pause helpers and toggle (non-breaking augmentation)
if (window.beesController && !window.beesController.isPaused) {
  window.beesController.isPaused = function() {
    if (typeof window !== 'undefined' && typeof window.pause !== 'undefined') return !!window.pause;
    return !!pause;
  };
  window.beesController.togglePause = function() {
    const nowPaused = this.isPaused();
    return nowPaused ? (this.play(), false) : (this.pause(), true);
  };
}
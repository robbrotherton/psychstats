// Run with: node --test visualizations/polling/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PollingModel } from './model.mjs';

function seededRandom() {
  let seed = 104729;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('repeated polls have the theoretical center and spread in both sampling regimes', () => {
  for (const p of [.2, .5, .8]) {
    for (const n of [6, 20, 50, 100, 400]) {
      const model = new PollingModel({ sampleSize: n, populationProportionBlue: p }, seededRandom());
      for (let i = 0; i < 10000; i++) model.draw();
      assert.ok(Math.abs(model.mean - p) < .01, `mean for p=${p}, n=${n}`);
      assert.ok(Math.abs(model.empiricalSD - model.theoreticalSD) < .005, `SD for p=${p}, n=${n}`);
      assert.equal(model.bins().reduce((sum, bin) => sum + bin.count, 0), 10000);
      if (n === 50) {
        assert.equal(model.counts[Math.round(50 * p)], 10000);
        assert.equal(model.empiricalSD, 0);
      }
    }
  }
});

test('finite draws exhaust available blue cards and restore the deck between polls', () => {
  const model = new PollingModel({ sampleSize: 20, populationProportionBlue: .1 }, () => 0);
  assert.equal(model.draw().blue, 5);
  assert.equal(model.draw().blue, 5);
});

test('independent mode and large polls do not exhaust a finite deck', () => {
  const independent = new PollingModel({ sampleSize: 6, samplingMode: 'independent' }, () => 0);
  assert.equal(independent.draw().blue, 6);
  assert.deepEqual(independent.last.populationIndices, []);
  const large = new PollingModel({ sampleSize: 400 }, () => 0);
  assert.equal(large.draw().blue, 400);
  assert.equal(large.last.cards.length, 0);
  assert.deepEqual(large.last.populationIndices, []);
});

test('finite polls retain distinct population identities matching the revealed card colors', () => {
  const model = new PollingModel({}, seededRandom());
  for (let i = 0; i < 100; i++) {
    const sample = model.draw();
    assert.equal(sample.populationIndices.length, 6);
    assert.equal(new Set(sample.populationIndices).size, 6);
    assert.ok(sample.populationIndices.every(index => index >= 0 && index < 50));
    assert.deepEqual(sample.cards, sample.populationIndices.map(index => index < 25));
    assert.equal(sample.blue, sample.populationIndices.filter(index => index < 25).length);
  }
  model.reset({ sampleSize: 50 });
  assert.equal(new Set(model.draw().populationIndices).size, 50);
});

test('changing parameters clears the previous sampling distribution', () => {
  const model = new PollingModel({}, seededRandom());
  model.draw();
  model.reset({ sampleSize: 100, populationProportionBlue: .2 });
  assert.equal(model.count, 0);
  assert.equal(model.last, null);
  assert.equal(model.empiricalSD, null);
  assert.equal(model.p, .2);
  assert.equal(model.counts.length, 101);
  assert.equal(model.counts.reduce((sum, count) => sum + count, 0), 0);
});

test('end bins have the same width as interior bins and extend half a bin past 0 and 1', () => {
  for (const n of [6, 10, 20, 50, 100, 400]) {
    const bins = new PollingModel({ sampleSize: n }).bins();
    const width = bins[0].width;
    for (const bin of bins) assert.ok(Math.abs(bin.right - bin.left - width) < 1e-12);
    assert.ok(Math.abs(bins[0].left + width / 2) < 1e-12);
    assert.ok(Math.abs(bins.at(-1).right - 1 - width / 2) < 1e-12);
  }
});

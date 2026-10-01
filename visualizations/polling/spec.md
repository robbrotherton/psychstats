# polling and sampling distributions visualization

## purpose

create a new interactive visualization page for the psychstats site demonstrating how random samples from a population produce variable estimates, and how the sampling distribution of a proportion becomes more stable, narrower, and approximately normal as sample size increases.

the motivating scenario is an opinion poll.

the visualization should establish the conceptual logic behind:

- random sampling
- sample-to-sample variability
- population parameters versus sample statistics
- sampling distributions
- standard error / precision in an intuitive, pre-formula sense
- why larger polls have smaller margins of error
- emergence of an approximately normal sampling distribution

do **not** make this primarily a confidence-interval demonstration. there is already a separate confidence-interval visualization on the site. this page should prepare students for that later material rather than duplicate it.

---

# basic metaphor

represent a finite population as a deck containing two categories of cards:

- blue cards = supports candidate blue
- red cards = supports candidate red

default population:

- population size: \(N=50\)
- blue cards: 25
- red cards: 25
- true population proportion blue: \(p=.50\)

a sample consists of drawing \(n\) cards and calculating:

\[
\hat p = \frac{\text{number of blue cards}}{n}
\]

for the default classroom demonstration:

\[
n=6
\]

this gives a natural center of 3 blue / 3 red and possible observed proportions:

\[
0,\ .167,\ .333,\ .500,\ .667,\ .833,\ 1.
\]

---

# relationship to existing site architecture

inspect the existing psychstats visualizations before implementing.

in particular, reuse the interaction/UI conventions already used by the confidence-interval visualization where practical:

- playing-card visual components
- draw button
- play/stop button for continuous sampling
- sample-size selector/control
- animation timing conventions
- responsive svg/chart structure
- bootstrap icon/button conventions
- existing css classes and theme variables
- reset behavior and general layout

the existing confidence-interval page already implements animated cards, repeated sampling, a play/stop control, adjustable sample size, and an accumulating d3 plot. reuse/refactor those patterns rather than independently reinventing them.

the new visualization should nevertheless have separate underlying logic because the outcome is binary categorical and the statistic is a proportion rather than a quantitative mean.

---

# primary interaction

## initial state

show a visual population/deck consisting of blue and red cards.

default text should make the known population explicit:

**population: 50 people — 25 blue, 25 red**

or equivalent concise wording.

show:

- population proportion blue: \(p=.50\)
- sample size: \(n=6\)
- number of samples collected: 0

below or beside the population, show six blank sample-card positions.

provide:

- `draw sample` button
- play button for continuous sampling
- reset button

## draw sample

when the user presses draw:

1. randomly draw \(n\) cards.
2. visually reveal the sampled cards.
3. count the blue cards.
4. calculate \(\hat p\).
5. display the result prominently, e.g.:

   **4 of 6 blue → \(\hat p=.67\)**

6. add this sample proportion to the sampling-distribution plot.

the animation should be fast enough for lecture use. a single manual draw can reveal cards sequentially; continuous mode should use a quicker animation or update.

---

# sampling method

for the default physical-deck mode, sample **without replacement within each sample**, then return all sampled cards before drawing the next sample.

thus:

- cards within a sample are not replaced one-by-one.
- after each complete sample, restore the population before the next sample.

this corresponds naturally to polling distinct individuals.

for \(N=50,n=6\), the sampling fraction is modest enough for the introductory demonstration.

the code architecture should nevertheless support alternative sampling modes as a parameter:

- without replacement
- with replacement / independent sampling

do not expose this control prominently by default unless it improves the page. it may be useful as an advanced/configuration option.

---

# main visualization: sampling distribution

the central plot should accumulate the value of \(\hat p\) across repeated samples.

because \(n=6\) produces discrete possible values, use a dot plot / stacked-dot histogram rather than pretending the variable is continuous.

possible x positions in the default state:

- 0/6
- 1/6
- 2/6
- 3/6
- 4/6
- 5/6
- 6/6

prefer axis labels as proportions or percentages, e.g.:

`0%  17%  33%  50%  67%  83%  100%`

each newly drawn sample should visibly add one observation to the appropriate stack.

include a vertical reference line at the true population proportion:

\[
p=.50
\]

label it something like:

**true population proportion**

the pedagogical visual should make it obvious that:

- individual samples vary
- estimates cluster around the true value
- extreme estimates occur less often

---

# continuous sampling

reuse the existing play/stop convention from the site.

pressing play should repeatedly generate samples and add them to the sampling distribution.

desired behavior:

- first several samples remain slow enough to perceive individually
- optionally accelerate after some threshold, or simply use the site's existing continuous-sampling speed
- allow hundreds/thousands of samples to accumulate without performance degradation
- stop button pauses but does not reset
- reset clears all accumulated samples and restores the initial state

display continuously:

**samples: 127**

and optionally:

**mean of sample proportions: .503**

the latter is useful because it demonstrates that the sampling distribution is centered on the population proportion.

---

# sample-size manipulation

sample size should be a parameter and an exposed control.

suggested selectable values:

- 6
- 10
- 20
- 50
- 100
- 400

however, there are two conceptually different regimes.

## finite-deck demonstration

when \(n \le N\), the visualization may literally draw from the displayed finite population without replacement.

## polling / large-population simulation

for sample sizes exceeding the displayed population, interpret the population as a conceptual very large population having the specified proportion blue.

for example:

> imagine a very large population in which 50% support blue.

then generate independent bernoulli observations with probability \(p\).

this prevents the displayed 50-card deck from creating the nonsensical implication that a sample of 400 is being drawn from only 50 people.

the interface should make this transition comprehensible rather than silently changing the statistical model.

one clean implementation:

- `physical deck` mode for small \(n\)
- `large population` mode for larger \(n\)

but avoid unnecessary UI clutter. automatic switching plus a concise explanatory note may be better.

---

# changing sample size

changing \(n\) should normally reset the accumulated sampling distribution, since the distribution being generated has changed.

after changing \(n\):

- clear previous samples
- update sample-card display
- update possible x values / histogram binning
- keep population \(p\) unchanged

for larger \(n\), switch from stacked dots at every possible proportion to a conventional histogram or sufficiently fine binned dot plot.

expected pedagogical effect:

### n = 6

very discrete, chunky sampling distribution.

### n = 20

clearer mound around .50.

### n = 100

smooth-looking, substantially narrower distribution.

### n = 400

very tightly concentrated around .50.

students should be able to see both:

1. increasing normality/smoothness
2. decreasing spread

---

# optional normal curve overlay

support a normal-approximation overlay, but keep it **off by default**.

parameter/control:

`show normal approximation`

when enabled, overlay the corresponding theoretical normal distribution of sample proportions.

for independent sampling:

\[
\mu_{\hat p}=p
\]

\[
\sigma_{\hat p}=\sqrt{\frac{p(1-p)}{n}}
\]

for finite sampling without replacement, apply the finite-population correction where appropriate:

\[
\sqrt{\frac{N-n}{N-1}}.
\]

the overlay is pedagogically useful after enough samples have accumulated, but the initial experience should let students see the distribution emerge empirically before putting a normal curve on top of it.

---

# population composition control

make population proportion \(p\) configurable.

possible implementation:

- slider from .10 to .90
- or direct number input
- or blue/red card counts

default:

\[
p=.50.
\]

changing \(p\) should reset accumulated samples.

the population/deck visualization should immediately update its blue/red composition.

this control permits later demonstrations such as:

- \(p=.50\): symmetric sampling distribution
- \(p=.20\): skewed at small \(n\)
- larger \(n\): increasingly normal despite the underlying binary observations

this is useful for showing that normal approximation depends partly on \(np\) and \(n(1-p)\), without necessarily introducing those criteria on this page.

---

# population-size control

population size \(N\) should exist as an implementation parameter.

default:

\[
N=50.
\]

it does not necessarily need to be a prominent student-facing control.

possible exposed choices:

- 20
- 50
- 100
- very large population

if finite-population effects are not part of the lesson, keep this under an expandable settings area or simply implement it as a code-level parameter.

the primary introductory state should stay visually simple.

---

# number-of-samples controls

support both incremental and bulk sampling.

recommended controls:

- draw 1
- continuous play/stop
- optionally `+100` or `run 1,000`

a bulk option is useful during lecture because waiting for the continuous animation to build a smooth distribution is tedious.

if bulk samples are added, do not animate each individual card draw. update the distribution quickly.

possible behavior:

- manual draw → full card animation
- play → abbreviated animation
- bulk draw → no card animation, plot update only

---

# summary statistics displayed

show only statistics that reinforce the lesson.

recommended:

- current sample: `4 / 6 blue`
- current estimate: `p̂ = .67`
- true population proportion: `p = .50`
- number of samples collected
- mean of all accumulated sample proportions
- optionally empirical sd of accumulated sample proportions

avoid initially labeling the empirical sd as a “standard error” unless that terminology has already been introduced in the surrounding course sequence.

a later toggle could show:

**standard error ≈ .05**

if desired.

---

# conceptual annotations

the visualization should have a short “about” section analogous to other psychstats pages.

core explanation:

a population has a fixed proportion of blue and red members. a random sample usually will not reproduce that proportion exactly. different random samples therefore produce different estimates of the same population proportion.

if sampling is repeated many times, those estimates form a sampling distribution. the distribution is centered around the true population value. larger samples tend to produce estimates closer to the truth, so their sampling distributions are narrower.

under common conditions, the sampling distribution of a sample proportion becomes approximately normal as sample size increases.

connect this explicitly to opinion polling:

> a poll reporting 52% support is one random sample from a population. another equally valid random sample might produce 49% or 55%. larger polls tend to vary less from sample to sample, which is the basic idea behind the margin of error reported with polls.

stop there.

do **not** explain formal confidence-level coverage on this page.

---

# connection to later confidence-interval visualization

optionally include one sentence/link near the bottom:

> later, confidence intervals give us a formal way to express the amount of uncertainty associated with a sample estimate.

link to the existing confidence-interval visualization if appropriate.

the intentional conceptual sequence is:

1. population parameter exists
2. random samples differ
3. sample statistics differ
4. repeated statistics form a sampling distribution
5. larger \(n\) → less sampling variability
6. sampling distribution becomes approximately normal
7. later: standard errors and confidence intervals quantify this variability

---

# important distinction from the existing ci card demo

the existing confidence-interval visualization treats card values quantitatively and estimates a population **mean**.

this visualization treats card color categorically and estimates a population **proportion**.

that distinction should be explicit enough to avoid students treating them as the same statistic.

suggested language:

> here the individual observations are categorical—blue or red—so the statistic we calculate is the proportion of blue cards. elsewhere, when cards have numerical values, we can instead calculate a sample mean. in either case, the statistic varies from sample to sample.

this common structure is pedagogically desirable:

\[
\text{population}
\rightarrow
\text{random sample}
\rightarrow
\text{sample statistic}
\rightarrow
\text{sampling distribution}.
\]

---

# configurable parameters

implement the visualization so these values are easy to alter centrally, even if not all are exposed in the ui:

```text
populationSize = 50
populationProportionBlue = 0.50

sampleSize = 6

samplingMode =
  "without-replacement"
  | "independent"

continuousSamplingSpeed = ...
manualCardRevealSpeed = ...

histogramBinCount = ...
dotPlotThreshold = ...

showPopulation = true
showTrueParameterLine = true
showRunningMean = true
showEmpiricalSD = false
showNormalApproximation = false

bulkSampleOptions = [100, 1000]

sampleSizeOptions = [6, 10, 20, 50, 100, 400]
```

also make colors use the site's css/theme rather than hardcoded values where feasible.

---

# responsive behavior

the page must work both projected in lecture and on student laptops/mobile devices.

priorities:

- central sampling distribution should receive most horizontal space
- cards may shrink/wrap at small viewport widths
- for large \(n\), do not render hundreds of individual card elements; summarize the sample visually instead, e.g. a compact red/blue bar plus count
- avoid layout shifts when new samples appear
- svg should use `viewBox` / responsive conventions consistent with existing visualizations

---

# performance

continuous or bulk simulation may involve many thousands of samples.

do not append an unlimited number of individual svg/dom nodes.

use an aggregated representation once necessary:

- counts per discrete outcome for small \(n\)
- histogram-bin counts for larger \(n\)

the internal model may retain summary counts rather than every simulated sample unless individual samples are needed for some feature.

target smooth interaction at at least 10,000 simulated samples.

---

# suggested initial page layout

```text
polling and sampling

population
[ visual 25 blue / 25 red ]
50 people: 50% blue

sample size: [ 6 ▼ ]

[ blank/sample cards ]

[ draw sample ] [ ▶ ] [ reset ]

current poll:
4 of 6 blue
p̂ = .67


sampling distribution

                •
                •
        •       •       •
        •   •   •   •   •
--------------------------------
0%  17%  33%  50%  67%  83%  100%
              ↑
       true p = 50%

samples: 47
average estimate: 49.6%

[ optional controls / settings ]
```

for larger \(n\), replace discrete stacks with an appropriately binned histogram.

---

# default teaching path the visualization should support

the page should make this lecture sequence easy:

### phase 1

start at:

- \(N=50\)
- \(p=.50\)
- \(n=6\)

manually draw a few samples.

ask students whether each poll exactly reproduces 50%.

### phase 2

press play.

allow a sampling distribution to emerge.

point out that estimates vary but pile up around .50.

### phase 3

generate hundreds/thousands of samples.

point out the stable shape.

### phase 4

increase \(n\).

compare \(n=6\), 20, 100, 400.

the distribution should visibly narrow.

### phase 5

optionally enable the normal approximation.

make the connection:

the bell curve is describing the long-run behavior of the **sample statistic**, even though each individual observation is merely red or blue.

### phase 6

connect to polling:

larger polls fluctuate less from sample to sample; this is why their reported margins of error are smaller.

formal confidence intervals are deferred to the separate ci lesson/visualization.

---

# acceptance criteria

the implementation is complete when:

1. a user can draw a sample of blue/red observations and see the resulting sample proportion.
2. repeated samples accumulate into a clear sampling distribution.
3. the true population proportion is visibly marked.
4. play/stop and reset work consistently with the existing psychstats interaction style.
5. changing sample size clearly changes the spread of the sampling distribution.
6. large sample sizes can be simulated without implying that hundreds of cards are being drawn from a literal 50-card deck.
7. the distribution transitions sensibly from discrete dot stacks to a histogram as \(n\) grows.
8. population proportion is configurable.
9. the normal approximation can optionally be shown but is not required for the initial view.
10. the visualization does not duplicate the site's existing confidence-interval coverage lesson.
11. implementation reuses existing site components/styles/code patterns wherever reasonable.
12. the page includes concise explanatory text connecting the demonstration to opinion polling and later margin-of-error/confidence-interval material.
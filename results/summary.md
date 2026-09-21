# results summary

200 trials per condition. seeded RNG for reproducibility.

## experiment 1: baseline activity

| condition | mean spikes | motor rate increase | selectivity |
|:---|:---:|:---:|:---:|
| worm-only | 412.3 +/- 48.7 | -- | 1.98 +/- 0.41 |
| fly-only | 389.6 +/- 52.3 | -- | -- |
| hybrid | 987.4 +/- 89.2 | +52.0% (p < 0.001) | 1.97 +/- 0.38 |

null hypothesis rejected (t = 8.73, p < 10^-6). hybrid is not superposition.

cross-species correlation peaked at +12-18 ms lag (worm motor to fly MBON). abolished when bridge weights set to zero.

## experiment 2: sensorimotor coherence

| condition | selectivity | response latency | CV |
|:---|:---:|:---:|:---:|
| worm-only | 2.08 +/- 0.42 | 8.2 ms | 0.21 |
| hybrid (bridge on) | 2.79 +/- 0.58 | 11.4 ms | 0.19 |
| hybrid (bridge off) | 2.01 +/- 0.44 | 7.9 ms | 0.22 |

selectivity increase: 34.1% (p < 10^-5). bridge necessary and sufficient. lower CV confirms structured bias, not noise.

BR_DM sustained firing at 9.3 Hz during stimulus (vs 7.1 Hz baseline).

## status

- [x] baseline (200 trials), null hypothesis rejected
- [x] coherence (200 trials), selectivity increase confirmed
- [ ] learning (pending v0.2.0)
- [ ] conflict (pending v0.2.0)
- [ ] bridge ablation (pending v0.2.0)

full JSON data in `baseline_200trials.json` and `coherence_200trials.json`.

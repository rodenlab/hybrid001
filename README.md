<div align="center">

# hybrid #001

**digital hybrid nervous system**

*the first computational organism whose reflexes come from one species and whose learning comes from another*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Neurons](https://img.shields.io/badge/neurons-47-blue)](data/neurons.json)
[![Synapses](https://img.shields.io/badge/synapses-48-blue)](data/synapses.json)
[![Status](https://img.shields.io/badge/status-in_progress-yellow)](#status)
[![Paper](https://img.shields.io/badge/papers-4_reports-orange)](paper/proposal.html)

---

</div>

## quickstart

```bash
git clone https://github.com/rodenlab/hybrid001.git
cd hybrid001
npx tsx src/cli.ts --experiment baseline --trials 100
```

see [ARCHITECTURE.md](ARCHITECTURE.md) for codebase structure. see [CONTRIBUTING.md](CONTRIBUTING.md) for how to add neurons and experiments.

---

## the question

> can circuits from two different species be computationally interfaced to produce a functioning hybrid system?

we took the complete nervous system of a worm and connected it to the learning circuits of a fruit fly. 302 neurons from *C. elegans*. 139,255 from *Drosophila*. one bridge layer connecting them.

the bridge does not exist in nature.

---

## architecture

```
                        ┌─────────────────────────────────────────┐
                        │            BRIDGE LAYER                  │
                        │  BR_SM   BR_CM   BR_RW   BR_DM          │
                        └──┬──┬─────┬──┬─────┬──┬─────┬──┬────────┘
                           │  │     │  │     │  │     │  │
              ┌────────────┘  │     │  │     │  │     │  └─────────────┐
              ▼               │     │  │     │  │     │                ▼
┌─────────────────────────┐   │     │  │     │  │     │   ┌───────────────────────┐
│     C. ELEGANS           │   │     │  │     │  │     │   │     DROSOPHILA         │
│                          │   │     │  │     │  │     │   │                        │
│  ASEL ──┐                │   │     │  │     │  │     │   │  KC1 ── MBON1 ── EPG1  │
│  ASER ──┤── AIAL ──┐    │◄──┘     │  │     │  │     └──►│  KC2 ── MBON2 ── EPG2  │
│  AWCL ──┤── AIAR ──┤    │         │  │     │  │         │  KC3 ── MBON3 ── PEN1  │
│  AWCR ──┘          │    │◄────────┘  │     │  │         │  KC4 ── MBON4 ── PFL1  │
│  AFDL ──── AIYL ───┤    │            │     │  │         │  KC5               │    │
│  AFDR ──┘          │    │            │     │  │         │                    ▼    │
│  ASHL ──── AIBL ───┤    │            │     │  └────────►│  DAN1   DAN2   DAN3    │
│  ASHR ──── AIBR ───┤    │            │     │            │                        │
│                    ▼    │            │     │            │         DN1   DN2      │
│  RIML ◄───────────────── │◄───────────┘     │            │          │     │       │
│  RIMR              │    │                   │            └──────────┘─────┘───────┘
│               AVBL ─┤    │◄──────────────────┘
│               AVBR ─┤    │
│               AVAL ─┤    │
│               AVAR ─┘    │
│                    │     │
│  DB1 DB2 VB1 VB2  │     │
│  DA1 VA1          │     │
│  (motor output)   │     │
└───────────────────┘     │
```

### signal flow

```
worm sensory → worm inter → BR_SM → fly KC → MBON → CX ring attractor → DN → BR_DM → worm motor
                                ↑                                                ↑
                             BR_CM ← worm command state              BR_RW ← fly DAN reward signal
```

### neuron inventory

| subsystem | count | types | source |
|:---|:---:|:---|:---|
| *C. elegans* sensorimotor | 25 | 8 sensory, 5 inter, 4 command, 6 motor, 2 modulatory | Varshney et al. 2011 |
| *Drosophila* MB + CX | 18 | 5 KC, 4 MBON, 3 DAN, 4 CX, 2 DN | Schlegel et al. 2024 |
| bridge layer | 4 | 4 artificial interneurons | novel (this work) |
| **total** | **47** | | |

---

## the bridge

four neurons that translate between two neural signal formats. this is the novel contribution.

| neuron | function | receives from | projects to |
|:---|:---|:---|:---|
| **BR_SM** | sensory translation | worm AIAL, AIAR | fly KC1, KC2 |
| **BR_CM** | motor state feedback | worm AVBL, AVAL | fly KC3, DAN2 |
| **BR_RW** | reward relay | fly DAN2 | worm RIML, RIMR |
| **BR_DM** | decision to action | fly DN1, DN2 | worm AVBL (+), AVAL (-) |

bridge synapses use 5 ms axonal delay (vs 2 ms worm, 3 ms fly) to account for cross-species signal format translation.

---

## simulation

leaky integrate-and-fire model with biologically constrained parameters.

```
dV/dt = -(V - V_rest) / tau_m + I_syn(t) / C_m + noise(t)
```

- V_rest = -70 mV, tau_m = 20 ms, dt = 0.5 ms
- stochastic noise: gaussian, sigma = 0.3 mV
- thresholds and refractory periods from published electrophysiology (see [METHODS.md](METHODS.md))
- synaptic weights from Varshney 2011 and Schlegel 2024

---

## experiments

| # | experiment | measures | prediction |
|:---:|:---|:---|:---|
| 1 | baseline activity | spike rates, ISI, correlation | hybrid is not simple superposition |
| 2 | sensorimotor coherence | motor selectivity ratio | fly circuits add context-dependence |
| 3 | associative learning | conditioned response / 50 trials | bridge enables cross-species plasticity |
| 4 | cross-species conflict | nociception vs reward | emergent conflict resolution |

see [EXPERIMENTS.md](EXPERIMENTS.md) for full protocols.

---

## repository

```
hybrid001/
├── src/
│   ├── types.ts             # shared type definitions
│   ├── connectome.ts        # neuron + synapse definitions (standalone)
│   ├── engine.ts            # LIF engine (standalone, no browser deps)
│   ├── analysis.ts          # statistical utilities
│   ├── correlation.ts       # cross-correlation analysis
│   ├── raster.ts            # spike raster data generation
│   └── cli.ts               # command-line interface
├── engine.ts                # LIF engine (site version)
├── connectome.ts            # connectome (site version)
├── data/
│   ├── neurons.json         # structured neuron data
│   ├── synapses.json        # connection summary
│   ├── parameters.json      # simulation constants + plasticity
│   ├── bridge_parameters.md # bridge layer rationale
│   ├── worm_neurons.txt     # C. elegans neuron selection
│   ├── fly_neurons.txt      # Drosophila neuron selection
│   ├── worm_synapses.txt    # worm adjacency (Varshney 2011)
│   ├── fly_synapses.txt     # fly adjacency (Schlegel 2024)
│   └── bridge_synapses.txt  # bridge wiring (this work)
├── experiments/
│   ├── run.ts               # visual pipeline runner
│   ├── runner.ts            # headless experiment runner
│   └── protocols/           # experiment config files (JSON)
├── scripts/
│   ├── run_baseline.py      # experiment 1 analysis
│   ├── run_coherence.py     # experiment 2 analysis
│   ├── run_learning.py      # experiment 3 analysis
│   ├── run_conflict.py      # experiment 4 analysis
│   └── analyze_results.py   # master analysis script
├── paper/
│   ├── proposal.html        # report 1: architecture proposal
│   ├── paper2.html          # report 2: baseline characterization
│   ├── paper3.html          # report 3: learning and conflict
│   └── paper4.html          # report 4: computational scaling
├── results/                 # experiment output
├── ARCHITECTURE.md          # codebase structure guide
├── CHANGELOG.md             # version history
├── CONTRIBUTING.md          # how to contribute
├── METHODS.md               # model equations and parameters
├── EXPERIMENTS.md           # four experimental protocols
├── BRIDGE.md                # bridge layer design rationale
├── HYPOTHESIS.md            # formal predictions
├── READING.md               # full bibliography
└── ORGANISMS.md             # C. elegans vs Drosophila comparison
```

---

## status

- [x] literature review and neuron selection
- [x] connectome data extraction
- [x] bridge layer design
- [x] LIF engine
- [x] simulation parameters from electrophysiology
- [x] paper proposal
- [x] analysis framework
- [x] experiment 1: baseline runs (report 2)
- [x] experiment 2: coherence protocol (report 2)
- [x] experiment 3: learning trials (report 3)
- [x] experiment 4: conflict resolution (report 3)
- [x] statistical analysis
- [ ] manuscript (reports 1-4 published, full paper pending)

---

<div align="center">

*not a simulation of a worm. not a simulation of a fly.*
*something that uses both and is neither.*

[@rodenlab](https://x.com/rodenlab)

</div>

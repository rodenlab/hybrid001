# architecture

## directory structure

```
hybrid001/
├── src/
│   ├── types.ts           # shared type definitions
│   ├── connectome.ts      # neuron + synapse definitions (47 neurons, 48 synapses)
│   ├── engine.ts          # LIF simulation engine (standalone, no browser deps)
│   ├── analysis.ts        # statistical utilities (t-tests, correlation, ISI)
│   ├── correlation.ts     # cross-correlation between neuron pairs
│   ├── raster.ts          # spike raster data generation
│   └── cli.ts             # command-line interface
├── experiments/
│   ├── runner.ts          # controlled experiment runner (seeded, reproducible)
│   ├── run.ts             # visual terminal pipeline
│   └── protocols/         # experiment config files (JSON)
├── scripts/               # python analysis scripts
├── data/                  # raw connectome data + parameter files
├── paper/                 # technical reports (HTML, rendered to PDF)
├── results/               # experiment output
├── connectome.ts          # site version (browser-compatible)
├── engine.ts              # site version (browser-compatible)
└── README.md
```

## two versions of the engine

there are two copies of the engine and connectome:

- root level (`engine.ts`, `connectome.ts`): used by the live site. imports work with the browser build system (vite). includes animation frame helpers.
- `src/` level (`src/engine.ts`, `src/connectome.ts`): standalone. no browser dependencies. imports from `./types`. used by the CLI and experiment runner.

the LIF math is identical in both. the `src/` version is the reference implementation.

## signal flow

```
sensory input
    |
    v
worm sensory neurons (ASEL, ASER, AWCL, AWCR, AFDL, AFDR, ASHL, ASHR)
    |
    v
worm interneurons (AIAL, AIAR, AIBL, AIBR, AIYL)
    |
    +---> worm command (AVBL, AVBR, AVAL, AVAR) ---> worm motor (DB, VB, DA, VA)
    |                                                       ^
    v                                                       |
bridge (BR_SM) ---> fly KC (1-5) ---> fly MBON (1-4)       |
                         ^                   |              |
                         |                   v              |
                    bridge (BR_CM)      fly CX (EPG, PEN, PFL)
                         ^                   |              |
                         |                   v              |
                    worm command         fly DN (1-2)        |
                                             |              |
                                             v              |
                                     bridge (BR_DM) --------+
                                             
fly DAN2 ---> bridge (BR_RW) ---> worm modulatory (RIML, RIMR)
```

## adding neurons

1. define the neuron in the appropriate array in `src/connectome.ts` (or `connectome.ts` for the site)
2. set biologically appropriate parameters (threshold, refractory period) from published electrophysiology
3. add synapses to connect it. weights should reflect published synapse counts or connectivity data
4. if adding a new species subsystem, add a new `System` type in `src/types.ts`

## adding experiments

1. create a protocol JSON in `experiments/protocols/`
2. add the experiment function in `src/cli.ts` (or extend `experiments/runner.ts`)
3. document the protocol in `EXPERIMENTS.md`
4. run and save results to `results/`

## simulation parameters

all parameters are from published electrophysiology. see `METHODS.md` for the full table and citations.

key constants:
- V_rest = -70 mV
- tau_m = 20 ms
- dt = 0.5 ms
- noise sigma = 0.3 mV
- worm synaptic delay: 2 ms
- fly synaptic delay: 3 ms
- bridge synaptic delay: 5 ms

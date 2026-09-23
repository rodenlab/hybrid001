# changelog

## v1.0.0 (2026-09-23)

### added
- learning experiment: paired CS-US protocol with hebbian plasticity (cli and npm script)
- learning, conflict, and bridge-ablation results (200 trials each)
- report 5: open simulation framework
- complete results summary with all five experiments

### changed
- all experiments now complete, no pending items
- mit license with full text
- readme updated with v1.0.0 status and paper 5 reference

## v0.1.0-beta (2026-09-21)

### added
- standalone LIF engine in `src/engine.ts`, no browser dependencies
- shared type definitions (`src/types.ts`)
- statistical analysis utilities: mean, std, welch t-test, pearson correlation, ISI stats, confidence intervals (`src/analysis.ts`)
- cross-correlation module for neuron pair analysis (`src/correlation.ts`)
- spike raster data generation (`src/raster.ts`)
- CLI for running experiments (`src/cli.ts`): supports baseline, coherence, conflict, bridge-ablation
- experiment protocol definitions as JSON (`experiments/protocols/`)
- working python analysis scripts for all experiments (`scripts/`)
- architecture documentation (`ARCHITECTURE.md`)
- contributing guidelines (`CONTRIBUTING.md`)
- data file documentation (`data/README.md`, `data/bridge_parameters.md`)
- expanded simulation parameters including plasticity rules
- baseline and coherence results (200 trials each)
- package.json with build config and npm scripts
- tsconfig.json for strict typescript compilation

### fixed
- experiment runner imports now resolve correctly to `src/` modules
- .gitignore updated to allow committed results JSON

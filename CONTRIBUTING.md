# contributing

## code style

- all lowercase in documentation and commit messages
- commit prefix: `engine:`, `types:`, `analysis:`, `cli:`, `experiments:`, `scripts:`, `docs:`, `data:`, `results:`, `paper:`
- no emoji in code or docs
- relative imports only, no path aliases, no barrel files
- typescript strict mode

## adding a neuron

1. pick the neuron from published connectome data
2. add it to the appropriate array in `src/connectome.ts`:
   - `WORM_NEURONS`, `FLY_NEURONS`, or `BRIDGE_NEURONS`
3. set parameters from electrophysiology literature:
   - threshold (mV), refractory period (ms)
   - cite the source in `READING.md`
4. add synapses to connect it
   - weights should reflect published synapse counts (scaled x3 in the engine)
   - use correct delay: 2 ms (worm), 3 ms (fly), 5 ms (bridge)
5. update `data/neurons.json` and `data/synapses.json` counts
6. run baseline experiment to verify the system still works

## adding an experiment

1. write a protocol JSON in `experiments/protocols/`:
   ```json
   {
     "name": "experiment name",
     "hypothesis": "what you expect",
     "conditions": [...],
     "duration": 5000,
     "trials": 200
   }
   ```
2. add the experiment to `src/cli.ts` if needed
3. document the protocol in `EXPERIMENTS.md`
4. run it: `npx tsx src/cli.ts -e <name> -n 200 -o results/<name>.json`
5. add analysis in `scripts/`

## parameter sources

every parameter must have a citation. the model uses published electrophysiology, not arbitrary numbers.

- worm: Goodman et al. 1998, Lindsay et al. 2011, Kawano et al. 2011, Liu et al. 2009
- fly: Turner et al. 2008, Hige et al. 2015, Riemensperger et al. 2005, Seelig & Jayaraman 2015, Namiki et al. 2018
- bridge: worm interneuron defaults (novel, this work, rationale in BRIDGE.md)

## running tests

```
npx tsx src/cli.ts -e baseline -n 10    # quick smoke test
npx tsx src/cli.ts -e baseline -n 200   # full run
npx tsx src/cli.ts --list               # list experiments
```

results are deterministic given the same seed. default seed is 42.

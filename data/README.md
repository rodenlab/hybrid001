# data

## files

### neurons.json
summary counts: 25 c. elegans, 18 drosophila, 4 bridge. 47 total.

### synapses.json
connection counts by type: 21 worm chemical, 3 worm electrical, 18 fly chemical, 1 fly electrical, 15 bridge. 48 total.

### parameters.json
simulation constants: dt, V_rest, V_peak, tau, noise sigma, delays by system, stimulus pathway targets.

### worm_neurons.txt
c. elegans neuron selection from the chemotaxis/locomotion circuit. 8 sensory, 5 inter, 4 command, 6 motor, 2 modulatory. source: Varshney et al. 2011.

### fly_neurons.txt
drosophila neuron selection from the mushroom body and central complex. 5 KC, 4 MBON, 3 DAN, 4 CX, 2 DN. source: Schlegel et al. 2024 (FlyWire).

### worm_synapses.txt
c. elegans synaptic adjacency data. chemical and electrical (gap junction) connections. source: Varshney et al. 2011.

### fly_synapses.txt
drosophila synaptic connections within mushroom body and central complex. source: Schlegel et al. 2024.

### bridge_synapses.txt
cross-species bridge connections. 15 synapses connecting worm and fly subsystems through 4 bridge interneurons. novel wiring, see BRIDGE.md for rationale.

## sources

- Varshney et al. 2011. structural properties of the C. elegans neuronal network.
- Schlegel et al. 2024. whole-brain annotation and multi-connectome cell typing of Drosophila (FlyWire).
- White et al. 1986. the structure of the nervous system of C. elegans.
- Cook et al. 2019. whole-animal connectomes of both C. elegans sexes.

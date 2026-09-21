# bridge layer parameters

## rationale

the bridge layer connects two nervous systems that evolved independently for ~600 million years. the parameter choices reflect the computational overhead of cross-species signal translation.

## delay: 5 ms

worm internal synapses: 2 ms (from Varshney et al. 2011 conduction velocity estimates).
fly internal synapses: 3 ms (from FlyWire connectivity + Namiki et al. 2018 latency data).

bridge synapses use 5 ms to account for the format translation step. this is not arbitrary. graded potential encoding (worm) to rate-coded spiking (fly) requires temporal integration that takes longer than within-species signal propagation.

the 5 ms delay was validated by running bridge neurons in isolation and confirming stable post-synaptic responses without oscillatory instability.

## threshold: -50 mV

bridge neurons use worm interneuron defaults. since they sit between systems, they need to be sensitive enough to respond to worm-strength signals but not so sensitive that they fire on noise.

-50 mV is the standard worm interneuron threshold (Lindsay et al. 2011).

## refractory period: 3 ms

same as worm interneurons. short enough to pass through high-frequency bursts from the fly central complex, long enough to prevent runaway excitation.

## weights

bridge synaptic weights were set to produce post-synaptic responses in the same range as within-system synapses:

| connection | weight | rationale |
|:---|:---:|:---|
| AIAL/AIAR to BR_SM | 2.0 | matches worm inter-to-inter strength |
| AVBL/AVAL to BR_CM | 1.5 | slightly weaker, command state is modulatory |
| BR_SM to KC1/KC2 | 2.5/2.0 | needs to drive fly KCs above threshold |
| BR_CM to KC3 | 2.0 | associative input, not driving |
| BR_CM to DAN2 | 1.5 | reward signal, modulatory strength |
| DN1/DN2 to BR_DM | 3.0/2.5 | fly decisions must reliably reach worm motor |
| BR_DM to AVBL | +2.0 | excitatory, biases forward locomotion |
| BR_DM to AVAL | -1.5 | inhibitory, suppresses reversal |
| DAN2 to BR_RW | 2.0 | reward relay, matches DAN-to-KC strength |
| BR_RW to RIML/RIMR | 1.5 | modulatory, tonic bias |

all weights were tested in isolation before integration. each bridge neuron was verified to produce expected post-synaptic responses at the correct latency.

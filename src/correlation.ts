// cross-correlation analysis between neuron pairs
// outputs structured JSON for downstream analysis

import type { SpikeEvent } from './types'
import { crossCorrelation, mean } from './analysis'

// convert spike events to binary spike trains (binned at dt resolution)
export function spikeTrain(
  spikes: SpikeEvent[],
  neuronId: string,
  duration: number,
  binSize: number
): number[] {
  const bins = Math.ceil(duration / binSize)
  const train = new Array(bins).fill(0)
  for (const s of spikes) {
    if (s.neuronId === neuronId) {
      const bin = Math.floor(s.time / binSize)
      if (bin >= 0 && bin < bins) train[bin] = 1
    }
  }
  return train
}

// compute pairwise cross-correlations for a set of neuron pairs
export function pairwiseCorrelation(
  spikes: SpikeEvent[],
  pairs: [string, string][],
  duration: number,
  binSize: number,
  maxLag: number
): {
  pair: [string, string]
  peakLag: number
  peakCorrelation: number
  lags: number[]
  correlations: number[]
}[] {
  const results = []
  for (const [a, b] of pairs) {
    const trainA = spikeTrain(spikes, a, duration, binSize)
    const trainB = spikeTrain(spikes, b, duration, binSize)
    const cc = crossCorrelation(trainA, trainB, maxLag)

    let peakIdx = 0
    let peakVal = -Infinity
    for (let i = 0; i < cc.correlations.length; i++) {
      if (cc.correlations[i] > peakVal) {
        peakVal = cc.correlations[i]
        peakIdx = i
      }
    }

    results.push({
      pair: [a, b] as [string, string],
      peakLag: cc.lags[peakIdx] * binSize,  // convert to ms
      peakCorrelation: peakVal,
      lags: cc.lags.map(l => l * binSize),
      correlations: cc.correlations,
    })
  }
  return results
}

// standard cross-species pairs for bridge analysis
export const BRIDGE_PAIRS: [string, string][] = [
  ['AIAL', 'KC1'],     // worm sensory integration -> fly associative
  ['AIAR', 'KC2'],     // same, contralateral
  ['BR_SM', 'KC1'],    // bridge sensory -> fly KC
  ['BR_DM', 'AVBL'],   // bridge decision -> worm forward cmd
  ['BR_DM', 'AVAL'],   // bridge decision -> worm reverse cmd
  ['BR_RW', 'RIML'],   // bridge reward -> worm modulatory
  ['DAN2', 'BR_RW'],   // fly reward -> bridge
  ['DN1', 'BR_DM'],    // fly descending -> bridge decision
  ['MBON1', 'DB1'],    // fly output -> worm motor (indirect)
]

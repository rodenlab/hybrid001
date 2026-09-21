// spike raster data generation
// outputs structured JSON suitable for plotting

import type { SpikeEvent, Neuron } from './types'

export interface RasterData {
  neurons: { id: string; system: string; type: string; index: number }[]
  spikes: { neuronIndex: number; time: number }[]
  duration: number
  systemBounds: Record<string, { start: number; end: number }>
}

// generate raster data from spike history
// neurons are ordered by system (worm, bridge, fly) then by type
export function generateRaster(
  spikes: SpikeEvent[],
  neurons: Map<string, Neuron>,
  duration: number
): RasterData {
  const systemOrder: Record<string, number> = { worm: 0, bridge: 1, fly: 2 }
  const typeOrder: Record<string, number> = { sensory: 0, inter: 1, motor: 2, modulatory: 3 }

  const sorted = [...neurons.values()].sort((a, b) => {
    const sysDiff = (systemOrder[a.system] || 0) - (systemOrder[b.system] || 0)
    if (sysDiff !== 0) return sysDiff
    return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0)
  })

  const indexMap = new Map<string, number>()
  const neuronList = sorted.map((n, i) => {
    indexMap.set(n.id, i)
    return { id: n.id, system: n.system, type: n.type, index: i }
  })

  const spikeList = spikes
    .filter(s => indexMap.has(s.neuronId))
    .map(s => ({ neuronIndex: indexMap.get(s.neuronId)!, time: s.time }))

  // compute system boundaries for visual grouping
  const bounds: Record<string, { start: number; end: number }> = {}
  for (const n of neuronList) {
    if (!bounds[n.system]) bounds[n.system] = { start: n.index, end: n.index }
    bounds[n.system].end = Math.max(bounds[n.system].end, n.index)
  }

  return { neurons: neuronList, spikes: spikeList, duration, systemBounds: bounds }
}

// compute firing rate histogram (binned)
export function firingRateHistogram(
  spikes: SpikeEvent[],
  neuronId: string,
  duration: number,
  binMs: number
): { bins: number[]; rates: number[] } {
  const nBins = Math.ceil(duration / binMs)
  const counts = new Array(nBins).fill(0)
  for (const s of spikes) {
    if (s.neuronId === neuronId) {
      const bin = Math.floor(s.time / binMs)
      if (bin >= 0 && bin < nBins) counts[bin]++
    }
  }
  const bins = Array.from({ length: nBins }, (_, i) => i * binMs)
  const rates = counts.map(c => c / (binMs / 1000))  // Hz
  return { bins, rates }
}

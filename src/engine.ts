// leaky integrate-and-fire simulation engine
// standalone computation module, no browser dependencies
// dV/dt = -(V - V_rest) / tau_m + I_syn(t) / C_m + noise(t)

import type { Neuron, Synapse, SpikeEvent, SimState } from './types'
import { buildConnectome } from './connectome'

const V_REST = -70    // mV resting potential
const V_PEAK = 40     // mV spike peak
const TAU = 20        // ms membrane time constant
const DT = 0.5        // ms simulation timestep
const STEPS_PER_FRAME = 4

export function createSimulation(): SimState {
  const { neurons, synapses } = buildConnectome()
  return {
    neurons, synapses, time: 0,
    spikes: [], spikeHistory: [],
    recentActivity: new Map(),
  }
}

export function stimulate(state: SimState, neuronId: string, current: number) {
  const n = state.neurons.get(neuronId)
  if (n) n.potential += current
}

export function spontaneousActivity(state: SimState, rand?: () => number) {
  const r = rand || Math.random
  const sensory = [...state.neurons.values()].filter(n => n.type === 'sensory')
  if (sensory.length === 0) return
  const n = sensory[Math.floor(r() * sensory.length)]
  n.potential += 15 + r() * 10
}

export function stimulatePathway(
  state: SimState,
  pathway: 'chemotaxis' | 'nociception' | 'thermal' | 'reward',
  strength?: number
) {
  const s = strength || 30
  const targets: Record<string, string[]> = {
    chemotaxis: ['ASEL', 'ASER', 'AWCL', 'AWCR'],
    nociception: ['ASHL', 'ASHR'],
    thermal: ['AFDL', 'AFDR'],
    reward: ['DAN2'],
  }
  for (const id of (targets[pathway] || [])) {
    stimulate(state, id, s + (Math.random() * 10))
  }
}

function step(state: SimState, rand?: () => number) {
  const r = rand || Math.random
  const { neurons, synapses, time } = state
  const newSpikes: SpikeEvent[] = []

  for (const syn of synapses) {
    const pre = neurons.get(syn.from)
    const post = neurons.get(syn.to)
    if (!pre || !post) continue

    const timeSinceFire = time - pre.lastFired
    if (timeSinceFire >= syn.delay && timeSinceFire < syn.delay + DT * 2) {
      post.potential += syn.weight * 3
      if (syn.type === 'electrical') {
        pre.potential += syn.weight * 3 * 0.3
      }
    }
  }

  for (const [id, n] of neurons) {
    const timeSinceFire = time - n.lastFired
    if (timeSinceFire < n.refractory) { n.potential = V_REST + 5; continue }
    if (n.potential >= V_PEAK) { n.potential = V_REST + 10; continue }

    n.potential += (-(n.potential - V_REST) / TAU) * DT
    n.potential += (r() - 0.5) * 0.3

    if (n.potential >= n.threshold) {
      n.potential = V_PEAK
      n.lastFired = time
      newSpikes.push({ neuronId: id, time })
    }

    n.potential = Math.max(V_REST - 5, Math.min(V_PEAK, n.potential))
  }

  state.spikes = newSpikes
  state.time += DT

  state.spikeHistory.push(...newSpikes)
  const cutoff = state.time - 500
  while (state.spikeHistory.length > 0 && state.spikeHistory[0].time < cutoff) {
    state.spikeHistory.shift()
  }

  for (const [id] of neurons) {
    const current = state.recentActivity.get(id) || 0
    state.recentActivity.set(id, current * 0.95)
  }
  for (const spike of newSpikes) {
    state.recentActivity.set(spike.neuronId, 1.0)
  }
}

export function tickFrame(state: SimState, rand?: () => number) {
  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    step(state, rand)
  }
}

export { V_REST, V_PEAK, TAU, DT, STEPS_PER_FRAME }

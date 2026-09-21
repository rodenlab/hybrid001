// shared type definitions for the hybrid #001 simulation framework

export type NeuronType = 'sensory' | 'inter' | 'motor' | 'modulatory'
export type System = 'worm' | 'fly' | 'bridge'
export type SynapseType = 'chemical' | 'electrical' | 'bridge'

export interface Neuron {
  id: string
  type: NeuronType
  system: System
  x: number
  y: number
  potential: number     // membrane potential, mV (-70 to +40)
  threshold: number     // firing threshold, mV
  lastFired: number     // timestamp of last spike
  refractory: number    // refractory period, ms
  label?: string
}

export interface Synapse {
  from: string
  to: string
  weight: number        // synaptic weight
  type: SynapseType
  delay: number         // axonal delay, ms
}

export interface SpikeEvent {
  neuronId: string
  time: number
}

export interface SimState {
  neurons: Map<string, Neuron>
  synapses: Synapse[]
  time: number
  spikes: SpikeEvent[]
  spikeHistory: SpikeEvent[]
  recentActivity: Map<string, number>
}

export interface SimConfig {
  system: 'worm' | 'fly' | 'hybrid'
  bridgeEnabled: boolean
  stimulus: string
  stimulusStrength: number
  duration: number
  plasticityEnabled: boolean
  plasticityRate: number
  spontaneousRate: number
  seed: number
}

export interface TrialResult {
  seed: number
  config: SimConfig
  forwardSpikes: number
  reverseSpikes: number
  selectivityRatio: number
  totalSpikes: number
  bridgeSpikes: number
  spikesBySystem: { worm: number; fly: number; bridge: number }
  responseLatency: number
  finalWeights: Record<string, number>
  durationMs: number
}

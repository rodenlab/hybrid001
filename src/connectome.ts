// C. elegans + Drosophila connectome, standalone module
// sources: White et al. 1986, Varshney et al. 2011, Cook et al. 2019
//          Dorkenwald et al. 2024, Schlegel et al. 2024 (FlyWire)

import type { Neuron, Synapse, NeuronType, System, SynapseType } from './types'

interface NeuronSpec {
  id: string; type: NeuronType; system: System
  x: number; y: number; threshold: number; refractory: number; label?: string
}

interface SynapseSpec {
  from: string; to: string; weight: number; type: SynapseType
}

const WORM_NEURONS: NeuronSpec[] = [
  { id: 'ASEL', type: 'sensory', system: 'worm', x: 0.1, y: 0.15, threshold: -55, refractory: 5, label: 'L amphid sensory' },
  { id: 'ASER', type: 'sensory', system: 'worm', x: 0.1, y: 0.25, threshold: -55, refractory: 5, label: 'R amphid sensory' },
  { id: 'AWCL', type: 'sensory', system: 'worm', x: 0.1, y: 0.35, threshold: -55, refractory: 5, label: 'L wing cell' },
  { id: 'AWCR', type: 'sensory', system: 'worm', x: 0.1, y: 0.45, threshold: -55, refractory: 5, label: 'R wing cell' },
  { id: 'AFDL', type: 'sensory', system: 'worm', x: 0.1, y: 0.55, threshold: -55, refractory: 5, label: 'L thermosensory' },
  { id: 'AFDR', type: 'sensory', system: 'worm', x: 0.1, y: 0.65, threshold: -55, refractory: 5, label: 'R thermosensory' },
  { id: 'ASHL', type: 'sensory', system: 'worm', x: 0.1, y: 0.75, threshold: -55, refractory: 5, label: 'L nociceptor' },
  { id: 'ASHR', type: 'sensory', system: 'worm', x: 0.1, y: 0.85, threshold: -55, refractory: 5, label: 'R nociceptor' },
  { id: 'AIAL', type: 'inter', system: 'worm', x: 0.3, y: 0.2, threshold: -50, refractory: 3, label: 'L amphid inter' },
  { id: 'AIAR', type: 'inter', system: 'worm', x: 0.3, y: 0.35, threshold: -50, refractory: 3, label: 'R amphid inter' },
  { id: 'AIBL', type: 'inter', system: 'worm', x: 0.3, y: 0.5, threshold: -50, refractory: 3, label: 'L integration' },
  { id: 'AIBR', type: 'inter', system: 'worm', x: 0.3, y: 0.65, threshold: -50, refractory: 3, label: 'R integration' },
  { id: 'AIYL', type: 'inter', system: 'worm', x: 0.3, y: 0.8, threshold: -50, refractory: 3, label: 'L interneuron Y' },
  { id: 'AVBL', type: 'inter', system: 'worm', x: 0.5, y: 0.25, threshold: -48, refractory: 4, label: 'Forward cmd L' },
  { id: 'AVBR', type: 'inter', system: 'worm', x: 0.5, y: 0.4, threshold: -48, refractory: 4, label: 'Forward cmd R' },
  { id: 'AVAL', type: 'inter', system: 'worm', x: 0.5, y: 0.6, threshold: -48, refractory: 4, label: 'Reverse cmd L' },
  { id: 'AVAR', type: 'inter', system: 'worm', x: 0.5, y: 0.75, threshold: -48, refractory: 4, label: 'Reverse cmd R' },
  { id: 'DB1', type: 'motor', system: 'worm', x: 0.7, y: 0.15, threshold: -52, refractory: 6, label: 'Dorsal B motor 1' },
  { id: 'DB2', type: 'motor', system: 'worm', x: 0.7, y: 0.3, threshold: -52, refractory: 6, label: 'Dorsal B motor 2' },
  { id: 'VB1', type: 'motor', system: 'worm', x: 0.7, y: 0.45, threshold: -52, refractory: 6, label: 'Ventral B motor 1' },
  { id: 'VB2', type: 'motor', system: 'worm', x: 0.7, y: 0.6, threshold: -52, refractory: 6, label: 'Ventral B motor 2' },
  { id: 'DA1', type: 'motor', system: 'worm', x: 0.7, y: 0.75, threshold: -52, refractory: 6, label: 'Dorsal A motor 1' },
  { id: 'VA1', type: 'motor', system: 'worm', x: 0.7, y: 0.9, threshold: -52, refractory: 6, label: 'Ventral A motor 1' },
  { id: 'RIML', type: 'modulatory', system: 'worm', x: 0.4, y: 0.1, threshold: -50, refractory: 4, label: 'Ring motor L' },
  { id: 'RIMR', type: 'modulatory', system: 'worm', x: 0.4, y: 0.9, threshold: -50, refractory: 4, label: 'Ring motor R' },
]

const FLY_NEURONS: NeuronSpec[] = [
  { id: 'KC1', type: 'inter', system: 'fly', x: 0.15, y: 0.2, threshold: -52, refractory: 4, label: 'Kenyon cell alpha' },
  { id: 'KC2', type: 'inter', system: 'fly', x: 0.15, y: 0.35, threshold: -52, refractory: 4, label: 'Kenyon cell beta' },
  { id: 'KC3', type: 'inter', system: 'fly', x: 0.15, y: 0.5, threshold: -52, refractory: 4, label: 'Kenyon cell gamma' },
  { id: 'KC4', type: 'inter', system: 'fly', x: 0.15, y: 0.65, threshold: -52, refractory: 4, label: "Kenyon cell alpha'" },
  { id: 'KC5', type: 'inter', system: 'fly', x: 0.15, y: 0.8, threshold: -52, refractory: 4, label: "Kenyon cell beta'" },
  { id: 'MBON1', type: 'inter', system: 'fly', x: 0.4, y: 0.15, threshold: -48, refractory: 5, label: 'MBON-alpha2' },
  { id: 'MBON2', type: 'inter', system: 'fly', x: 0.4, y: 0.35, threshold: -48, refractory: 5, label: 'MBON-beta2' },
  { id: 'MBON3', type: 'inter', system: 'fly', x: 0.4, y: 0.55, threshold: -48, refractory: 5, label: 'MBON-gamma5' },
  { id: 'MBON4', type: 'inter', system: 'fly', x: 0.4, y: 0.75, threshold: -48, refractory: 5, label: 'MBON-calyx' },
  { id: 'DAN1', type: 'modulatory', system: 'fly', x: 0.6, y: 0.25, threshold: -50, refractory: 8, label: 'DAN PPL1-alpha3' },
  { id: 'DAN2', type: 'modulatory', system: 'fly', x: 0.6, y: 0.5, threshold: -50, refractory: 8, label: 'DAN PAM-beta2' },
  { id: 'DAN3', type: 'modulatory', system: 'fly', x: 0.6, y: 0.75, threshold: -50, refractory: 8, label: 'DAN PPL1-gamma2' },
  { id: 'EPG1', type: 'inter', system: 'fly', x: 0.75, y: 0.2, threshold: -48, refractory: 3, label: 'E-PG compass 1' },
  { id: 'EPG2', type: 'inter', system: 'fly', x: 0.75, y: 0.4, threshold: -48, refractory: 3, label: 'E-PG compass 2' },
  { id: 'PEN1', type: 'inter', system: 'fly', x: 0.75, y: 0.6, threshold: -48, refractory: 3, label: 'P-EN angular vel' },
  { id: 'PFL1', type: 'inter', system: 'fly', x: 0.75, y: 0.8, threshold: -45, refractory: 4, label: 'PFL steering' },
  { id: 'DN1', type: 'motor', system: 'fly', x: 0.9, y: 0.35, threshold: -50, refractory: 5, label: 'Descending 1' },
  { id: 'DN2', type: 'motor', system: 'fly', x: 0.9, y: 0.65, threshold: -50, refractory: 5, label: 'Descending 2' },
]

const BRIDGE_NEURONS: NeuronSpec[] = [
  { id: 'BR_SM', type: 'inter', system: 'bridge', x: 0.5, y: 0.2, threshold: -50, refractory: 3, label: 'Sensory-Motor bridge' },
  { id: 'BR_CM', type: 'inter', system: 'bridge', x: 0.5, y: 0.4, threshold: -50, refractory: 3, label: 'Command-Memory bridge' },
  { id: 'BR_RW', type: 'inter', system: 'bridge', x: 0.5, y: 0.6, threshold: -50, refractory: 3, label: 'Reward-Reflex bridge' },
  { id: 'BR_DM', type: 'inter', system: 'bridge', x: 0.5, y: 0.8, threshold: -50, refractory: 3, label: 'Decision-Motor bridge' },
]

const WORM_SYNAPSES: SynapseSpec[] = [
  { from: 'ASEL', to: 'AIAL', weight: 3.2, type: 'chemical' },
  { from: 'ASER', to: 'AIAR', weight: 3.0, type: 'chemical' },
  { from: 'AWCL', to: 'AIAL', weight: 2.5, type: 'chemical' },
  { from: 'AWCR', to: 'AIAR', weight: 2.5, type: 'chemical' },
  { from: 'AFDL', to: 'AIYL', weight: 2.0, type: 'chemical' },
  { from: 'AFDR', to: 'AIYL', weight: 1.8, type: 'chemical' },
  { from: 'ASHL', to: 'AIBL', weight: 4.0, type: 'chemical' },
  { from: 'ASHR', to: 'AIBR', weight: 4.0, type: 'chemical' },
  { from: 'AIAL', to: 'AIBL', weight: 2.0, type: 'chemical' },
  { from: 'AIAR', to: 'AIBR', weight: 2.0, type: 'chemical' },
  { from: 'AIBL', to: 'AVAL', weight: 3.5, type: 'chemical' },
  { from: 'AIBR', to: 'AVAR', weight: 3.5, type: 'chemical' },
  { from: 'AIYL', to: 'AVBL', weight: 2.8, type: 'chemical' },
  { from: 'AIAL', to: 'AVBL', weight: 1.5, type: 'chemical' },
  { from: 'AIAR', to: 'AVBR', weight: 1.5, type: 'chemical' },
  { from: 'AVBL', to: 'AVBR', weight: 2.0, type: 'electrical' },
  { from: 'AVAL', to: 'AVAR', weight: 2.0, type: 'electrical' },
  { from: 'AIAL', to: 'AIAR', weight: 1.5, type: 'electrical' },
  { from: 'AVBL', to: 'DB1', weight: 3.0, type: 'chemical' },
  { from: 'AVBL', to: 'DB2', weight: 2.8, type: 'chemical' },
  { from: 'AVBR', to: 'VB1', weight: 3.0, type: 'chemical' },
  { from: 'AVBR', to: 'VB2', weight: 2.8, type: 'chemical' },
  { from: 'AVAL', to: 'DA1', weight: 3.2, type: 'chemical' },
  { from: 'AVAR', to: 'VA1', weight: 3.2, type: 'chemical' },
  { from: 'RIML', to: 'AVBL', weight: 1.0, type: 'chemical' },
  { from: 'RIMR', to: 'AVBR', weight: 1.0, type: 'chemical' },
]

const FLY_SYNAPSES: SynapseSpec[] = [
  { from: 'KC1', to: 'MBON1', weight: 2.0, type: 'chemical' },
  { from: 'KC2', to: 'MBON2', weight: 2.0, type: 'chemical' },
  { from: 'KC3', to: 'MBON3', weight: 2.5, type: 'chemical' },
  { from: 'KC4', to: 'MBON1', weight: 1.5, type: 'chemical' },
  { from: 'KC5', to: 'MBON4', weight: 2.0, type: 'chemical' },
  { from: 'DAN1', to: 'KC1', weight: -1.5, type: 'chemical' },
  { from: 'DAN2', to: 'KC3', weight: 2.0, type: 'chemical' },
  { from: 'DAN3', to: 'KC5', weight: -1.0, type: 'chemical' },
  { from: 'MBON1', to: 'EPG1', weight: 2.5, type: 'chemical' },
  { from: 'MBON2', to: 'EPG2', weight: 2.5, type: 'chemical' },
  { from: 'MBON3', to: 'PEN1', weight: 2.0, type: 'chemical' },
  { from: 'MBON4', to: 'PFL1', weight: 3.0, type: 'chemical' },
  { from: 'EPG1', to: 'PEN1', weight: 1.8, type: 'chemical' },
  { from: 'EPG2', to: 'PEN1', weight: 1.5, type: 'chemical' },
  { from: 'PEN1', to: 'EPG1', weight: 1.2, type: 'chemical' },
  { from: 'PEN1', to: 'PFL1', weight: 2.0, type: 'chemical' },
  { from: 'EPG1', to: 'EPG2', weight: 1.0, type: 'electrical' },
  { from: 'PFL1', to: 'DN1', weight: 3.5, type: 'chemical' },
  { from: 'PFL1', to: 'DN2', weight: 2.5, type: 'chemical' },
  { from: 'MBON1', to: 'DN1', weight: 1.5, type: 'chemical' },
]

const BRIDGE_SYNAPSES: SynapseSpec[] = [
  { from: 'AIAL', to: 'BR_SM', weight: 2.0, type: 'bridge' },
  { from: 'AIAR', to: 'BR_SM', weight: 2.0, type: 'bridge' },
  { from: 'AVBL', to: 'BR_CM', weight: 1.5, type: 'bridge' },
  { from: 'AVAL', to: 'BR_CM', weight: 1.5, type: 'bridge' },
  { from: 'BR_SM', to: 'KC1', weight: 2.5, type: 'bridge' },
  { from: 'BR_SM', to: 'KC2', weight: 2.0, type: 'bridge' },
  { from: 'BR_CM', to: 'KC3', weight: 2.0, type: 'bridge' },
  { from: 'BR_CM', to: 'DAN2', weight: 1.5, type: 'bridge' },
  { from: 'DN1', to: 'BR_DM', weight: 3.0, type: 'bridge' },
  { from: 'DN2', to: 'BR_DM', weight: 2.5, type: 'bridge' },
  { from: 'BR_DM', to: 'AVBL', weight: 2.0, type: 'bridge' },
  { from: 'BR_DM', to: 'AVAL', weight: -1.5, type: 'bridge' },
  { from: 'DAN2', to: 'BR_RW', weight: 2.0, type: 'bridge' },
  { from: 'BR_RW', to: 'RIML', weight: 1.5, type: 'bridge' },
  { from: 'BR_RW', to: 'RIMR', weight: 1.5, type: 'bridge' },
]

export function buildConnectome() {
  const neurons: Map<string, Neuron> = new Map()
  const synapses: Synapse[] = []

  const init = (spec: NeuronSpec): Neuron => ({
    id: spec.id, type: spec.type, system: spec.system,
    x: spec.x, y: spec.y, threshold: spec.threshold,
    refractory: spec.refractory, label: spec.label,
    potential: -70, lastFired: -1000,
  })

  for (const n of WORM_NEURONS) neurons.set(n.id, init(n))
  for (const n of FLY_NEURONS) neurons.set(n.id, init(n))
  for (const n of BRIDGE_NEURONS) neurons.set(n.id, init(n))

  const addSynapses = (list: SynapseSpec[], defaultDelay: number) => {
    for (const s of list) {
      if (neurons.has(s.from) && neurons.has(s.to)) {
        synapses.push({ ...s, delay: s.type === 'electrical' ? 0.5 : defaultDelay })
      }
    }
  }

  addSynapses(WORM_SYNAPSES, 2)
  addSynapses(FLY_SYNAPSES, 3)
  addSynapses(BRIDGE_SYNAPSES, 5)

  return { neurons, synapses }
}

export type { Neuron, Synapse, NeuronType, System, SynapseType }

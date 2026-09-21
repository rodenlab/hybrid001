#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════
// Hybrid #001 — Experiment Runner
// Wraps the LIF simulation engine for controlled, reproducible experiments
// Usage: npx tsx runner.ts --experiment baseline --trials 500
// ═══════════════════════════════════════════════════════════════

import { buildConnectome, type Neuron, type Synapse } from '../src/connectome'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// ─── Types ───────────────────────────────────────────────────────

interface SimConfig {
  system: 'worm' | 'fly' | 'hybrid'
  bridgeEnabled: boolean
  stimulus: 'chemotaxis' | 'nociception' | 'thermal' | 'reward' | 'conflict' | 'none'
  stimulusStrength: number     // mV
  duration: number             // timesteps
  plasticityEnabled: boolean
  plasticityRate: number       // weight increment per co-activation
  spontaneousRate: number      // probability per frame of random sensory input
  seed: number
}

interface TrialResult {
  seed: number
  config: SimConfig
  forwardSpikes: number
  reverseSpikes: number
  selectivityRatio: number
  totalSpikes: number
  bridgeSpikes: number
  spikesByNeuron: Record<string, number>
  spikesBySystem: { worm: number; fly: number; bridge: number }
  responseLatency: number      // timesteps until first motor spike after stimulus
  finalWeights: Record<string, number>  // KC-MBON weights after run
  durationMs: number           // wall time
}

interface ExperimentResult {
  name: string
  hypothesis: string
  trials: TrialResult[]
  config: SimConfig
  timestamp: string
  engineVersion: string
  summary: ExperimentSummary
}

interface ExperimentSummary {
  meanSelectivity: number
  stdSelectivity: number
  meanForward: number
  meanReverse: number
  meanBridgeSpikes: number
  meanResponseLatency: number
  totalTrials: number
}

// ─── Seeded RNG (Mulberry32) ─────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Simulation Core (self-contained, seeded) ─────────────────────

const V_REST = -70
const V_PEAK = 40
const TAU = 20
const DT = 0.5
const STEPS_PER_FRAME = 4

const FORWARD_MOTORS = ['DB1', 'DB2', 'VB1', 'VB2']
const REVERSE_MOTORS = ['DA1', 'VA1']
const BRIDGE_NEURONS = ['BR_SM', 'BR_CM', 'BR_RW', 'BR_DM']
const KC_MBON_PAIRS = [
  ['KC1', 'MBON1'], ['KC2', 'MBON2'], ['KC3', 'MBON3'],
  ['KC4', 'MBON1'], ['KC5', 'MBON4'],
]

const STIMULUS_TARGETS: Record<string, string[]> = {
  chemotaxis: ['ASEL', 'ASER', 'AWCL', 'AWCR'],
  nociception: ['ASHL', 'ASHR'],
  thermal: ['AFDL', 'AFDR'],
  reward: ['DAN2'],
  conflict: ['ASHL', 'ASHR', 'DAN2'],
  none: [],
}

function runSimulation(config: SimConfig): TrialResult {
  const start = performance.now()
  const rng = mulberry32(config.seed)

  // Build connectome
  const { neurons: allNeurons, synapses: allSynapses } = buildConnectome()

  // Filter by system config
  const neurons = new Map<string, Neuron>()
  const synapses: Synapse[] = []

  for (const [id, n] of allNeurons) {
    if (config.system === 'worm' && n.system === 'fly') continue
    if (config.system === 'fly' && n.system === 'worm') continue
    if (!config.bridgeEnabled && n.system === 'bridge') continue
    neurons.set(id, { ...n, potential: V_REST, lastFired: -1000 })
  }

  for (const s of allSynapses) {
    if (!neurons.has(s.from) || !neurons.has(s.to)) continue
    if (!config.bridgeEnabled && s.type === 'bridge') continue
    synapses.push({ ...s })
  }

  // Mutable KC-MBON weights for plasticity
  const kcMbonWeights = new Map<string, number>()
  for (const s of synapses) {
    const key = `${s.from}->${s.to}`
    if (KC_MBON_PAIRS.some(([kc, mbon]) => s.from === kc && s.to === mbon)) {
      kcMbonWeights.set(key, s.weight)
    }
  }

  // Tracking
  const spikeCounts: Record<string, number> = {}
  for (const id of neurons.keys()) spikeCounts[id] = 0
  let forwardSpikes = 0
  let reverseSpikes = 0
  let bridgeSpikes = 0
  let totalSpikes = 0
  let firstMotorSpikeTime = -1
  let stimulusApplied = false
  let stimulusTime = -1

  // Spike tracking for plasticity
  const lastSpikeTime = new Map<string, number>()

  // Run simulation
  let time = 0
  for (let frame = 0; frame < config.duration; frame++) {
    // Spontaneous activity
    if (rng() < config.spontaneousRate) {
      const sensory = [...neurons.values()].filter(n => n.type === 'sensory')
      if (sensory.length > 0) {
        const n = sensory[Math.floor(rng() * sensory.length)]
        n.potential += 15 + rng() * 10
      }
    }

    // Apply stimulus at frame 100 (50ms in)
    if (frame === 100 && config.stimulus !== 'none') {
      const targets = STIMULUS_TARGETS[config.stimulus] || []
      for (const id of targets) {
        const n = neurons.get(id)
        if (n) n.potential += config.stimulusStrength
      }
      stimulusApplied = true
      stimulusTime = time
    }

    // Integration steps
    for (let step = 0; step < STEPS_PER_FRAME; step++) {
      // Synaptic transmission
      for (const syn of synapses) {
        const pre = neurons.get(syn.from)
        const post = neurons.get(syn.to)
        if (!pre || !post) continue

        const timeSinceFire = time - pre.lastFired
        if (timeSinceFire >= syn.delay && timeSinceFire < syn.delay + DT * 2) {
          // Use possibly-updated weight for KC-MBON
          const key = `${syn.from}->${syn.to}`
          const w = kcMbonWeights.get(key) ?? syn.weight
          post.potential += w * 3

          if (syn.type === 'electrical') {
            pre.potential += w * 3 * 0.3
          }
        }
      }

      // Neuron update
      for (const [id, n] of neurons) {
        const timeSinceFire = time - n.lastFired
        if (timeSinceFire < n.refractory) {
          n.potential = V_REST + 5
          continue
        }
        if (n.potential >= V_PEAK) {
          n.potential = V_REST + 10
          continue
        }

        n.potential += (-(n.potential - V_REST) / TAU) * DT
        n.potential += (rng() - 0.5) * 0.3

        if (n.potential >= n.threshold) {
          n.potential = V_PEAK
          n.lastFired = time
          spikeCounts[id] = (spikeCounts[id] || 0) + 1
          totalSpikes++
          lastSpikeTime.set(id, time)

          if (FORWARD_MOTORS.includes(id)) {
            forwardSpikes++
            if (firstMotorSpikeTime < 0 && stimulusApplied) {
              firstMotorSpikeTime = time - stimulusTime
            }
          }
          if (REVERSE_MOTORS.includes(id)) {
            reverseSpikes++
            if (firstMotorSpikeTime < 0 && stimulusApplied) {
              firstMotorSpikeTime = time - stimulusTime
            }
          }
          if (BRIDGE_NEURONS.includes(id)) bridgeSpikes++
        }

        n.potential = Math.max(V_REST - 5, Math.min(V_PEAK, n.potential))
      }

      time += DT
    }

    // Hebbian plasticity: if KC and MBON co-fire within 50ms during DAN2 activity
    if (config.plasticityEnabled) {
      const dan2Spike = lastSpikeTime.get('DAN2') ?? -1000
      if (time - dan2Spike < 50) {
        for (const [kc, mbon] of KC_MBON_PAIRS) {
          const kcTime = lastSpikeTime.get(kc) ?? -1000
          const mbonTime = lastSpikeTime.get(mbon) ?? -1000
          if (time - kcTime < 50 && time - mbonTime < 50) {
            const key = `${kc}->${mbon}`
            const current = kcMbonWeights.get(key)
            if (current !== undefined) {
              const baseWeight = KC_MBON_PAIRS.find(p => p[0] === kc && p[1] === mbon)
                ? allSynapses.find(s => s.from === kc && s.to === mbon)?.weight ?? 2.0
                : 2.0
              kcMbonWeights.set(key, Math.min(current + config.plasticityRate, baseWeight * 2))
            }
          }
        }
      }
    }
  }

  // Compute per-system spike counts
  const spikesBySystem = { worm: 0, fly: 0, bridge: 0 }
  for (const [id, count] of Object.entries(spikeCounts)) {
    const n = neurons.get(id)
    if (n) spikesBySystem[n.system] += count
  }

  // Final weights
  const finalWeights: Record<string, number> = {}
  for (const [key, w] of kcMbonWeights) finalWeights[key] = w

  return {
    seed: config.seed,
    config,
    forwardSpikes,
    reverseSpikes,
    selectivityRatio: reverseSpikes > 0 ? forwardSpikes / reverseSpikes : forwardSpikes > 0 ? Infinity : 0,
    totalSpikes,
    bridgeSpikes,
    spikesByNeuron: spikeCounts,
    spikesBySystem,
    responseLatency: firstMotorSpikeTime >= 0 ? firstMotorSpikeTime : -1,
    finalWeights,
    durationMs: performance.now() - start,
  }
}

// ─── Experiment Definitions ──────────────────────────────────────

function baselineExperiment(trials: number): ExperimentResult {
  const configs: SimConfig[] = [
    { system: 'worm', bridgeEnabled: false, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    { system: 'fly', bridgeEnabled: false, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    { system: 'hybrid', bridgeEnabled: true, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
  ]

  const allTrials: TrialResult[] = []
  for (const baseConfig of configs) {
    for (let seed = 0; seed < trials; seed++) {
      const config = { ...baseConfig, seed }
      allTrials.push(runSimulation(config))
      if ((seed + 1) % 50 === 0) {
        process.stderr.write(`  ${baseConfig.system}: ${seed + 1}/${trials}\n`)
      }
    }
  }

  return buildResult('baseline', 'hybrid activity is not a simple superposition of worm + fly', allTrials, configs[2])
}

function coherenceExperiment(trials: number): ExperimentResult {
  const allTrials: TrialResult[] = []

  // Worm-only
  for (let seed = 0; seed < trials; seed++) {
    allTrials.push(runSimulation({
      system: 'worm', bridgeEnabled: false, stimulus: 'chemotaxis',
      stimulusStrength: 30, duration: 2000, plasticityEnabled: false,
      plasticityRate: 0, spontaneousRate: 0.08, seed,
    }))
  }
  process.stderr.write(`  worm-only: done\n`)

  // Hybrid
  for (let seed = 0; seed < trials; seed++) {
    allTrials.push(runSimulation({
      system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis',
      stimulusStrength: 30, duration: 2000, plasticityEnabled: false,
      plasticityRate: 0, spontaneousRate: 0.08, seed,
    }))
  }
  process.stderr.write(`  hybrid: done\n`)

  return buildResult('coherence', 'fly circuits increase sensorimotor selectivity', allTrials, allTrials[0].config)
}

function learningExperiment(trials: number): ExperimentResult {
  const allTrials: TrialResult[] = []

  for (let seed = 0; seed < trials; seed++) {
    // 50 conditioning trials with reward
    let accumulatedWeights: Record<string, number> = {}
    for (let trial = 0; trial < 50; trial++) {
      const result = runSimulation({
        system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis',
        stimulusStrength: 30, duration: 1000, plasticityEnabled: true,
        plasticityRate: 0.05, spontaneousRate: 0.08,
        seed: seed * 1000 + trial,
      })
      accumulatedWeights = result.finalWeights
      if (trial % 10 === 9) {
        allTrials.push({ ...result, seed: seed * 1000 + trial })
      }
    }

    // 20 test trials without reward
    for (let test = 0; test < 20; test++) {
      const result = runSimulation({
        system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis',
        stimulusStrength: 30, duration: 1000, plasticityEnabled: false,
        plasticityRate: 0, spontaneousRate: 0.08,
        seed: seed * 1000 + 50 + test,
      })
      allTrials.push({ ...result, seed: seed * 1000 + 50 + test })
    }
    if ((seed + 1) % 10 === 0) process.stderr.write(`  learning: ${seed + 1}/${trials}\n`)
  }

  return buildResult('learning', 'hybrid acquires conditioned response via KC-MBON plasticity', allTrials, allTrials[0].config)
}

function conflictExperiment(trials: number): ExperimentResult {
  const allTrials: TrialResult[] = []

  const conditions = [
    { label: 'worm-nociception', system: 'worm' as const, bridge: false, stimulus: 'nociception' as const },
    { label: 'hybrid-nociception', system: 'hybrid' as const, bridge: true, stimulus: 'nociception' as const },
    { label: 'hybrid-reward', system: 'hybrid' as const, bridge: true, stimulus: 'reward' as const },
    { label: 'hybrid-conflict', system: 'hybrid' as const, bridge: true, stimulus: 'conflict' as const },
    { label: 'hybrid-conflict-no-bridge', system: 'hybrid' as const, bridge: false, stimulus: 'conflict' as const },
  ]

  for (const cond of conditions) {
    for (let seed = 0; seed < trials; seed++) {
      allTrials.push(runSimulation({
        system: cond.system, bridgeEnabled: cond.bridge, stimulus: cond.stimulus,
        stimulusStrength: 35, duration: 2000, plasticityEnabled: false,
        plasticityRate: 0, spontaneousRate: 0.08, seed,
      }))
    }
    process.stderr.write(`  ${cond.label}: done\n`)
  }

  return buildResult('conflict', 'hybrid produces novel conflict resolution behavior', allTrials, allTrials[0].config)
}

function bridgeAblationExperiment(trials: number): ExperimentResult {
  const allTrials: TrialResult[] = []

  for (let seed = 0; seed < trials; seed++) {
    // Control (bridge on)
    allTrials.push(runSimulation({
      system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis',
      stimulusStrength: 30, duration: 5000, plasticityEnabled: false,
      plasticityRate: 0, spontaneousRate: 0.08, seed,
    }))

    // Ablated (bridge off, same seed)
    allTrials.push(runSimulation({
      system: 'hybrid', bridgeEnabled: false, stimulus: 'chemotaxis',
      stimulusStrength: 30, duration: 5000, plasticityEnabled: false,
      plasticityRate: 0, spontaneousRate: 0.08, seed,
    }))

    if ((seed + 1) % 100 === 0) process.stderr.write(`  ablation: ${seed + 1}/${trials}\n`)
  }

  return buildResult('bridge-ablation', 'bridge removal eliminates cross-species effects', allTrials, allTrials[0].config)
}

// ─── Analysis ────────────────────────────────────────────────────

function buildResult(name: string, hypothesis: string, trials: TrialResult[], config: SimConfig): ExperimentResult {
  const selectivities = trials.map(t => t.selectivityRatio).filter(s => isFinite(s))
  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const std = (arr: number[]) => {
    const m = mean(arr)
    return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length || 1))
  }

  return {
    name,
    hypothesis,
    trials,
    config,
    timestamp: new Date().toISOString(),
    engineVersion: '1.0.0',
    summary: {
      meanSelectivity: mean(selectivities),
      stdSelectivity: std(selectivities),
      meanForward: mean(trials.map(t => t.forwardSpikes)),
      meanReverse: mean(trials.map(t => t.reverseSpikes)),
      meanBridgeSpikes: mean(trials.map(t => t.bridgeSpikes)),
      meanResponseLatency: mean(trials.filter(t => t.responseLatency >= 0).map(t => t.responseLatency)),
      totalTrials: trials.length,
    },
  }
}

function printSummary(result: ExperimentResult) {
  const s = result.summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`EXPERIMENT: ${result.name}`)
  console.log(`HYPOTHESIS: ${result.hypothesis}`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`trials:              ${s.totalTrials}`)
  console.log(`mean selectivity:    ${s.meanSelectivity.toFixed(3)} ± ${s.stdSelectivity.toFixed(3)}`)
  console.log(`mean forward spikes: ${s.meanForward.toFixed(1)}`)
  console.log(`mean reverse spikes: ${s.meanReverse.toFixed(1)}`)
  console.log(`mean bridge spikes:  ${s.meanBridgeSpikes.toFixed(1)}`)
  console.log(`mean response lat:   ${s.meanResponseLatency.toFixed(1)} timesteps`)
  console.log(`timestamp:           ${result.timestamp}`)
  console.log(`engine:              ${result.engineVersion}`)

  // Per-condition breakdown if multiple systems
  const bySystem = new Map<string, TrialResult[]>()
  for (const t of result.trials) {
    const key = `${t.config.system}/${t.config.bridgeEnabled ? 'bridge' : 'no-bridge'}/${t.config.stimulus}`
    if (!bySystem.has(key)) bySystem.set(key, [])
    bySystem.get(key)!.push(t)
  }
  if (bySystem.size > 1) {
    console.log(`\n  condition breakdown:`)
    for (const [key, trials] of bySystem) {
      const sels = trials.map(t => t.selectivityRatio).filter(s => isFinite(s))
      const m = sels.length ? sels.reduce((a, b) => a + b, 0) / sels.length : 0
      const fwd = trials.reduce((a, t) => a + t.forwardSpikes, 0) / trials.length
      const rev = trials.reduce((a, t) => a + t.reverseSpikes, 0) / trials.length
      console.log(`    ${key.padEnd(45)} S=${m.toFixed(3)}  fwd=${fwd.toFixed(1)}  rev=${rev.toFixed(1)}  n=${trials.length}`)
    }
  }
  console.log()
}

// ─── CLI ─────────────────────────────────────────────────────────

const EXPERIMENTS: Record<string, (trials: number) => ExperimentResult> = {
  baseline: baselineExperiment,
  coherence: coherenceExperiment,
  learning: learningExperiment,
  conflict: conflictExperiment,
  'bridge-ablation': bridgeAblationExperiment,
}

function main() {
  const args = process.argv.slice(2)
  let experimentName = 'baseline'
  let trials = 100
  let outputFile: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--experiment' || args[i] === '-e') experimentName = args[++i]
    if (args[i] === '--trials' || args[i] === '-n') trials = parseInt(args[++i])
    if (args[i] === '--output' || args[i] === '-o') outputFile = args[++i]
    if (args[i] === '--list') {
      console.log('available experiments:', Object.keys(EXPERIMENTS).join(', '))
      process.exit(0)
    }
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`usage: npx tsx runner.ts [options]
  -e, --experiment NAME   experiment to run (${Object.keys(EXPERIMENTS).join('|')})
  -n, --trials N          number of trials per condition (default: 100)
  -o, --output FILE       save results JSON to file
  --list                  list available experiments`)
      process.exit(0)
    }
  }

  const fn = EXPERIMENTS[experimentName]
  if (!fn) {
    console.error(`unknown experiment: ${experimentName}`)
    console.error(`available: ${Object.keys(EXPERIMENTS).join(', ')}`)
    process.exit(1)
  }

  console.log(`running experiment: ${experimentName} (${trials} trials per condition)`)
  const result = fn(trials)
  printSummary(result)

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true })
    // Strip individual trial spike-by-neuron data to keep file reasonable
    const compact = {
      ...result,
      trials: result.trials.map(t => ({
        seed: t.seed,
        system: t.config.system,
        bridge: t.config.bridgeEnabled,
        stimulus: t.config.stimulus,
        forwardSpikes: t.forwardSpikes,
        reverseSpikes: t.reverseSpikes,
        selectivityRatio: t.selectivityRatio,
        totalSpikes: t.totalSpikes,
        bridgeSpikes: t.bridgeSpikes,
        spikesBySystem: t.spikesBySystem,
        responseLatency: t.responseLatency,
        finalWeights: t.finalWeights,
        durationMs: t.durationMs,
      })),
    }
    writeFileSync(outputFile, JSON.stringify(compact, null, 2))
    console.log(`results saved to: ${outputFile}`)
  }
}

main()

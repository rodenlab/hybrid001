#!/usr/bin/env npx tsx
// hybrid001 command-line interface

import { buildConnectome } from './connectome'
import type { Neuron, Synapse, SimConfig, TrialResult } from './types'
import { mean, std, welchTTest, summarizeTrials } from './analysis'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// seeded RNG (mulberry32)
function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const V_REST = -70, V_PEAK = 40, TAU = 20, DT = 0.5, STEPS = 4
const FWD = ['DB1', 'DB2', 'VB1', 'VB2']
const REV = ['DA1', 'VA1']
const BRIDGE = ['BR_SM', 'BR_CM', 'BR_RW', 'BR_DM']

const STIM_TARGETS: Record<string, string[]> = {
  chemotaxis: ['ASEL', 'ASER', 'AWCL', 'AWCR'],
  nociception: ['ASHL', 'ASHR'],
  thermal: ['AFDL', 'AFDR'],
  reward: ['DAN2'],
  conflict: ['ASHL', 'ASHR', 'DAN2'],
  none: [],
}

function runTrial(config: SimConfig): TrialResult {
  const start = performance.now()
  const rand = mulberry32(config.seed)
  const { neurons: allN, synapses: allS } = buildConnectome()

  const neurons = new Map<string, Neuron>()
  const synapses: Synapse[] = []

  for (const [id, n] of allN) {
    if (config.system === 'worm' && n.system === 'fly') continue
    if (config.system === 'fly' && n.system === 'worm') continue
    if (!config.bridgeEnabled && n.system === 'bridge') continue
    neurons.set(id, { ...n, potential: V_REST, lastFired: -1000 })
  }
  for (const s of allS) {
    if (!neurons.has(s.from) || !neurons.has(s.to)) continue
    if (!config.bridgeEnabled && s.type === 'bridge') continue
    synapses.push({ ...s })
  }

  let fwd = 0, rev = 0, brg = 0, total = 0, time = 0
  let firstMotorTime = -1, stimApplied = false, stimTime = -1
  const bySys = { worm: 0, fly: 0, bridge: 0 }

  for (let frame = 0; frame < config.duration; frame++) {
    if (rand() < config.spontaneousRate) {
      const sensory = [...neurons.values()].filter(n => n.type === 'sensory')
      if (sensory.length) sensory[Math.floor(rand() * sensory.length)].potential += 15 + rand() * 10
    }

    if (frame === 100 && config.stimulus !== 'none') {
      for (const id of (STIM_TARGETS[config.stimulus] || [])) {
        const n = neurons.get(id)
        if (n) n.potential += config.stimulusStrength
      }
      stimApplied = true
      stimTime = time
    }

    for (let i = 0; i < STEPS; i++) {
      for (const syn of synapses) {
        const pre = neurons.get(syn.from), post = neurons.get(syn.to)
        if (!pre || !post) continue
        const dt = time - pre.lastFired
        if (dt >= syn.delay && dt < syn.delay + DT * 2) {
          post.potential += syn.weight * 3
          if (syn.type === 'electrical') pre.potential += syn.weight * 3 * 0.3
        }
      }
      for (const [id, n] of neurons) {
        if (time - n.lastFired < n.refractory) { n.potential = V_REST + 5; continue }
        if (n.potential >= V_PEAK) { n.potential = V_REST + 10; continue }
        n.potential += (-(n.potential - V_REST) / TAU) * DT + (rand() - 0.5) * 0.3
        if (n.potential >= n.threshold) {
          n.potential = V_PEAK; n.lastFired = time; total++
          if (FWD.includes(id)) { fwd++; if (firstMotorTime < 0 && stimApplied) firstMotorTime = time - stimTime }
          if (REV.includes(id)) { rev++; if (firstMotorTime < 0 && stimApplied) firstMotorTime = time - stimTime }
          if (BRIDGE.includes(id)) brg++
          if (n.system === 'worm') bySys.worm++
          else if (n.system === 'fly') bySys.fly++
          else bySys.bridge++
        }
        n.potential = Math.max(V_REST - 5, Math.min(V_PEAK, n.potential))
      }
      time += DT
    }
  }

  return {
    seed: config.seed, config,
    forwardSpikes: fwd, reverseSpikes: rev,
    selectivityRatio: rev > 0 ? fwd / rev : (fwd > 0 ? Infinity : 0),
    totalSpikes: total, bridgeSpikes: brg,
    spikesBySystem: bySys,
    responseLatency: firstMotorTime,
    finalWeights: {},
    durationMs: performance.now() - start,
  }
}

// experiment definitions
function runExperiment(name: string, trials: number, baseSeed: number): TrialResult[] {
  const configs: Record<string, SimConfig[]> = {
    baseline: [
      { system: 'worm', bridgeEnabled: false, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
      { system: 'fly', bridgeEnabled: false, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
      { system: 'hybrid', bridgeEnabled: true, stimulus: 'none', stimulusStrength: 30, duration: 10000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    ],
    coherence: [
      { system: 'worm', bridgeEnabled: false, stimulus: 'chemotaxis', stimulusStrength: 30, duration: 2000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
      { system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis', stimulusStrength: 30, duration: 2000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    ],
    conflict: [
      { system: 'worm', bridgeEnabled: false, stimulus: 'nociception', stimulusStrength: 35, duration: 2000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
      { system: 'hybrid', bridgeEnabled: true, stimulus: 'conflict', stimulusStrength: 35, duration: 2000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    ],
    'bridge-ablation': [
      { system: 'hybrid', bridgeEnabled: true, stimulus: 'chemotaxis', stimulusStrength: 30, duration: 5000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
      { system: 'hybrid', bridgeEnabled: false, stimulus: 'chemotaxis', stimulusStrength: 30, duration: 5000, plasticityEnabled: false, plasticityRate: 0, spontaneousRate: 0.08, seed: 0 },
    ],
  }

  const cfgs = configs[name]
  if (!cfgs) {
    console.error(`unknown experiment: ${name}`)
    console.error(`available: ${Object.keys(configs).join(', ')}`)
    process.exit(1)
  }

  const results: TrialResult[] = []
  for (const base of cfgs) {
    const label = `${base.system}/${base.bridgeEnabled ? 'bridge' : 'no-bridge'}/${base.stimulus}`
    for (let t = 0; t < trials; t++) {
      const config = { ...base, seed: baseSeed + t }
      results.push(runTrial(config))
      if ((t + 1) % 50 === 0) process.stderr.write(`  ${label}: ${t + 1}/${trials}\n`)
    }
  }
  return results
}

function printTable(results: TrialResult[]) {
  // group by condition
  const groups = new Map<string, TrialResult[]>()
  for (const r of results) {
    const key = `${r.config.system}/${r.config.bridgeEnabled ? 'bridge' : 'no-bridge'}/${r.config.stimulus}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  console.log('')
  console.log('  condition                                     S        fwd      rev      brg      total    n')
  console.log('  ' + '-'.repeat(95))
  for (const [key, trials] of groups) {
    const s = summarizeTrials(trials)
    console.log(`  ${key.padEnd(45)} ${s.meanSelectivity.toFixed(3).padStart(7)}  ${s.meanForward.toFixed(1).padStart(7)}  ${s.meanReverse.toFixed(1).padStart(7)}  ${s.meanBridge.toFixed(1).padStart(7)}  ${s.meanTotal.toFixed(1).padStart(7)}  ${String(trials.length).padStart(5)}`)
  }
  console.log('')
}

function main() {
  const args = process.argv.slice(2)
  let experiment = 'baseline'
  let trials = 100
  let seed = 42
  let output: string | null = null
  let format: 'table' | 'json' = 'table'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--experiment' || args[i] === '-e') experiment = args[++i]
    if (args[i] === '--trials' || args[i] === '-n') trials = parseInt(args[++i])
    if (args[i] === '--seed' || args[i] === '-s') seed = parseInt(args[++i])
    if (args[i] === '--output' || args[i] === '-o') output = args[++i]
    if (args[i] === '--format' || args[i] === '-f') format = args[++i] as any
    if (args[i] === '--list') {
      console.log('available: baseline, coherence, conflict, bridge-ablation')
      process.exit(0)
    }
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`hybrid001 -- cross-species neural simulation

usage: npx tsx src/cli.ts [options]

options:
  -e, --experiment NAME   experiment to run (baseline|coherence|conflict|bridge-ablation)
  -n, --trials N          trials per condition (default: 100)
  -s, --seed N            base RNG seed (default: 42)
  -o, --output FILE       save results to JSON file
  -f, --format FMT        output format: table or json (default: table)
  --list                  list available experiments
  -h, --help              show this help`)
      process.exit(0)
    }
  }

  console.log(`running: ${experiment} (${trials} trials, seed ${seed})`)
  const results = runExperiment(experiment, trials, seed)

  if (format === 'table') {
    printTable(results)
  } else {
    const compact = results.map(r => ({
      seed: r.seed, system: r.config.system,
      bridge: r.config.bridgeEnabled, stimulus: r.config.stimulus,
      fwd: r.forwardSpikes, rev: r.reverseSpikes,
      selectivity: r.selectivityRatio, total: r.totalSpikes,
      bridge_spikes: r.bridgeSpikes, by_system: r.spikesBySystem,
      latency: r.responseLatency, ms: r.durationMs,
    }))
    console.log(JSON.stringify({ experiment, trials: compact }, null, 2))
  }

  if (output) {
    mkdirSync(dirname(output), { recursive: true })
    const data = results.map(r => ({
      seed: r.seed, system: r.config.system,
      bridge: r.config.bridgeEnabled, stimulus: r.config.stimulus,
      fwd: r.forwardSpikes, rev: r.reverseSpikes,
      selectivity: r.selectivityRatio, total: r.totalSpikes,
      bridge_spikes: r.bridgeSpikes, by_system: r.spikesBySystem,
      latency: r.responseLatency,
    }))
    writeFileSync(output, JSON.stringify({ experiment, config: { trials, seed }, data }, null, 2))
    console.log(`saved to: ${output}`)
  }
}

main()

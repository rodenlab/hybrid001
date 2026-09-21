// statistical analysis utilities
// pure math, no external dependencies

import type { SpikeEvent, TrialResult } from './types'

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function std(arr: number[]): number {
  if (arr.length <= 1) return 0
  const m = mean(arr)
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

export function sem(arr: number[]): number {
  return std(arr) / Math.sqrt(arr.length)
}

// 95% confidence interval (normal approximation)
export function ci95(arr: number[]): [number, number] {
  const m = mean(arr)
  const s = sem(arr)
  return [m - 1.96 * s, m + 1.96 * s]
}

// welch's t-test (unequal variance)
// returns { t, df, p } where p is two-tailed
export function welchTTest(a: number[], b: number[]): { t: number; df: number; p: number } {
  const ma = mean(a), mb = mean(b)
  const va = std(a) ** 2, vb = std(b) ** 2
  const na = a.length, nb = b.length

  if (na < 2 || nb < 2) return { t: 0, df: 0, p: 1 }

  const se = Math.sqrt(va / na + vb / nb)
  if (se === 0) return { t: 0, df: na + nb - 2, p: 1 }

  const t = (ma - mb) / se

  // welch-satterthwaite degrees of freedom
  const num = (va / na + vb / nb) ** 2
  const den = (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)
  const df = num / den

  // approximate p-value using t distribution
  // uses the regularized incomplete beta function approximation
  const p = tDistPValue(Math.abs(t), df) * 2
  return { t, df, p: Math.min(1, p) }
}

// approximate one-tailed p-value for t distribution
function tDistPValue(t: number, df: number): number {
  // use the approximation: p ~ 0.5 * exp(-0.717 * t - 0.416 * t^2)
  // for df > 20 this is close enough; for small df we adjust
  const x = t * (1 - 1 / (4 * df))
  const p = 0.5 * Math.exp(-0.717 * x - 0.416 * x * x)
  return Math.max(0, Math.min(0.5, p))
}

// pearson correlation coefficient
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let num = 0, da2 = 0, db2 = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma
    const db = b[i] - mb
    num += da * db
    da2 += da * da
    db2 += db * db
  }
  const den = Math.sqrt(da2 * db2)
  return den === 0 ? 0 : num / den
}

// interspike interval statistics
export function isiStats(spikes: SpikeEvent[], neuronId: string): {
  count: number; meanISI: number; stdISI: number; cv: number; rate: number
} {
  const times = spikes.filter(s => s.neuronId === neuronId).map(s => s.time).sort((a, b) => a - b)
  if (times.length < 2) {
    return { count: times.length, meanISI: 0, stdISI: 0, cv: 0, rate: 0 }
  }
  const isis: number[] = []
  for (let i = 1; i < times.length; i++) {
    isis.push(times[i] - times[i - 1])
  }
  const m = mean(isis)
  const s = std(isis)
  const duration = times[times.length - 1] - times[0]
  return {
    count: times.length,
    meanISI: m,
    stdISI: s,
    cv: m > 0 ? s / m : 0,
    rate: duration > 0 ? (times.length - 1) / (duration / 1000) : 0,  // Hz
  }
}

// spike rate in Hz for a given time window
export function spikeRate(spikes: SpikeEvent[], neuronId: string, windowMs: number): number {
  const count = spikes.filter(s => s.neuronId === neuronId).length
  return count / (windowMs / 1000)
}

// selectivity ratio (forward / reverse motor spikes)
export function selectivityRatio(forwardSpikes: number, reverseSpikes: number): number {
  if (reverseSpikes === 0) return forwardSpikes > 0 ? Infinity : 0
  return forwardSpikes / reverseSpikes
}

// cross-correlation at a given lag (in timesteps)
export function crossCorrelation(
  a: number[],  // binary spike train, neuron a
  b: number[],  // binary spike train, neuron b
  maxLag: number
): { lags: number[]; correlations: number[] } {
  const lags: number[] = []
  const correlations: number[] = []
  const ma = mean(a), mb = mean(b)
  const sa = std(a), sb = std(b)
  if (sa === 0 || sb === 0) {
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      lags.push(lag)
      correlations.push(0)
    }
    return { lags, correlations }
  }

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let sum = 0, count = 0
    for (let i = 0; i < a.length; i++) {
      const j = i + lag
      if (j >= 0 && j < b.length) {
        sum += (a[i] - ma) * (b[j] - mb)
        count++
      }
    }
    lags.push(lag)
    correlations.push(count > 0 ? sum / (count * sa * sb) : 0)
  }
  return { lags, correlations }
}

// summarize an array of trial results
export function summarizeTrials(trials: TrialResult[]): {
  meanSelectivity: number; stdSelectivity: number
  meanForward: number; meanReverse: number
  meanBridge: number; meanTotal: number
  meanLatency: number
} {
  const finite = trials.map(t => t.selectivityRatio).filter(s => isFinite(s))
  return {
    meanSelectivity: mean(finite),
    stdSelectivity: std(finite),
    meanForward: mean(trials.map(t => t.forwardSpikes)),
    meanReverse: mean(trials.map(t => t.reverseSpikes)),
    meanBridge: mean(trials.map(t => t.bridgeSpikes)),
    meanTotal: mean(trials.map(t => t.totalSpikes)),
    meanLatency: mean(trials.filter(t => t.responseLatency >= 0).map(t => t.responseLatency)),
  }
}

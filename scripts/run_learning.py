#!/usr/bin/env python3
"""experiment 3: associative learning.
placeholder for learning trial analysis. the learning experiment
requires the plasticity-enabled runner (experiments/runner.ts)."""

import json
import sys
from pathlib import Path

def mean(arr):
    return sum(arr) / len(arr) if arr else 0

def main():
    if len(sys.argv) < 2:
        print("usage: python3 run_learning.py <results.json>")
        print("generate results with: npx tsx experiments/runner.ts -e learning -n 50")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    trials = data.get("data", data.get("trials", []))
    if not trials:
        print("no trial data")
        sys.exit(1)

    print()
    print("  associative learning analysis")
    print("  " + "-" * 60)
    print()
    print(f"  trials: {len(trials)}")

    # look for selectivity change over trials
    sels = [t.get("selectivity", 0) for t in trials]
    first_10 = mean(sels[:10]) if len(sels) >= 10 else mean(sels)
    last_10 = mean(sels[-10:]) if len(sels) >= 10 else mean(sels)
    print(f"  early selectivity (first 10): {first_10:.3f}")
    print(f"  late selectivity (last 10):   {last_10:.3f}")
    if first_10 > 0:
        print(f"  change: {((last_10 - first_10) / first_10 * 100):.1f}%")
    print()

if __name__ == "__main__":
    main()

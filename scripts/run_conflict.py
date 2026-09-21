#!/usr/bin/env python3
"""experiment 4: cross-species conflict resolution.
reads conflict experiment results and analyzes motor patterns."""

import json
import sys
from pathlib import Path

def mean(arr):
    return sum(arr) / len(arr) if arr else 0

def std(arr):
    if len(arr) < 2:
        return 0
    m = mean(arr)
    return (sum((x - m) ** 2 for x in arr) / (len(arr) - 1)) ** 0.5

def main():
    if len(sys.argv) < 2:
        print("usage: python3 run_conflict.py <results.json>")
        print("generate results with: npx tsx src/cli.ts -e conflict -n 200 -f json -o results/conflict.json")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    trials = data.get("data", data.get("trials", []))
    groups = {}
    for t in trials:
        key = f"{t['system']}/{t['bridge']}/{t['stimulus']}"
        groups.setdefault(key, []).append(t)

    print()
    print("  cross-species conflict analysis")
    print("  " + "-" * 60)
    print()

    for key, g in groups.items():
        sels = [t["selectivity"] for t in g if t["selectivity"] != float("inf")]
        print(f"  {key}")
        print(f"    n={len(g)}  S={mean(sels):.3f} +/- {std(sels):.3f}")
        print()

if __name__ == "__main__":
    main()

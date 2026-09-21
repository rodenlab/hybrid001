#!/usr/bin/env python3
"""experiment 1: baseline activity comparison.
reads results JSON from the CLI runner and prints formatted analysis."""

import json
import sys
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent / "results"

def load_results(path):
    with open(path) as f:
        return json.load(f)

def mean(arr):
    return sum(arr) / len(arr) if arr else 0

def std(arr):
    if len(arr) < 2:
        return 0
    m = mean(arr)
    return (sum((x - m) ** 2 for x in arr) / (len(arr) - 1)) ** 0.5

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else str(RESULTS_DIR / "baseline_200trials.json")
    try:
        data = load_results(path)
    except FileNotFoundError:
        print(f"no results file at {path}")
        print("run: npx tsx src/cli.ts -e baseline -n 200 -f json -o results/baseline_200trials.json")
        sys.exit(1)

    trials = data.get("data", data.get("trials", []))
    if not trials:
        print("no trial data found")
        sys.exit(1)

    # group by condition
    groups = {}
    for t in trials:
        key = f"{t['system']}/{t['bridge']}/{t['stimulus']}"
        groups.setdefault(key, []).append(t)

    print()
    print("  baseline activity analysis")
    print("  " + "-" * 60)
    print()

    for key, g in groups.items():
        totals = [t["total"] for t in g]
        fwds = [t["fwd"] for t in g]
        revs = [t["rev"] for t in g]
        sels = [t["selectivity"] for t in g if t["selectivity"] != float("inf")]

        print(f"  {key}")
        print(f"    trials:       {len(g)}")
        print(f"    total spikes: {mean(totals):.1f} +/- {std(totals):.1f}")
        print(f"    forward:      {mean(fwds):.1f} +/- {std(fwds):.1f}")
        print(f"    reverse:      {mean(revs):.1f} +/- {std(revs):.1f}")
        if sels:
            print(f"    selectivity:  {mean(sels):.3f} +/- {std(sels):.3f}")
        print()

    # compare hybrid vs worm-only if both present
    hybrid = groups.get("hybrid/true/none", [])
    worm = groups.get("worm/false/none", [])
    if hybrid and worm:
        h_total = mean([t["total"] for t in hybrid])
        w_total = mean([t["total"] for t in worm])
        increase = ((h_total - w_total) / w_total * 100) if w_total > 0 else 0
        print(f"  hybrid vs worm-only motor rate increase: {increase:.1f}%")
        print()

if __name__ == "__main__":
    main()

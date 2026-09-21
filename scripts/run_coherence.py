#!/usr/bin/env python3
"""experiment 2: sensorimotor coherence.
reads results JSON and computes selectivity ratio comparison."""

import json
import sys
from pathlib import Path

RESULTS_DIR = Path(__file__).parent.parent / "results"

def mean(arr):
    return sum(arr) / len(arr) if arr else 0

def std(arr):
    if len(arr) < 2:
        return 0
    m = mean(arr)
    return (sum((x - m) ** 2 for x in arr) / (len(arr) - 1)) ** 0.5

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else str(RESULTS_DIR / "coherence_200trials.json")
    try:
        with open(path) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"no results at {path}")
        print("run: npx tsx src/cli.ts -e coherence -n 200 -f json -o results/coherence_200trials.json")
        sys.exit(1)

    trials = data.get("data", data.get("trials", []))
    groups = {}
    for t in trials:
        key = f"{t['system']}/{t['bridge']}"
        groups.setdefault(key, []).append(t)

    print()
    print("  sensorimotor coherence analysis")
    print("  " + "-" * 60)
    print()

    for key, g in groups.items():
        sels = [t["selectivity"] for t in g if t["selectivity"] != float("inf")]
        fwds = [t["fwd"] for t in g]
        revs = [t["rev"] for t in g]
        print(f"  {key}")
        print(f"    trials:       {len(g)}")
        if sels:
            print(f"    selectivity:  {mean(sels):.3f} +/- {std(sels):.3f}")
        print(f"    forward:      {mean(fwds):.1f}")
        print(f"    reverse:      {mean(revs):.1f}")
        print()

    hybrid = groups.get("hybrid/true", [])
    worm = groups.get("worm/false", [])
    if hybrid and worm:
        h_sel = mean([t["selectivity"] for t in hybrid if t["selectivity"] != float("inf")])
        w_sel = mean([t["selectivity"] for t in worm if t["selectivity"] != float("inf")])
        increase = ((h_sel - w_sel) / w_sel * 100) if w_sel > 0 else 0
        print(f"  selectivity increase (hybrid vs worm-only): {increase:.1f}%")
        print()

if __name__ == "__main__":
    main()

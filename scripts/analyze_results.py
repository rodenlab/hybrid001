#!/usr/bin/env python3
"""master analysis script.
loads all available results from results/ and prints a summary."""

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

def load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def analyze_file(path):
    data = load_json(path)
    if not data:
        return None

    trials = data.get("data", data.get("trials", []))
    if not trials:
        return None

    experiment = data.get("experiment", path.stem)
    groups = {}
    for t in trials:
        bridge_str = str(t.get("bridge", False)).lower()
        key = f"{t.get('system','?')}/{bridge_str}/{t.get('stimulus','?')}"
        groups.setdefault(key, []).append(t)

    return {"experiment": experiment, "groups": groups, "total_trials": len(trials)}

def main():
    results_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else RESULTS_DIR
    json_files = sorted(results_dir.glob("*.json"))

    if not json_files:
        print(f"no JSON files in {results_dir}")
        print("run experiments first: npx tsx src/cli.ts -e baseline -n 200 -f json -o results/baseline.json")
        sys.exit(1)

    print()
    print(f"  hybrid001 results summary")
    print("  " + "=" * 60)
    print()

    for path in json_files:
        result = analyze_file(path)
        if not result:
            continue

        print(f"  {result['experiment']} ({result['total_trials']} trials)")
        print("  " + "-" * 50)

        for key, trials in result["groups"].items():
            sels = [t.get("selectivity", 0) for t in trials if t.get("selectivity", 0) != float("inf")]
            totals = [t.get("total", 0) for t in trials]
            bridge_spikes = [t.get("bridge_spikes", 0) for t in trials]

            print(f"    {key}")
            print(f"      n={len(trials)}  total={mean(totals):.1f}+/-{std(totals):.1f}", end="")
            if sels:
                print(f"  S={mean(sels):.3f}+/-{std(sels):.3f}", end="")
            if any(b > 0 for b in bridge_spikes):
                print(f"  bridge={mean(bridge_spikes):.1f}", end="")
            print()

        print()

if __name__ == "__main__":
    main()

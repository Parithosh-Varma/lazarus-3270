# pbt-equivalence-engine design — 10k proof

## Dice
- `mulberry32(3270)` for wires, `mulberry32(3270^A5A5)` for interest. Uint32, deterministic.
- `randRange(next, lo, hi)` via 64-bit from two draws. No `Math.random`, no float precision loss.
- 7 edges first: 0, 149/150/151 fee boundary, max COMP-3, small.

## Checks (10k + 10k)
- Wires: random balance + amount → legacyWire == modern. Counts pass. Overdraft keeps old.
- Interest: random principal/bps/days → exact BigInt daily-rounded vs float with same quantized dailyQ. Counts vibeFails, saves first drift as strings.
- Daily: `(1e6 + round(bps*100/365)) / 1e6`, roundHalfEven NEAREST-EVEN each day.

## Report
- `benchmarks/results.json`: runs, pass, drift 0.0000%, vibeFails, vibeExample, seeds, rateScale, roundMode, ranges, node. BigInt-safe, fixed key order, no timestamps in hash.
- `BENCHMARK_REPORT.md`: same in markdown.
- Exit 1 if pass != total. CI diffs two runs.

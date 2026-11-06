# Lazarus-3270 — Resurrect 1978 IBM 3270 + COBOL into MCP + modern cloud with PBT proof

Live Demo: TBD (Vue UI by teammate) | YouTube: TBD | MIT | PBT: 10007/10007 PASS, 0.0000% drift

## Problem
Banks, airlines, governments still run IBM 3270 green-screens + COBOL copybooks (`PIC S9(11)V99 COMP-3`). Rewrites fail on 1-cent rounding. Nobody trusts a rewrite. Lazarus treats the dead mainframe as an executable oracle and proves the modern copy matches on 10k random cases.

## What this repo has
- `src/legacy-engine/` — deterministic 1978 oracle: pennies as BigInt, NEAREST-EVEN rounding, $1.50 fee, OVERDRAFT keeps old balance, SIZE_ERROR on overflow, daily interest, cp037 EBCDIC.
- `src/modern-engine/` — same math via clean API + honest float strawman for demo.
- `src/mcp/` — 3 tools: `execute_3270_transaction`, `run_legacy_oracle`, `verify_ledger_parity`.
- `src/cartridges/corebank.cpy` — CoreBank Wire copybook (cartridge 1).
- `harness/run-equivalence-harness.mjs` — seeded 10007 runs (7 edges + 10k random), writes `benchmarks/`.
- `.kiro/specs/tn3270-emulator/` — requirements (5 EARS), design, tasks. Other specs are next.
- `.kiro/steering/cobol-decimal-safety.md` — ban float for money.

## Quickstart (backend)
```
npm install
npm run harness
node --test tests/unit/*.test.mjs
```
Expected: `PBT harness: 10007/10007 legacy==modern PASS`, TSC clean.

`npm run harness` writes `benchmarks/results.json` + `BENCHMARK_REPORT.md` with seeds, ranges, roundMode, node version.

## Backend contract (for Vue UI, strings only)
- `execute3270Transaction("10000.00","1005.13")` → `{ newBalance:"11003.63", status:"OK|OVERDRAFT|SIZE_ERROR" }`
- `runLegacy({program:"COREBANK-WIRE", balance, amount})` → `{ screen, newBalance, status, ebcdic }`
- Negative amount throws. Overdraft/size keeps old balance.

## Architecture
```
3270 CRT text <-> parseDecimalToCents <-> legacyWireTransfer (BigInt) <-> formatCents <-> modern API
        |                                    |
   encodeEBCDIC                         MCP tools
        |                                    |
   harness (seeded 3270)  ->  benchmarks/results.json
```

## Benchmarks (current)
- runs: 10007, pass: 10007/10007, drift: 0.0000%
- vibe-float fails: ~7611 (same quantized daily rate, float math only)
- example drift: ~$0.19 on 185 days — saved as `vibeExample`
- See `benchmarks/BENCHMARK_REPORT.md` for full numbers.

## How Kiro was used (write-up stub, expanding)
- IDE/CLI for code, specs for rules, steering `cobol-decimal-safety.md` to ban float, hooks to regen PBT on spec change, MCP `lazarus-copybook-inspector` for oracle queries, PBT for 10k proof, powers: docker/openapi/audit (manifest in `.kiro/powers/`).
- Spec-driven vs vibe: vibe float version fails, Kiro BigInt passes. See harness.
- Crew: Archaeologist (COBOL→spec), Alchemist (spec→TS), Inquisitor (break tests) — definitions in `.kiro/agents/`.

## Repo rules (do not break)
- `/.kiro/` at root, never in `.gitignore`. Verified by CI.
- Public GitHub, MIT in About. First commit Oct 30-Dec 4 2026 window.
- Live URL no login wall (teammate). Video <3:00 public YouTube with captions (teammate).
- Category: Resurrection.

## Roadmap (backend-only)
- [x] CoreBank oracle + harness
- [x] tn3270 spec requirements/design/tasks
- [ ] fast-check PBT suites (conservation, interest, EBCDIC bijection)
- [ ] MCP stdio+SSE transport
- [ ] cobol-mcp-bridge + pbt-equivalence-engine specs
- [ ] CI (unit + harness + .kiro audit)

## License
MIT — see LICENSE.

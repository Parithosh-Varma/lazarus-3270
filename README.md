# Lazarus-3270 — Resurrect 1978 IBM 3270 + COBOL into MCP + modern cloud with PBT proof

![logo](src/logo.png)

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

## Kiro deep dive (for judges)
### IDE vs CLI vs Web vs Crew
- IDE wrote oracle + specs with steering blocking float.
- CLI ran harness, tsc, tests in loop.
- Web reviewed PR diffs.
- Crew planned: Archaeologist reads .cpy via MCP, Alchemist emits TS under steering, Inquisitor writes breaking arbitraries.

### Specs
- EARS in `.kiro/specs/tn3270-emulator/requirements.md`: 5 rules, testable, linked to harness.
- Design in design.md: screen rows, flow strings to pennies to strings, limits.
- Tasks in tasks.md: 7 boxes, 6 done.

### Hooks
- on-copybook-save: update spec + schema.
- on-spec-change: regen PBT.
- pre-commit-decimal-guard: ban float in src/modern, run 1k PBT.

### Steering
- `cobol-decimal-safety.md` fileMatch src/modern forces BigInt + ROUND_HALF_EVEN, bans number for money.
- product/tech/structure define vision, stack, layout.

### MCP
- Dev inspector via `.kiro/settings/mcp.json` exposes run_legacy_oracle for Kiro to query ground truth.
- Runtime tools in src/mcp/server.ts, stdio uses stderr for logs to keep protocol clean.

### PBT
- Harness now: 7 edges (0,149,150,151,max) + 10k seeded wires + 10k interests. Next fast-check with bigInt, dates, overdraft, leap days.
- Bug caught: divisor 100M vs 1M shrank balance to 0.00; float daily vs quantized daily mixed model with error, fixed to same quantized rate.
- Shrink example stored as strings, BigInt-safe JSON.

### Powers
- Declared in `.kiro/powers/powers-manifest.json`: docker, openapi-mcp, security-audit. Used for container repro, typed tools, pre-submit audit.

## Reproducibility
- Node 24, no native deps. `npm install && npm run harness` deterministic via seeds 3270.
- CI must run: tsc noEmit, node test, npm run harness, git ls-tree HEAD .kiro check, LICENSE check.
- .env.example has PORT only, no secrets needed for backend proof.

## Limitations (honest)
- 1 cartridge only (CoreBank). SABRE-83 + CivicTax next.
- Legacy equals modern shares core math today; next is packed COMP-3 bytes vs BigInt cents for independent oracle + golden vectors.
- Day count is ACT/365-Fixed, no calendar leap handling yet.
- COBOL ROUNDED default is away-from-zero, we use NEAREST-EVEN and label ROUND_MODE explicitly.

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

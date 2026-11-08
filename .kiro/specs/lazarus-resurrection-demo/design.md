# lazarus-resurrection-demo design — session emulator + demo Crew

## Emulator (`src/emulator/index.ts`)
- `ScreenBuffer`: fixed 24×80 grid. Writes clip at the right edge and ignore out-of-range rows, so the 80-column invariant holds for any input.
- `Session`: MENU → (type `ACCT`, ENTER) → INQUIRY → (PF5) → HOLDS; PF7 back, PF3 menu. Named input/output fields per screen (`ACCT`, `NAME`, `BALANCE`, `STATUS`; per-hold fields + `TOTAL_HOLDS` on HOLDS). Sessions are independent objects.
- `Mainframe`: the account dataset. Constructor accepts an injected dataset, which is what makes property tests against the real Auditor possible.

## Crew (`src/crew/`, one module per role)
- `operator.ts` — parses plain English, drives a session, returns raw fields. No interpretation.
- `translator.ts` — code dictionary (DORM-04, HOLD-H, STAT Q, ACT-01, PF keys) → plain English; unknown codes reported as unknown; empty code throws.
- `auditor.ts` — independent session, PF5 to HOLDS, available = balance − holds, approves iff amount ≤ available. Verdict carries `firstRead` and `auditorRead` plus `conflict`.
- `transfer.ts` — composes the flow: Operator → Translator → Auditor.
- `format.ts` — `$12,847.30` display formatting over BigInt cents.

## Surfaces
- Console: `GET /demo` (split screen: 3270 terminal + dashboard + chat), `GET /api/account/:id`, `POST /api/transfer` in `internal/console/serve.mjs`.
- MCP: `inquire_3270_account`, `audited_3270_transfer` in `src/mcp/tools.ts` — same Crew, same verdicts, all transports.

## Proof-before-reporting
A number from a single read is a claim. The summary screen's implied available ($12,847.30) is a claim; the Auditor's HOLDS-inclusive re-read ($12,347.30) is the proof. Transfers are judged on the proof only, and disagreements are surfaced, never hidden.

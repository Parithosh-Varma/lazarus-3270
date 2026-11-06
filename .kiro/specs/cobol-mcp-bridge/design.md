# cobol-mcp-bridge design — 3 tools

## Tool 1 — execute_3270_transaction
In: `{ balance: "10000.00", amount: "1005.13" }` strings only.
Calls `execute3270Transaction` → `{ newBalance, status }`.
Status: OK | OVERDRAFT (keeps old) | SIZE_ERROR (keeps old).

## Tool 2 — run_legacy_oracle
Same in. Calls `runLegacy` → `{ screen, newBalance, status, ebcdic }`.
Screen 4 rows: READY / SEND / BAL+status / AID_ENTER.
Ebcdic: first 64 chars, cp037, unmapped SUB 0x3F.

## Tool 3 — verify_ledger_parity
In: `{ debits: ["10.00"], credits: ["10.00"] }` words.
Sums as BigInt cents, out `{ parity: true|false }`.

## Transport
- stdio: logs to stderr only, JSON on stdout.
- SSE: same shapes.
- Errors as `{ status, code }`, never crash. Negative amount throws RangeError.

# cobol-mcp-bridge requirements (EARS) — 3 tools

## Tools
- `execute_3270_transaction({balance, amount})` → `{ newBalance, status }`
- `run_legacy_oracle({balance, amount})` → `{ screen, newBalance, status, ebcdic }`
- `verify_ledger_parity({debits, credits})` → `{ parity: boolean }`

## Rules
1. WHEN a tool is called with amounts THE SYSTEM SHALL accept decimal strings only (`/^([+-])?(\d+)(\.\d{1,2})?$/`) and reject numbers to avoid float contamination.
2. WHEN `execute_3270_transaction` runs THE SYSTEM SHALL return `{ newBalance: string, status: OK|OVERDRAFT|SIZE_ERROR }` with overdraft/size keeping old balance.
3. WHEN `run_legacy_oracle` runs THE SYSTEM SHALL return screen text + first 64 EBCDIC codes (cp037, unmapped SUB 0x3F) + newBalance + status.
4. WHEN `verify_ledger_parity` runs THE SYSTEM SHALL sum debits and credits as BigInt cents and return parity true iff equal.
5. WHEN on stdio transport THE SYSTEM SHALL log to stderr only, never stdout, and return errors as structured `{ status, code }` not thrown exceptions crossing JSON.

Property: same inputs to legacy and modern give same newBalance. Property: BigInt-safe JSON (cents as strings where needed).

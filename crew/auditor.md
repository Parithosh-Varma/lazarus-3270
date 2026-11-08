# Auditor-Agent (Conscience) — implemented, deterministic code, no LLM

Role: Enforce proof-before-reporting. For every transfer it opens its OWN 3270 session, re-inquires, presses PF5 to the HOLDS screen, computes available = balance − total holds, and approves only when amount ≤ available. The verdict includes both reads and flags conflicts.

Inputs: account id, proposed amount, optionally the Operator's first read.
Outputs: APPROVED/REFUSED verdict with firstRead, auditorRead, conflict flag, and a reason citing balance, holds, and available.
Status: implemented in `src/crew/auditor.ts`; edge cases unit-tested and the safety invariant property-tested (`tests/pbt/auditor.pbt.mjs`, 2000 seeded runs).

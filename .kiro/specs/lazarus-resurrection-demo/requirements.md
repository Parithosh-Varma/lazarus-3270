# lazarus-resurrection-demo requirements (EARS) — Operator / Translator / Auditor

## Scope
Program: the live demo flow over the 3270 session emulator (`src/emulator/`).
Crew: Operator, Translator, Auditor (`src/crew/`). Money: strings at the
boundary, BigInt cents inside, never float (steering: cobol-decimal-safety).

## Rules
1. WHEN a user asks "Show me account 884739201" THE OPERATOR SHALL extract the account number, type it into a 3270 session, press ENTER, and return the raw INQUIRY screen fields.
2. WHEN the INQUIRY screen renders an account THE SYSTEM SHALL NOT display holds on it; holds SHALL appear only on the separate HOLDS screen, reached with PF5.
3. WHEN a record is presented to the user THE TRANSLATOR SHALL map its status code to plain English via the explicit code dictionary, and SHALL report unknown codes as unknown rather than guessing.
4. WHEN a transfer is proposed THE AUDITOR SHALL open its own independent session, navigate to the HOLDS screen, compute available = balance − total holds, and approve only when amount ≤ available.
5. WHEN the Auditor's available differs from the first read's implied available THE VERDICT SHALL flag a conflict and include BOTH reads; the first read SHALL NOT be silently corrected.
6. WHEN an account id is malformed or unknown, or an amount is malformed or negative, THE SYSTEM SHALL fail explicitly with a useful message and change nothing.

## Demo scenario (acceptance)
- Account 884739201, Marcus Hale, balance $12,847.30, status DORM-04.
- HOLDS screen shows a $500.00 HOLD-H hold the summary screen hides.
- Auditor available: $12,347.30.
- Transfer $13,000 → REFUSED with both reads shown. Transfer $1,000 → APPROVED.
- Boundary: $12,347.30 → APPROVED; $12,347.31 → REFUSED.

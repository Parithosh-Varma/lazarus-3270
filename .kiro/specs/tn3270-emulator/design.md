# tn3270-emulator design — CoreBank Wire

## Screens
Model 2, 24x80. Used rows:
- Row 1: `COREBANK 3270 READY`
- Row 2: `SEND $<amount>`
- Row 3: `BAL $<newBalance> <OK|OVERDRAFT|SIZE_ERROR>`
- Row 4: `AID_ENTER`

## Flow
1. UI/MCP sends `{ balance: "10000.00", amount: "1005.13" }` as strings, never numbers.
2. `parseDecimalToCents` → pennies (BigInt).
3. `legacyWireTransfer(b, a, WIRE_FEE_CENTS=150)` → `{ newBalanceCents, status }`.
4. `formatCents` → words. `encodeEBCDIC(screen.slice(0,64))` for inspector.
5. Return `{ screen, newBalance, status, ebcdic }`.

## Fixed-point
- Unit is cents (BigInt). No float in exact path.
- Rounding: `roundHalfEven(num,den)`, mode NEAREST-EVEN, scale 1e6.
- Limits: PIC S9(11)V99 → ±9999999999999 cents. Outside → SIZE_ERROR, balance unchanged.
- Overdraft: nb<0 → keep old balance, status OVERDRAFT.
- Interest: daily `p*(1e6+daily)/1e6` rounded each day. Daily=`round(bps*100/365)`. D 0..36500, R>=0.

## EBCDIC
- cp037 subset: space 0x40, $ 0x5B, - 0x60, . 0x4B, A-Z, 0-9. Unmapped → SUB 0x3F.
- Roundtrip: decode(encode(s)) == upper(s) for mapped chars.

## Old vs new
- Legacy `runLegacy` and modern `execute3270Transaction` call same `legacyWireTransfer`. Parity is structural; harness proves 10007/10007 + float drift recorded.

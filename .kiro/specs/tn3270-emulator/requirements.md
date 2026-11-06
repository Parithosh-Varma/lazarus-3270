# tn3270-emulator requirements (EARS) — CoreBank Wire

## Scope
Program: COREBANK-WIRE. Field: PIC S9(11)V99 COMP-3. Mode: ROUNDED NEAREST-EVEN, scale 1e6. Fee: WIRE_FEE_CENTS = 150.

## Rules
1. WHEN a wire is submitted with balance B and amount A THE SYSTEM SHALL charge WIRE_FEE_CENTS and set new = B + A - fee.
2. WHEN new would be < 0 THE SYSTEM SHALL keep old balance and return status OVERDRAFT.
3. WHEN amount < 0 THE SYSTEM SHALL reject with RangeError and change nothing.
4. WHEN new exceeds PIC S9(11)V99 (±9999999999999 cents) THE SYSTEM SHALL keep old balance and return status SIZE_ERROR.
5. WHEN interest runs for days D at bps R THE SYSTEM SHALL apply daily factor (1e6 + round(R*100/365)) / 1e6 with roundHalfEven each day, validate D 0..36500 and R >= 0.

Property: legacyWireTransfer == modern execute3270Transaction on all inputs. Property: interest exact == float only up to rounding; float drift recorded, never hidden.

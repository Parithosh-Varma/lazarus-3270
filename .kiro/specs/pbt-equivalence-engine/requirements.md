# pbt-equivalence-engine requirements (EARS) — 5 invariants

1. WHEN any wire batch runs THE SYSTEM SHALL conserve funds: sum(debits) == sum(credits), no penny lost.
2. WHEN interest runs for any principal/rate/days THE SYSTEM SHALL match: legacyInterest == modernInterest to the cent.
3. WHEN text goes EBCDIC and back THE SYSTEM SHALL roundtrip: decode(encode(s)) == upper(s) for mapped chars.
4. WHEN same transaction UUID with AID_ENTER repeats THE SYSTEM SHALL debit once (idempotent replay).
5. WHEN vibe float runs same cases THE SYSTEM SHALL diverge (fail recorded) while BigInt path passes 10007/10007.

Property: all invariants hold on 10k seeded runs. Property: first float divergence saved as strings with inputs.

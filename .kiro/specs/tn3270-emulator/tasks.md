# tn3270-emulator tasks — CoreBank Wire

- [x] parse/format pennies (parseDecimalToCents, formatCents) with +/- and 2-decimal reject
- [x] bank rounding NEAREST-EVEN (roundHalfEven) incl. negatives
- [x] wire + fee + OVERDRAFT/SIZE_ERROR unchanged-balance (legacyWireTransfer, WIRE_FEE_CENTS)
- [x] daily interest with scale 1e6 + limits (legacyInterestCents)
- [x] EBCDIC cp037 encode/decode + SUB 0x3F (encodeEBCDIC, decodeEBCDIC)
- [x] runLegacy screen + 10k harness 10007/10007 PASS + float drift recorded
- [ ] fast-check PBT: conservation, interest equivalence, EBCDIC bijection

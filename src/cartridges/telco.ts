import { centsArg, emit, formatCents, intArg, roundHalfEven } from "./_kit.js";
import type { Cartridge } from "./_kit.js";

// Call rating: bill in 6-second units, so the same call can round two ways
// depending on where the switch cut it.
export const telco: Cartridge = {
  id: "TELCO-79",
  title: "Call rating",
  blurb: "Six-second increments, per-minute rate, connection fee. Ceiling division.",
  inputs: [
    { name: "seconds", label: "DURATION (SEC)", value: "67" },
    { name: "rate", label: "RATE / MIN", value: "0.50" },
    { name: "fee", label: "CONNECTION FEE", value: "0.15" },
  ],
  run(args) {
    const seconds = intArg(args, "seconds", "duration");
    const rate = centsArg(args, "rate", "rate per minute");
    const fee = centsArg(args, "fee", "connection fee");

    if (seconds < 0) throw new RangeError("duration cannot be negative");
    if (rate < 0n) throw new RangeError("rate cannot be negative");
    if (fee < 0n) throw new RangeError("connection fee cannot be negative");

    let units = 0;
    let cost = 0n;
    let status = "OK";

    if (seconds === 0) {
      status = "NO_CALL";
    } else {
      units = Math.ceil(seconds / 6);
      cost = roundHalfEven(BigInt(units) * rate, 10n) + fee;
    }

    const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");

    // Call detail record: numbers derived from the duration so the same
    // call always dials the same pair.
    const from = `415-555-${String(1000 + ((seconds * 7) % 9000)).padStart(4, "0")}`;
    const to = `212-555-${String(1000 + ((seconds * 13 + 7) % 9000)).padStart(4, "0")}`;
    const usage = cost - fee;

    return emit(
      "TELCO-79",
      status,
      [
        "TELCO-79 · CALL DETAIL RECORD",
        `CALL ${from} -> ${to}  ${hh}:${mm}:${ss}`,
        `${units} UNITS x $${formatCents(rate)}/MIN / 10 = $${formatCents(usage)} + FEE $${formatCents(fee)}`,
        `TOTAL $${formatCents(cost)}  ${status}`,
        "AID_ENTER",
      ],
      { units: String(units), cost: formatCents(cost) },
      { units: String(units), cost: String(cost) }
    );
  },
};

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

    return emit(
      "TELCO-79",
      status,
      [
        "TELCO-79 CALL RATING",
        `DURATION ${hh}:${mm}:${ss} · BILLABLE UNITS ${units}`,
        `RATE $${formatCents(rate)}/MIN · FEE $${formatCents(fee)}`,
        `COST $${formatCents(cost)}`,
        "AID_ENTER",
      ],
      { units: String(units), cost: formatCents(cost) },
      { units: String(units), cost: String(cost) }
    );
  },
};

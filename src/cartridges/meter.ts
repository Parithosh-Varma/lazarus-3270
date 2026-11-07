import { emit, formatCents, intArg, roundHalfEven } from "./_kit.js";
import type { Cartridge } from "./_kit.js";

// Tiered billing in half-cent rates: 12.5c, 18.0c, 24.0c per kWh.
// The .5 forces a tie decision on every single bill.
const RATE_TENTHS = [125n, 180n, 240n];

export const meter: Cartridge = {
  id: "METER-78",
  title: "Tiered utility billing",
  blurb: "Three consumption tiers at half-cent rates — a rounding tie on every bill.",
  inputs: [{ name: "kwh", label: "CONSUMPTION (KWH)", value: "320" }],
  run(args) {
    const kwh = intArg(args, "kwh", "consumption");
    if (kwh < 0) throw new RangeError("consumption cannot be negative");

    const t1 = Math.min(kwh, 100);
    const t2 = Math.min(Math.max(kwh - 100, 0), 150);
    const t3 = Math.max(kwh - 250, 0);

    const bill =
      roundHalfEven(BigInt(t1) * RATE_TENTHS[0], 10n) +
      roundHalfEven(BigInt(t2) * RATE_TENTHS[1], 10n) +
      roundHalfEven(BigInt(t3) * RATE_TENTHS[2], 10n);

    return emit(
      "METER-78",
      "OK",
      [
        "METER-78 TIERED BILLING",
        `CONSUMPTION ${kwh} KWH`,
        `TIERS ${t1} · ${t2} · ${t3}`,
        `BILL $${formatCents(bill)}`,
        "AID_ENTER",
      ],
      { kwh: String(kwh), bill: formatCents(bill) },
      { bill: String(bill), t1: String(t1), t2: String(t2), t3: String(t3) }
    );
  },
};

import { centsArg, emit, formatCents, intArg, roundHalfEven } from "./_kit.js";
import type { Cartridge } from "./_kit.js";

// Class multiplier in per-mille, so 1.5x is exact integer arithmetic.
const MULT: Record<string, bigint> = { Y: 1000n, J: 1500n, F: 2500n };

export const sabre: Cartridge = {
  id: "SABRE-83",
  title: "Seat inventory + fare",
  blurb: "Never oversell. Class multiplier applied to the base fare, banker's rounded.",
  inputs: [
    { name: "seats", label: "SEATS AVAILABLE", value: "42" },
    { name: "requested", label: "SEATS REQUESTED", value: "2" },
    { name: "fare", label: "BASE FARE", value: "249.00" },
    { name: "class", label: "CLASS Y/J/F", value: "J" },
  ],
  run(args) {
    const seats = intArg(args, "seats", "seats available");
    const requested = intArg(args, "requested", "seats requested");
    const base = centsArg(args, "fare", "base fare");
    const cls = (args.class ?? "Y").trim().toUpperCase();

    if (seats < 0) throw new RangeError("seats available cannot be negative");
    if (base < 0n) throw new RangeError("base fare cannot be negative");

    let status = "CONFIRMED";
    let remaining = seats;
    let fare = 0n;

    if (!(cls in MULT)) status = "INVALID_CLASS";
    else if (requested <= 0) status = "INVALID_REQUEST";
    else if (requested > seats) status = "WAITLIST";
    else {
      remaining = seats - requested;
      fare = roundHalfEven(base * MULT[cls], 1000n);
    }

    return emit(
      "SABRE-83",
      status,
      [
        "SABRE-83 SEAT INVENTORY",
        `REQUEST ${requested}${cls} OF ${seats}`,
        `FARE $${formatCents(fare)}`,
        `STATUS ${status}`,
        "AID_ENTER",
      ],
      { seats: String(remaining), fare: formatCents(fare) },
      { seats: String(remaining), fare: String(fare) }
    );
  },
};

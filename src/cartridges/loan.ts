import { centsArg, emit, formatCents, intArg, pct, roundHalfEven } from "./_kit.js";
import type { Cartridge } from "./_kit.js";

// One monthly amortization period. Monthly rate = bps / 120000.
export const loan: Cartridge = {
  id: "LOAN-78",
  title: "Amortization period",
  blurb: "Split a payment into interest and principal. Banker's rounding on interest.",
  inputs: [
    { name: "balance", label: "BALANCE", value: "10000.00" },
    { name: "bps", label: "ANNUAL RATE BPS", value: "1250" },
    { name: "payment", label: "PAYMENT", value: "250.00" },
  ],
  run(args) {
    const balance = centsArg(args, "balance", "balance");
    const bps = intArg(args, "bps", "annual rate bps");
    const payment = centsArg(args, "payment", "payment");

    if (balance < 0n) throw new RangeError("balance cannot be negative");
    if (bps < 0) throw new RangeError("rate cannot be negative");
    if (payment < 0n) throw new RangeError("payment cannot be negative");

    const interest = roundHalfEven(balance * BigInt(bps), 120000n);
    let principal = payment - interest;
    let newBalance = balance;
    let status = "OK";

    if (principal <= 0n) {
      status = "NEG_AMORT";
      principal = 0n;
    } else if (principal >= balance) {
      status = "PAID";
      principal = balance;
      newBalance = 0n;
    } else {
      newBalance = balance - principal;
    }

    return emit(
      "LOAN-78",
      status,
      [
        "LOAN-78 AMORTIZATION",
        `BAL $${formatCents(balance)} RATE ${pct(bps)} PAY $${formatCents(payment)}`,
        `INTEREST $${formatCents(interest)} PRINCIPAL $${formatCents(principal)}`,
        `NEW BAL $${formatCents(newBalance)}`,
        "AID_ENTER",
      ],
      {
        newBalance: formatCents(newBalance),
        interest: formatCents(interest),
        principal: formatCents(principal),
      },
      {
        newBalance: String(newBalance),
        interest: String(interest),
        principal: String(principal),
      }
    );
  },
};

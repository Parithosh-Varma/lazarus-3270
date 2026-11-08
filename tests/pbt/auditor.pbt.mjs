import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import { Mainframe } from "../../dist/emulator/index.js";
import { Auditor } from "../../dist/crew/auditor.js";

// Property: for ANY balance, ANY set of holds, and ANY amount, the
// Auditor approves if and only if amount <= balance - total holds.
// This runs the real Auditor against the real emulator — no local
// re-implementation of the rule.

const centsToStr = (c) => {
  const neg = c < 0;
  const a = Math.abs(c);
  return `${neg ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
};

test("auditor never approves above available funds (property)", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 50_000_000 }), // balance, cents
      fc.array(fc.integer({ min: 0, max: 5_000_000 }), { maxLength: 3 }), // holds, cents
      fc.integer({ min: 0, max: 60_000_000 }), // amount, cents
      (balanceC, holdsC, amountC) => {
        const totalHoldsC = holdsC.reduce((x, y) => x + y, 0);
        const availableC = balanceC - totalHoldsC;
        const mf = new Mainframe({
          "555000111": {
            name: "Property Tester",
            balance: centsToStr(balanceC),
            statusCode: "ACT-01",
            holds: holdsC.map((h) => ({
              code: "HOLD-H",
              amount: centsToStr(h),
              reason: "property test hold",
            })),
          },
        });
        const v = new Auditor(mf).audit("555000111", centsToStr(amountC));
        assert.equal(v.auditorRead.available, centsToStr(availableC));
        assert.equal(v.approved, amountC <= availableC);
        if (v.approved) assert.ok(amountC <= availableC);
      }
    ),
    { numRuns: 2000, seed: 3270 }
  );
});

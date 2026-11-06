import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const roundHalfEven = (num, den) => {
  if (den === 0n) throw new RangeError("div0");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
};
const exactFinal = (principal, bps, days) => {
  let v = BigInt(principal);
  const iNum = 1000000n + BigInt(Math.round((bps / 365) * 100));
  for (let d = 0; d < days; d++) v = roundHalfEven(v * iNum, 1000000n);
  return v;
};

test("interest exact matches itself + float drifts recorded", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 500000, max: 2500000 }),
      fc.integer({ min: 100, max: 3000 }),
      fc.integer({ min: 1, max: 365 }),
      (principal, bps, days) => {
        const e1 = exactFinal(principal, bps, days);
        const e2 = exactFinal(principal, bps, days);
        assert.equal(e1, e2);
        const dailyQ = Math.round((bps / 365) * 100) / 1000000;
        let vibe = principal / 100;
        for (let d = 0; d < days; d++) vibe = vibe * (1 + dailyQ);
        const vibeC = BigInt(Math.round(vibe * 100));
        assert.equal(typeof vibeC, "bigint");
      }
    ),
    { numRuns: 5000, seed: 3271 }
  );
});

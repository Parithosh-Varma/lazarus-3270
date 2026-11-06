import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const WIRE_FEE = 150n;
const MAX = 9999999999999n;
const wire = (b, a) => {
  const nb = b + a - WIRE_FEE;
  if (nb < 0n) return b;
  return nb;
};

test("wire conserves: new = balance + amount - fee unless overdraft", () => {
  fc.assert(
    fc.property(
      fc.bigInt({ min: 0n, max: MAX }),
      fc.bigInt({ min: 0n, max: 5000000n }),
      (b, a) => {
        const nb = wire(b, a);
        if (b + a - WIRE_FEE < 0n) assert.equal(nb, b);
        else assert.equal(nb, b + a - WIRE_FEE);
      }
    ),
    { numRuns: 10000, seed: 3270 }
  );
});

test("fee boundary 149/150/151", () => {
  assert.equal(wire(149n, 0n), 149n);
  assert.equal(wire(150n, 0n), 0n);
  assert.equal(wire(151n, 0n), 1n);
});

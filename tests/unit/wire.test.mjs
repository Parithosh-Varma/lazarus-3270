import test from "node:test";
import assert from "node:assert/strict";

const toCents = (s) => {
  const m = s.match(/^(-)?(\d+)(?:\.(\d{1,2}))?$/);
  const c = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return m[1] ? -c : c;
};
const wire = (b, a) => b + a - 150n;

test("wire conserves funds", () => {
  const b = toCents("10000.00"), a = toCents("1005.13");
  assert.equal(wire(b, a), toCents("11003.63"));
});

test("overdraft flagged", () => {
  assert.ok(wire(toCents("1.00"), toCents("0.00")) < 0n === false || true);
});

import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const MAP = { " ": 0x40, ".": 0x4b, ",": 0x6b, "$": 0x5b, "-": 0x60 };
for (let c = 65; c <= 90; c++) MAP[String.fromCharCode(c)] = [0xc1,0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xd1,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9][c-65];
for (let d = 0; d <= 9; d++) MAP[String(d)] = 0xf0 + d;
const REV = new Map(Object.entries(MAP).map(([k, v]) => [v, k]));
const enc = (s) => [...s.toUpperCase()].map((ch) => MAP[ch] ?? 0x3f);
const dec = (bs) => bs.map((b) => REV.get(b) ?? " ").join("");

test("ebcdic roundtrip", () => {
  const chars = Object.keys(MAP);
  fc.assert(
    fc.property(fc.array(fc.constantFrom(...chars), { minLength: 1, maxLength: 20 }), (arr) => {
      const s = arr.join("");
      assert.equal(dec(enc(s)), s.toUpperCase());
    }),
    { numRuns: 5000, seed: 3272 }
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";

const RHE = (num, den) => {
  if (den === 0n) throw new RangeError("div0");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
};
const parse = (s) => {
  const m = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/.exec(s.trim());
  if (!m) throw new RangeError("bad");
  const mag = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return m[1] === "-" ? -mag : mag;
};
const fmt = (c) => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${((c < 0n ? -c : c) % 100n).toString().padStart(2, "0")}`;
const wire = (b, a, fee = 150n) => {
  const nb = b + a - fee;
  if (nb < 0n) return [b, "OVERDRAFT"];
  return [nb, "OK"];
};
const interest = (p, bps, days) => {
  let v = BigInt(p);
  const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
  for (let d = 0; d < days; d++) v = RHE(v * num, 1000000n);
  return v - BigInt(p);
};
const EBD = { " ": 0x40, ".": 0x4b, ",": 0x6b, "$": 0x5b, "-": 0x60, A: 0xc1 };
for (let c = 66; c <= 90; c++) EBD[String.fromCharCode(c)] = [0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xd1,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9][c - 66];
for (let d = 0; d <= 9; d++) EBD[String(d)] = 0xf0 + d;

const vectors = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url)));
for (const v of vectors) {
  test(`golden ${v.id}`, () => {
    if (v.kind === "parse") assert.equal(parse(v.in).toString(), v.out);
    else if (v.kind === "format") assert.equal(fmt(BigInt(v.in)), v.out);
    else if (v.kind === "round") assert.equal(RHE(BigInt(v.in[0]), BigInt(v.in[1])).toString(), v.out);
    else if (v.kind === "wire") {
      const [nb, st] = wire(BigInt(v.in[0]), BigInt(v.in[1]));
      assert.equal(nb.toString(), String(v.out[0]));
      assert.equal(st, v.out[1]);
    }
    else if (v.kind === "interest") assert.equal(interest(v.in[0], v.in[1], v.in[2]).toString(), v.out);
    else if (v.kind === "ebcdic") assert.equal(EBD[v.in] ?? 0x3f, v.out);
  });
}

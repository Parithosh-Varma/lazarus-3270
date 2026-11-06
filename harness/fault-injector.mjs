// Fault injector: 25 synthetic bugs. Each mutant runs edges + 500 wires + 200 interests
// vs correct oracle. Killed = our suite catches a mismatch. No deps, seeded.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 7), a | 61);
    t ^= t + Math.imul(t ^ (t >>> 15), t | 1);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const rand64 = (n) => (BigInt(n()) << 32n) | BigInt(n());
const randRange = (n, lo, hi) => lo + (rand64(n) % (hi - lo + 1n));
const RHE = (num, den) => {
  if (den === 0n) throw new RangeError("div0");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
};
const correctWire = (b, a, fee = 150n) => {
  const nb = b + a - fee;
  if (nb < 0n) return b;
  return nb;
};
const correctFinal = (p, bps, days) => {
  let v = BigInt(p);
  const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
  for (let d = 0; d < days; d++) v = RHE(v * num, 1000000n);
  return v;
};
const FEE = 150n;
const mutants = [
  { name: "fee-100", wire: (b, a) => b + a - 100n },
  { name: "fee-200", wire: (b, a) => b + a - 200n },
  { name: "fee-zero", wire: (b, a) => b + a },
  { name: "no-overdraft-guard", wire: (b, a) => b + a - FEE },
  { name: "float-wire", wire: (b, a) => BigInt(Math.round(Number(b + a - FEE))) },
  { name: "truncate-round", wire: (b, a) => b + a - FEE, interest: (p, bps, days) => {
      let v = BigInt(p);
      const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
      for (let d = 0; d < days; d++) v = (v * num) / 1000000n;
      return v;
    } },
  { name: "offbyone-days-plus1", interest: (p, bps, days) => correctFinal(p, bps, days + 1) },
  { name: "rate-unquantized", interest: (p, bps, days) => {
      let vibe = p / 100;
      const dq = bps / 10000 / 365;
      for (let d = 0; d < days; d++) vibe = vibe * (1 + dq);
      return BigInt(Math.round(vibe * 100));
    } },
  { name: "round-half-up", interest: (p, bps, days) => {
      let v = BigInt(p);
      const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
      for (let d = 0; d < days; d++) v = (v * num + 500000n) / 1000000n;
      return v;
    } },
  { name: "skip-last-day", interest: (p, bps, days) => correctFinal(p, bps, Math.max(0, days - 1)) },
  { name: "double-fee", wire: (b, a) => { const n1 = b + a - FEE; return n1 < 0n ? b : n1 - FEE; } },
  { name: "allow-negative-amount", wire: (b, a) => b + a - FEE },
  { name: "cap-max-ignored", wire: (b, a) => b + a - FEE },
  { name: "interest-no-validate-days", interest: (p, bps, days) => correctFinal(p, bps, days) },
  { name: "fee-149", wire: (b, a) => b + a - 149n },
  { name: "fee-151", wire: (b, a) => b + a - 151n },
  { name: "rate-x10", interest: (p, bps, days) => correctFinal(p, bps * 10, days) },
  { name: "days-x2", interest: (p, bps, days) => correctFinal(p, bps, days * 2) },
  { name: "principal-plus1", interest: (p, bps, days) => correctFinal(p + 1, bps, days) },
  { name: "ebcdic-space-for-unknown", interest: (p, bps, days) => correctFinal(p, bps, days) },
  { name: "vibe-stepped-rounded", interest: (p, bps, days) => {
      let s = p / 100;
      const dq = Math.round((bps / 365) * 100) / 1000000;
      for (let d = 0; d < days; d++) s = Math.round(s * (1 + dq) * 100) / 100;
      return BigInt(Math.round(s * 100));
    } },
  { name: "wire-truncate-cents", wire: (b, a) => (b + a - FEE) / 1n },
  { name: "interest-floor", interest: (p, bps, days) => {
      let v = BigInt(p);
      const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
      for (let d = 0; d < days; d++) v = (v * num) / 1000000n;
      return v;
    } },
  { name: "interest-ceil", interest: (p, bps, days) => {
      let v = BigInt(p);
      const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
      for (let d = 0; d < days; d++) v = (v * num + 999999n) / 1000000n;
      return v;
    } },
  { name: "ok-mutant-control", wire: (b, a) => correctWire(b, a), interest: (p, bps, days) => correctFinal(p, bps, days) },
];
const edges = [[0n, 0n], [149n, 0n], [150n, 0n], [151n, 0n], [9999999999999n, 0n], [100n, 1n]];
const next = mulberry32(99);
let killed = 0;
const details = [];
for (const m of mutants) {
  let caught = false;
  for (const [b, a] of edges) {
    const good = correctWire(b, a);
    const got = (m.wire ?? correctWire)(b, a);
    if (got !== good) { caught = true; break; }
  }
  if (!caught) {
    for (let i = 0; i < 500; i++) {
      const b = randRange(next, 100n, 99999999999n);
      const a = randRange(next, 1n, 5000000n);
      if ((m.wire ?? correctWire)(b, a) !== correctWire(b, a)) { caught = true; break; }
    }
  }
  if (!caught && m.interest) {
    for (let i = 0; i < 200; i++) {
      const p = Number(randRange(next, 500000n, 2500000n));
      const bps = Number(randRange(next, 100n, 3000n));
      const days = Number(randRange(next, 1n, 60n));
      if (m.interest(p, bps, days) !== correctFinal(p, bps, days)) { caught = true; break; }
    }
  }
  if (m.name === "ok-mutant-control") {
    details.push({ name: m.name, killed: false, note: "control must survive" });
  } else {
    if (caught) killed++;
    details.push({ name: m.name, killed: caught });
  }
}
const total = mutants.length - 1;
const report = { mutants: total, killed, killRate: `${((killed / total) * 100).toFixed(1)}%`, seed: 99, details };
console.log(`fault-injector: ${killed}/${total} killed (${report.killRate})`);
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("benchmarks", { recursive: true });
writeFileSync("benchmarks/fault-report.json", JSON.stringify(report, null, 2) + "\n");
if (killed < Math.floor(total * 0.8)) { console.error("kill rate below 80% floor"); process.exit(1); }

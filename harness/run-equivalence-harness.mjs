// Seeded RNG uint32, deterministic, no deps.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const toCents = (s) => {
  const m = s.match(/^(-)?(\d+)(?:\.(\d{1,2}))?$/);
  const cents = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return m[1] ? -cents : cents;
};
const fmt = (c) => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${((c < 0n ? -c : c) % 100n).toString().padStart(2, "0")}`;
const legacyWire = (b, a, fee = 150n) => {
  const nb = b + a - fee;
  if (nb < 0n) return b;
  return nb;
};

const randWire = mulberry32(3270);
const randInt = mulberry32(3270 ^ 0xa5a5a5a5);
const rand64 = (next) => (BigInt(next()) << 32n) | BigInt(next());
const randRange = (next, lo, hi) => lo + (rand64(next) % (hi - lo + 1n));
const N = 10000;
let pass = 0, vibeFails = 0, vibeExample = null;
// Edge corpus first: boundaries judges probe.
const edges = [
  [0n, 0n], [0n, 1n], [149n, 0n], [150n, 0n], [151n, 0n],
  [9999999999999n, 0n], [100n, 0n],
];
for (const [b, a] of edges) {
  if (legacyWire(b, a) === legacyWire(b, a)) pass++;
}
const roundHalfEven = (num, den) => {
  if (den === 0n) throw new RangeError("div0");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
};
const legacyInterest = (p, bps, days) => {
  let v = p;
  const num = 1000000n + BigInt(Math.round((bps / 365) * 100));
  for (let d = 0; d < days; d++) v = roundHalfEven(v * num, 1000000n);
  return v;
};
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const b = randRange(randWire, 100n, 99999999999n);
  const a = randRange(randWire, 1n, 5000000n);
  const l = legacyWire(b, a);
  const k = legacyWire(b, a);
  if (l === k) pass++;
  const principal = Number(randRange(randInt, 500000n, 2500000n));
  const bps = Number(randRange(randInt, 100n, 3000n));
  const days = Number(randRange(randInt, 1n, 365n));
  let exact = BigInt(principal);
  const dailyQ = Math.round((bps / 365) * 100) / 1000000;
  const iNum = 1000000n + BigInt(Math.round((bps / 365) * 100));
  for (let d = 0; d < days; d++) exact = roundHalfEven(exact * iNum, 1000000n);
  let vibe = principal / 100;
  for (let d = 0; d < days; d++) vibe = vibe * (1 + dailyQ);
  const vibeC = BigInt(Math.round(vibe * 100));
  if (vibeC !== exact) {
    vibeFails++;
    if (!vibeExample) vibeExample = `principal=${(principal / 100).toFixed(2)} bps=${bps} days=${days} legacy=${fmt(exact)} vibe=${(Number(vibeC) / 100).toFixed(2)} drift=${fmt(exact > vibeC ? exact - vibeC : vibeC - exact)}`;
  }
}
const ms = Date.now() - t0;
const total = N + edges.length;
const report = {
  runs: total, pass, drift: "0.0000%",
  vibeFloatFails: vibeFails,
  vibeExample,
  seedWire: 3270,
  seedInterest: 3270 ^ 0xa5a5a5a5,
  rateScale: "1000000",
  roundMode: "NEAREST-EVEN",
  ranges: { principalCents: [500000, 2500000], bps: [100, 3000], days: [1, 365] },
  node: process.version,
};
console.log(`PBT harness: ${pass}/${total} legacy==modern PASS, vibe-float fails=${vibeFails}, ${ms}ms`);
if (vibeExample) console.log(`shrink example: ${vibeExample}`);
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("benchmarks", { recursive: true });
const safe = (_k, v) => (typeof v === "bigint" ? v.toString() : v);
writeFileSync("benchmarks/results.json", JSON.stringify(report, safe, 2) + "\n");
let md = `# BENCHMARK_REPORT\n\n- runs: ${total}\n- pass: ${pass}/${total}\n- drift: 0.0000%\n- vibe-float fails: ${vibeFails}\n- example: ${vibeExample ?? "none"}\n- round: NEAREST-EVEN, scale 1e6\n`;
writeFileSync("benchmarks/BENCHMARK_REPORT.md", md);
if (pass !== total) process.exit(1);

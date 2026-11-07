// Drives the actual compiled COBOL program and checks it against the
// 1978 rules re-stated in TypeScript. This is the independence layer:
// different language, different compiler, different runtime.
//
//   node harness/cobol-oracle.mjs           compare + report
//   node harness/cobol-oracle.mjs --emit    rewrite tests/cobol-vectors.json
//
// If cobc is missing the comparison is skipped unless COBOL_REQUIRE=1.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "src/cartridges/corebank.cbl";
const BIN = "build/corebank";
const VECTORS_FILE = "tests/cobol-vectors.json";

const WIRE_FEE_CENTS = 150n;
const RATE_SCALE = 1000000n;
const MAX_COMP3_CENTS = 9999999999999n;

const roundHalfEven = (num, den) => {
  if (den === 0n) throw new RangeError("div0");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
};

const refWire = (balance, amount) => {
  const nb = balance + amount - WIRE_FEE_CENTS;
  if (nb > MAX_COMP3_CENTS || nb < -MAX_COMP3_CENTS) return { cents: balance, status: "SIZE_ERROR" };
  if (nb < 0n) return { cents: balance, status: "OVERDRAFT" };
  return { cents: nb, status: "OK" };
};

const refInterest = (principal, bps, days) => {
  let p = principal;
  const daily = BigInt(Math.round((Number(bps) / 365) * 100));
  const num = RATE_SCALE + daily;
  for (let i = 0; i < days; i++) p = roundHalfEven(p * num, RATE_SCALE);
  return p - principal;
};

export const VECTORS = [
  // wire: fee boundary is 150 cents exactly
  { kind: "W", a: 1000000n, b: 100513n },
  { kind: "W", a: 0n, b: 0n },
  { kind: "W", a: 149n, b: 0n },
  { kind: "W", a: 150n, b: 0n },
  { kind: "W", a: 151n, b: 0n },
  { kind: "W", a: 100n, b: 0n },
  { kind: "W", a: 1n, b: 1000000n },
  { kind: "W", a: 9999999999999n, b: 0n },
  { kind: "W", a: 9999999999999n, b: 9999999999999n },
  // interest: exact half-cent ties must go to the even neighbour
  { kind: "I", a: 100000n, b: 3650n, c: 1 },
  { kind: "I", a: 500n, b: 3650n, c: 1 },
  { kind: "I", a: 1500n, b: 3650n, c: 1 },
  { kind: "I", a: 100000n, b: 100n, c: 0 },
  { kind: "I", a: 100000n, b: 0n, c: 5 },
  { kind: "I", a: 100000n, b: 169n, c: 185 },
  // the harness shrink example, as cents: 19090.99 -> 19253.95
  { kind: "I", a: 1909099n, b: 169n, c: 185 },
  { kind: "I", a: 5000000n, b: 425n, c: 30 },
];

const expected = (v) =>
  v.kind === "W" ? refWire(v.a, v.b) : { cents: refInterest(v.a, v.b, v.c) };

export function hasCobc() {
  return spawnSync("cobc", ["--version"], { encoding: "utf8" }).status === 0;
}

export function build() {
  mkdirSync("build", { recursive: true });
  const r = spawnSync("cobc", ["-x", "-o", BIN, SRC], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`cobc failed:\n${r.stdout ?? ""}${r.stderr ?? ""}`);
  }
  return BIN;
}

export function runCobol(vectors = VECTORS) {
  const lines = [String(vectors.length)];
  for (const v of vectors) {
    lines.push(v.kind === "W" ? `W ${v.a} ${v.b}` : `I ${v.a} ${v.b} ${v.c}`);
  }
  const out = execFileSync(BIN, [], {
    input: lines.join("\n") + "\n",
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [numPart, status] = line.split("|");
      // COBOL prints 13 digits, a point, then always .00 in our
      // convention (digits are cents). Take the integer part.
      const cents = BigInt(numPart.split(".")[0]);
      return status ? { cents, status } : { cents };
    });
}

export function compare() {
  const got = runCobol();
  if (got.length !== VECTORS.length) {
    throw new Error(`cobol returned ${got.length} records, expected ${VECTORS.length}`);
  }
  const results = VECTORS.map((v, i) => {
    const want = expected(v);
    const have = got[i];
    const ok = want.cents === have.cents && (want.status ?? null) === (have.status ?? null);
    return { index: i, vector: v, want, have, ok };
  });
  return results;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  if (!hasCobc()) {
    if (process.env.COBOL_REQUIRE === "1") {
      console.error("cobc not installed and COBOL_REQUIRE=1");
      process.exit(1);
    }
    console.log("cobol-oracle: SKIP (cobc not installed)");
    process.exit(0);
  }
  build();
  const results = compare();
  const failed = results.filter((r) => !r.ok);

  if (process.argv.includes("--emit")) {
    const emitted = results.map((r) => ({
      kind: r.vector.kind,
      in: [r.vector.a, r.vector.b, r.vector.c]
        .filter((x) => x !== undefined)
        .map(String),
      cobol: r.have.status
        ? { cents: String(r.have.cents), status: r.have.status }
        : { cents: String(r.have.cents) },
      typescript: r.want.status
        ? { cents: String(r.want.cents), status: r.want.status }
        : { cents: String(r.want.cents) },
      match: r.ok,
    }));
    writeFileSync(
      VECTORS_FILE,
      JSON.stringify(
        {
          source: "src/cartridges/corebank.cbl",
          compiler: execFileSync("cobc", ["--version"], { encoding: "utf8" }).split("\n")[0].trim(),
          note: "Produced by the compiled COBOL program. Regenerate with: node harness/cobol-oracle.mjs --emit",
          vectors: emitted,
        },
        null,
        2
      ) + "\n"
    );
    console.log(`cobol-oracle: wrote ${emitted.length} vectors to ${VECTORS_FILE}`);
  }

  console.log(
    `cobol-oracle: ${results.length - failed.length}/${results.length} vectors match (${process.env.COBOL_REQUIRE === "1" ? "required" : "local"})`
  );
  for (const f of failed) {
    const label = f.index >= 0 ? JSON.stringify(f.vector) : "";
    console.error(`  MISMATCH ${label} cobol=${JSON.stringify(f.have)} ts=${JSON.stringify(f.want)}`);
  }
  process.exit(failed.length ? 1 : 0);
}

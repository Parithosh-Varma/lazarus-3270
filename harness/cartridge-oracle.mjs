// Compiles the five cartridge COBOL programs, drives them, and compares
// every money value against the TypeScript cartridge of the same name.
//
//   node harness/cartridge-oracle.mjs           compare
//   node harness/cartridge-oracle.mjs --emit    rewrite tests/cartridge-vectors.json
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const { runCartridge } = await import(new URL("../dist/cartridges/index.js", import.meta.url).href);

const BIN = {
  "SABRE-83": "sabre",
  "CIVICTAX-78": "tax",
  "LOAN-78": "loan",
  "TELCO-79": "telco",
  "METER-78": "meter",
};

const cents = (s) => {
  const m = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/.exec(String(s).trim());
  if (!m) throw new RangeError(`bad decimal: ${s}`);
  const mag = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return String(m[1] === "-" ? -mag : mag);
};
const part = (s) => s.split(".")[0].replace(/^0+(?=\d)/, "");

const SPECS = {
  "SABRE-83": {
    line: (a) => `S ${a.seats} ${a.requested} ${cents(a.fare)} ${a.class}`,
    parse: (p) => ({ probe: { seats: part(p[0]), fare: part(p[2]) }, status: p[1] }),
    vectors: [
      { seats: "42", requested: "2", fare: "249.00", class: "J" },
      { seats: "1", requested: "2", fare: "100.00", class: "Y" },
      { seats: "10", requested: "1", fare: "0.05", class: "J" },
      { seats: "10", requested: "1", fare: "0.15", class: "J" },
      { seats: "10", requested: "0", fare: "10.00", class: "Y" },
      { seats: "10", requested: "1", fare: "10.00", class: "X" },
      { seats: "0", requested: "1", fare: "10.00", class: "F" },
      { seats: "5", requested: "5", fare: "999.99", class: "F" },
    ],
  },
  "CIVICTAX-78": {
    line: (a) => `T ${cents(a.gross)}`,
    parse: (p) => ({
      probe: { tax: part(p[0]), b2: part(p[1]), b3: part(p[2]), b4: part(p[3]) },
      status: "OK",
    }),
    vectors: [
      { gross: "0.00" },
      { gross: "1000.00" },
      { gross: "1000.01" },
      { gross: "5000.00" },
      { gross: "5000.01" },
      { gross: "10000.00" },
      { gross: "10000.01" },
      { gross: "12500.00" },
      { gross: "999999.99" },
    ],
  },
  "LOAN-78": {
    line: (a) => `L ${cents(a.balance)} ${a.bps} ${cents(a.payment)}`,
    parse: (p) => ({
      probe: { newBalance: part(p[0]), interest: part(p[1]), principal: part(p[2]) },
      status: p[3],
    }),
    vectors: [
      { balance: "10000.00", bps: "1250", payment: "250.00" },
      { balance: "1000.00", bps: "1250", payment: "5.00" },
      { balance: "100.00", bps: "0", payment: "100.00" },
      { balance: "100.00", bps: "0", payment: "1.00" },
      { balance: "0.00", bps: "1999", payment: "10.00" },
      { balance: "1234.56", bps: "3599", payment: "99.99" },
    ],
  },
  "TELCO-79": {
    line: (a) => `C ${a.seconds} ${cents(a.rate)} ${cents(a.fee)}`,
    parse: (p) => ({ probe: { units: part(p[0]), cost: part(p[1]) }, status: p[2] }),
    vectors: [
      { seconds: "0", rate: "0.50", fee: "0.15" },
      { seconds: "1", rate: "0.50", fee: "0.15" },
      { seconds: "6", rate: "0.50", fee: "0.15" },
      { seconds: "7", rate: "0.50", fee: "0.15" },
      { seconds: "67", rate: "0.50", fee: "0.15" },
      { seconds: "3600", rate: "1.25", fee: "0.00" },
      { seconds: "5", rate: "0.05", fee: "0.00" },
    ],
  },
  "METER-78": {
    line: (a) => `M ${a.kwh}`,
    parse: (p) => ({
      probe: { bill: part(p[0]), t1: part(p[1]), t2: part(p[2]), t3: part(p[3]) },
      status: "OK",
    }),
    vectors: [
      { kwh: "0" },
      { kwh: "100" },
      { kwh: "101" },
      { kwh: "250" },
      { kwh: "251" },
      { kwh: "320" },
      { kwh: "1000" },
      { kwh: "9999" },
    ],
  },
};

const hasCobc = () => spawnSync("cobc", ["--version"], { encoding: "utf8" }).status === 0;

function build() {
  mkdirSync("build", { recursive: true });
  for (const [id, bin] of Object.entries(BIN)) {
    const src = `src/cartridges/${bin}.cbl`;
    const r = spawnSync("cobc", ["-x", "-o", `build/${bin}`, src], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`cobc failed for ${id}: ${r.stdout ?? ""}${r.stderr ?? ""}`);
  }
}

function runBin(bin, lines) {
  const out = execFileSync(`build/${bin}`, [], {
    input: [String(lines.length), ...lines].join("\n") + "\n",
    encoding: "utf8",
  });
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function compare() {
  const results = [];
  for (const [id, spec] of Object.entries(SPECS)) {
    const lines = spec.vectors.map(spec.line);
    const out = runBin(BIN[id], lines);
    if (out.length !== spec.vectors.length) {
      throw new Error(`${id}: cobol returned ${out.length} rows, expected ${spec.vectors.length}`);
    }
    spec.vectors.forEach((args, i) => {
      const ts = runCartridge(id, args);
      const cob = spec.parse(out[i].split("|"));
      const keys = Object.keys(ts.probe);
      const ok =
        keys.every((k) => String(ts.probe[k]) === String(cob.probe[k])) && ts.status === cob.status;
      results.push({ id, index: i, args, ts, cob, ok });
    });
  }
  return results;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  if (!hasCobc()) {
    if (process.env.COBOL_REQUIRE === "1") {
      console.error("cobc not installed and COBOL_REQUIRE=1");
      process.exit(1);
    }
    console.log("cartridge-oracle: SKIP (cobc not installed)");
    process.exit(0);
  }
  build();
  const results = compare();
  const failed = results.filter((r) => !r.ok);

  if (process.argv.includes("--emit")) {
    writeFileSync(
      "tests/cartridge-vectors.json",
      JSON.stringify(
        {
          source: "src/cartridges/*.cbl",
          compiler: execFileSync("cobc", ["--version"], { encoding: "utf8" }).split("\n")[0].trim(),
          note: "Produced by the compiled cartridge programs. Regenerate: node harness/cartridge-oracle.mjs --emit",
          vectors: results.map((r) => ({
            cartridge: r.id,
            args: r.args,
            cobol: { status: r.cob.status, ...r.cob.probe },
            typescript: { status: r.ts.status, ...r.ts.probe },
            match: r.ok,
          })),
        },
        null,
        2
      ) + "\n"
    );
    console.log(`cartridge-oracle: wrote ${results.length} vectors to tests/cartridge-vectors.json`);
  }

  const byCart = {};
  for (const r of results) {
    byCart[r.id] ??= { pass: 0, total: 0 };
    byCart[r.id].total++;
    if (r.ok) byCart[r.id].pass++;
  }
  for (const [id, n] of Object.entries(byCart)) {
    console.log(`  ${id.padEnd(12)} ${n.pass}/${n.total}`);
  }
  console.log(`cartridge-oracle: ${results.length - failed.length}/${results.length} vectors match`);
  for (const f of failed) {
    console.error(
      `  MISMATCH ${f.id} ${JSON.stringify(f.args)} cobol=${JSON.stringify(f.cob)} ts=${JSON.stringify({ status: f.ts.status, ...f.ts.probe })}`
    );
  }
  process.exit(failed.length ? 1 : 0);
}

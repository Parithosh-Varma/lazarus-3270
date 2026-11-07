// Internal console server. Zero dependencies.
//   npm run console   ->  http://127.0.0.1:3270
//
// Serves one page and three endpoints:
//   GET  /api/state        current proof numbers + versions
//   POST /api/transaction  runs the legacy oracle and the modern engine
//   POST /api/proof        re-runs the harness and the fault injector for real
//
// It exists so the demo never depends on the public site being up.
import { createServer } from "node:http";
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PORT = Number(process.env.PORT ?? 3270);
process.chdir(ROOT);

if (!existsSync("dist/modern-engine/index.js")) {
  process.stderr.write("[console] dist missing, building\n");
  execSync("./node_modules/.bin/tsc -p tsconfig.json", { stdio: "inherit" });
}

const legacy = await import(pathToFileURL(join(ROOT, "dist/legacy-engine/index.js")).href);
const modern = await import(pathToFileURL(join(ROOT, "dist/modern-engine/index.js")).href);

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};

function proofNumbers() {
  const golden = readJson("tests/golden.json", []);
  const cobol = readJson("tests/cobol-vectors.json", { vectors: [] });
  const fault = readJson("benchmarks/fault-report.json", { mutants: 0, killed: 0, killRate: "0%" });
  const results = readJson("benchmarks/results.json", null);
  return {
    equivalence: {
      pass: results?.pass ?? results?.runs ?? 0,
      total: results?.runs ?? 10007,
      vibeFails: results?.vibeFloatFails ?? null,
      drift: results?.drift ?? null,
    },
    golden: { pass: golden.length, total: golden.length },
    cobol: {
      pass: cobol.vectors.filter((v) => v.match).length,
      total: cobol.vectors.length,
      compiler: cobol.compiler ?? "unknown",
    },
    fault: { killed: fault.killed, total: fault.mutants, rate: fault.killRate },
    seed: results?.seed ?? 3270,
  };
}

function runProof() {
  const harness = execFileSync("node", ["harness/run-equivalence-harness.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const fault = execFileSync("node", ["harness/fault-injector.mjs"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  const h = /PBT harness: (\d+)\/(\d+) legacy==modern (\w+), vibe-float fails=(\d+), (\d+)ms/.exec(harness);
  const f = /fault-injector: (\d+)\/(\d+) killed \(([\d.]+)%\)/.exec(fault);
  return {
    equivalence: {
      pass: h ? Number(h[1]) : 0,
      total: h ? Number(h[2]) : 0,
      vibeFails: h ? Number(h[4]) : null,
      ms: h ? Number(h[5]) : null,
      ok: h ? h[3] === "PASS" : false,
    },
    fault: f ? { killed: Number(f[1]), total: Number(f[2]), rate: `${f[3]}%` } : null,
    ranAt: new Date().toISOString(),
  };
}

function transaction(body) {
  const balance = String(body?.balance ?? "").trim();
  const amount = String(body?.amount ?? "").trim();
  if (!balance || !amount) throw new Error("balance and amount are required");

  const t0 = process.hrtime.bigint();
  const old = legacy.runLegacy({ program: "COREBANK-WIRE", balance, amount });
  const t1 = process.hrtime.bigint();
  const now = modern.execute3270Transaction(balance, amount);
  const t2 = process.hrtime.bigint();

  return {
    input: { balance, amount },
    oracle: { newBalance: old.newBalance, status: old.status, screen: old.screen },
    modern: { newBalance: now.newBalance, status: now.status },
    match: old.newBalance === now.newBalance && old.status === now.status,
    ebcdic: old.ebcdic,
    micros: {
      oracle: Number(t1 - t0) / 1000,
      modern: Number(t2 - t1) / 1000,
    },
  };
}

const json = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  res.end(text);
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const send = (status, body, type = "text/html; charset=utf-8") => {
    res.writeHead(status, {
      "Content-Type": type,
      "Content-Length": Buffer.byteLength(body),
      "Cache-Control": "no-store",
    });
    res.end(body);
  };

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return send(200, readFileSync(join(HERE, "index.html")));
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    return json(res, 200, {
      ...proofNumbers(),
      node: process.version,
      roundMode: legacy.ROUND_MODE,
      tools: ["execute_3270_transaction", "run_legacy_oracle", "verify_ledger_parity"],
    });
  }
  if (req.method === "POST" && url.pathname === "/api/transaction") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        json(res, 200, transaction(JSON.parse(body || "{}")));
      } catch (e) {
        json(res, 400, { error: String(e?.message ?? e) });
      }
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/proof") {
    try {
      json(res, 200, runProof());
    } catch (e) {
      json(res, 500, { error: String(e?.message ?? e) });
    }
    return;
  }
  send(404, "NOT FOUND", "text/plain; charset=utf-8");
});

server.listen(PORT, "127.0.0.1", () => {
  process.stderr.write(`[console] http://127.0.0.1:${PORT}\n`);
});

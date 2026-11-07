import test from "node:test";
import assert from "node:assert/strict";
import { VECTORS, compare, hasCobc, build } from "../harness/cobol-oracle.mjs";

// This suite compiles src/cartridges/corebank.cbl with GnuCOBOL and runs
// the money path in actual COBOL. It is the independence layer: same
// inputs, different language, different compiler, different runtime.
const available = hasCobc();
let results = null;
if (available) {
  build();
  results = compare();
}

for (const [i, v] of VECTORS.entries()) {
  const label = v.kind === "W" ? `wire ${v.a}/${v.b}` : `interest ${v.a} @${v.b}bps ${v.c}d`;
  test(`cobol ${label}`, { skip: available ? false : "cobc not installed" }, () => {
    const r = results[i];
    assert.equal(String(r.have.cents), String(r.want.cents), "cents");
    assert.equal(r.have.status ?? null, r.want.status ?? null, "status");
  });
}

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { runCartridge, listCartridges } = await import(
  new URL("../dist/cartridges/index.js", import.meta.url).href
);

const vectors = JSON.parse(readFileSync(new URL("./cartridge-golden.json", import.meta.url)));

test("registry exposes five cartridges", () => {
  const ids = listCartridges().map((c) => c.id).sort();
  assert.deepEqual(ids, ["CIVICTAX-78", "LOAN-78", "METER-78", "SABRE-83", "TELCO-79"]);
});

test("unknown cartridge throws", () => {
  assert.throws(() => runCartridge("NOPE-00", {}), /unknown cartridge/);
});

for (const v of vectors) {
  test(`golden ${v.id}`, () => {
    const out = runCartridge(v.program, v.args);
    assert.equal(out.status, v.expect.status, "status");
    for (const [key, want] of Object.entries(v.expect.probe)) {
      assert.equal(out.probe[key], want, key);
    }
    assert.ok(out.screen.length > 0, "screen rendered");
    assert.ok(out.ebcdic.length > 0, "ebcdic encoded");
  });
}

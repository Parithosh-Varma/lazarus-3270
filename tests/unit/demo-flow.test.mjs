import test from "node:test";
import assert from "node:assert/strict";

import { Mainframe, ScreenBuffer } from "../../dist/emulator/index.js";
import { Operator } from "../../dist/crew/operator.js";
import { Translator } from "../../dist/crew/translator.js";
import { Auditor } from "../../dist/crew/auditor.js";
import { runTransfer, parseTransferRequest } from "../../dist/crew/transfer.js";

const DEMO = "884739201"; // Marcus Hale, $12,847.30, DORM-04, $500 hold

// ------------------------------------------------------------ emulator

test("emulator: buffer is always 24 rows x 80 cols", () => {
  const buf = new ScreenBuffer();
  buf.write(0, 75, "0123456789ABCDEF"); // overflows right edge
  buf.write(99, 0, "IGNORED"); // out-of-range row
  buf.write(-1, 0, "IGNORED");
  const lines = buf.render().split("\n");
  assert.equal(lines.length, 24);
  for (const line of lines) assert.equal(line.length, 80);
  assert.ok(lines[0].endsWith("01234"));
  assert.ok(!buf.render().includes("IGNORED"));
});

test("emulator: MENU -> ENTER -> INQUIRY shows summary but NOT holds", () => {
  const s = new Mainframe().createSession();
  s.typeAccount(DEMO);
  s.pressEnter();
  assert.equal(s.currentScreen, "INQUIRY");
  const f = s.screenFields();
  assert.equal(f.NAME, "Marcus Hale");
  assert.equal(f.BALANCE, "12847.30");
  assert.equal(f.STATUS, "DORM-04");
  assert.equal(f.TOTAL_HOLDS, undefined);
  assert.ok(!s.screenText().includes("500.00"));
});

test("emulator: PF5 reaches HOLDS screen with the $500 hold, PF7 returns", () => {
  const s = new Mainframe().createSession();
  s.typeAccount(DEMO);
  s.pressEnter();
  s.pressPf("PF5");
  assert.equal(s.currentScreen, "HOLDS");
  const f = s.screenFields();
  assert.equal(f.HOLD1_CODE, "HOLD-H");
  assert.equal(f.HOLD1_AMT, "500.00");
  assert.equal(f.TOTAL_HOLDS, "500.00");
  s.pressPf("PF7");
  assert.equal(s.currentScreen, "INQUIRY");
});

test("emulator: unknown account stays on MENU with explicit error", () => {
  const s = new Mainframe().createSession();
  s.typeAccount("999999999");
  s.pressEnter();
  assert.equal(s.currentScreen, "MENU");
  assert.match(s.getField("MESSAGE"), /NOT FOUND/);
});

test("emulator: sessions are independent", () => {
  const mf = new Mainframe();
  const a = mf.createSession();
  const b = mf.createSession();
  a.typeAccount(DEMO);
  a.pressEnter();
  assert.equal(a.currentScreen, "INQUIRY");
  assert.equal(b.currentScreen, "MENU");
});

test("emulator: dataset includes demo account plus at least two others", () => {
  const mf = new Mainframe();
  assert.ok(Object.keys(mf.accounts).length >= 3);
  assert.equal(mf.accounts[DEMO].name, "Marcus Hale");
  assert.equal(mf.accounts[DEMO].statusCode, "DORM-04");
});

// ------------------------------------------------------------ operator

test("operator: parses a plain-English request", () => {
  const op = new Operator(new Mainframe());
  assert.equal(op.parseRequest("Show me account 884739201"), DEMO);
  assert.equal(op.parseRequest("show me the money"), null);
});

test("operator: inquire returns raw record with the holds blind spot", () => {
  const raw = new Operator(new Mainframe()).inquire(DEMO);
  assert.equal(raw.name, "Marcus Hale");
  assert.equal(raw.balance, "12847.30");
  assert.equal(raw.balanceCents, 1284730n);
  assert.equal(raw.statusCode, "DORM-04");
  assert.equal(raw.holdsShown, null);
});

test("operator: malformed account id fails explicitly", () => {
  const op = new Operator(new Mainframe());
  assert.throws(() => op.inquire("ABC"), /malformed account id/);
  assert.throws(() => op.inquire(""), /malformed account id/);
});

test("operator: unknown account fails explicitly", () => {
  const op = new Operator(new Mainframe());
  assert.throws(() => op.inquire("999999999"), /NOT FOUND/);
  assert.throws(() => op.inquireByRequest("Show me account 999999999"), /NOT FOUND/);
  assert.throws(() => op.inquireByRequest("Show me the money"), /no account number/);
});

// ---------------------------------------------------------- translator

test("translator: known codes translate, incl. PF keys", () => {
  const tr = new Translator();
  assert.match(tr.translateCode("DORM-04"), /Dormant/);
  assert.match(tr.translateCode("HOLD-H"), /hold/i);
  assert.match(tr.translateCode("STAT Q"), /Queued/);
  assert.match(tr.translateCode("PF7"), /back/i);
});

test("translator: unknown code is reported, empty code throws", () => {
  const tr = new Translator();
  assert.match(tr.translateCode("ZZZ-99"), /Unknown code: ZZZ-99/);
  assert.throws(() => tr.translateCode(""), /no code supplied/);
  assert.throws(() => tr.translateCode("   "), /no code supplied/);
});

test("translator: record summary is plain English with formatted money", () => {
  const raw = new Operator(new Mainframe()).inquire(DEMO);
  const text = new Translator().summaryText(raw);
  assert.match(text, /Marcus Hale/);
  assert.match(text, /\$12,847\.30/);
  assert.match(text, /Dormant/);
});

// ------------------------------------------------------------- auditor

test("auditor: independent re-read finds hold, available = 12347.30", () => {
  const re = new Auditor(new Mainframe()).reread(DEMO);
  assert.equal(re.balance, "12847.30");
  assert.equal(re.totalHolds, "500.00");
  assert.equal(re.available, "12347.30");
  assert.equal(re.holds.length, 1);
  assert.equal(re.holds[0].code, "HOLD-H");
});

test("auditor: $13,000 refused, $1,000 approved", () => {
  const au = new Auditor(new Mainframe());
  assert.equal(au.audit(DEMO, "13000").decision, "REFUSED");
  assert.equal(au.audit(DEMO, "1000").decision, "APPROVED");
});

test("auditor edge: amount exactly equal to available is approved", () => {
  const v = new Auditor(new Mainframe()).audit(DEMO, "12347.30");
  assert.equal(v.decision, "APPROVED");
});

test("auditor edge: one cent above available is refused", () => {
  const v = new Auditor(new Mainframe()).audit(DEMO, "12347.31");
  assert.equal(v.decision, "REFUSED");
});

test("auditor edge: account with no holds — available equals balance, no conflict", () => {
  const au = new Auditor(new Mainframe());
  const re = au.reread("102938475"); // Elena Ruiz, $5,230.75, no holds
  assert.equal(re.totalHolds, "0.00");
  assert.equal(re.available, "5230.75");
  const v = au.audit("102938475", "5230.75");
  assert.equal(v.decision, "APPROVED");
  assert.equal(v.conflict, false);
  assert.equal(au.audit("102938475", "5230.76").decision, "REFUSED");
});

test("auditor edge: multiple holds are summed (Kenji Tanaka)", () => {
  const re = new Auditor(new Mainframe()).reread("675849302");
  assert.equal(re.totalHolds, "1350.00");
  assert.equal(re.available, "20750.00");
});

test("auditor: verdict shows BOTH reads and flags the conflict", () => {
  const mf = new Mainframe();
  const raw = new Operator(mf).inquire(DEMO);
  const v = new Auditor(mf).audit(DEMO, "13000", raw);
  assert.equal(v.conflict, true);
  assert.equal(v.firstRead.balance, "12847.30");
  assert.equal(v.firstRead.holdsSeen, null);
  assert.equal(v.firstRead.availableImplied, "12847.30");
  assert.equal(v.auditorRead.totalHolds, "500.00");
  assert.equal(v.auditorRead.available, "12347.30");
  assert.match(v.reason, /\$500\.00/);
});

test("auditor: unknown account and bad amounts fail explicitly", () => {
  const au = new Auditor(new Mainframe());
  assert.throws(() => au.audit("999999999", "100"), /NOT FOUND/);
  assert.throws(() => au.audit("12", "100"), /malformed account id/);
  assert.throws(() => au.audit(DEMO, "abc"), /bad amount/);
  assert.throws(() => au.audit(DEMO, ""), /no amount supplied/);
  assert.throws(() => au.audit(DEMO, "-5"), /negative transfer amount/);
});

// -------------------------------------------------------- transfer flow

test("flow: runTransfer refuses $13,000 with both reads, approves $1,000", () => {
  const refused = runTransfer(DEMO, "13000");
  assert.equal(refused.decision, "REFUSED");
  assert.equal(refused.translation.name, "Marcus Hale");
  assert.equal(refused.translation.balanceDisplay, "$12,847.30");
  assert.equal(refused.auditorRead.available, "12347.30");
  assert.match(refused.translationText, /Dormant/);

  const approved = runTransfer(DEMO, "1000");
  assert.equal(approved.decision, "APPROVED");
});

test("flow: parseTransferRequest extracts account and amount", () => {
  assert.deepEqual(parseTransferRequest("Transfer $13,000 from account 884739201"), {
    accountId: DEMO,
    amount: "13000",
  });
  assert.equal(parseTransferRequest("just chatting"), null);
  assert.equal(parseTransferRequest("Transfer $50 please"), null);
});

import { Mainframe } from "../emulator/index.js";
import { parseDecimalToCents, formatCents } from "../legacy-engine/index.js";
import { formatMoney } from "./format.js";
import type { RawRecord } from "./operator.js";

export interface HoldRead {
  code: string;
  amount: string;
  reason: string;
}

export interface AuditorReread {
  accountId: string;
  name: string;
  balance: string;
  balanceCents: bigint;
  totalHolds: string;
  totalHoldsCents: bigint;
  holds: HoldRead[];
  available: string;
  availableCents: bigint;
  screenText: string;
}

export interface Verdict {
  decision: "APPROVED" | "REFUSED";
  approved: boolean;
  accountId: string;
  amount: string;
  amountCents: bigint;
  firstRead: {
    balance: string;
    holdsSeen: null;
    availableImplied: string;
    source: string;
  };
  auditorRead: {
    balance: string;
    totalHolds: string;
    holds: HoldRead[];
    available: string;
    source: string;
  };
  conflict: boolean;
  reason: string;
}

const ACCOUNT_ID_RE = /^\d{6,12}$/;

/**
 * The Auditor: the proof-before-reporting enforcer. It never trusts
 * another agent's numbers. For every judgement it opens its OWN 3270
 * session, re-inquires, presses PF5 to reach the HOLDS screen (the
 * one the summary read never saw), computes
 * available = balance − total holds, and approves a transfer only
 * when amount ≤ available. The verdict carries both reads so a
 * conflict is visible, never hidden.
 */
export class Auditor {
  constructor(private readonly host: Mainframe = new Mainframe()) {}

  reread(accountId: string): AuditorReread {
    if (!ACCOUNT_ID_RE.test(String(accountId ?? ""))) {
      throw new Error(`malformed account id: ${JSON.stringify(accountId)} (expected 6-12 digits)`);
    }
    const session = this.host.createSession();
    session.typeAccount(String(accountId));
    session.pressEnter();
    if (session.currentScreen !== "INQUIRY") {
      throw new Error(session.getField("MESSAGE") ?? `account ${accountId} not found`);
    }
    const balanceCents = parseDecimalToCents(session.getField("BALANCE") ?? "0");
    session.pressPf("PF5");
    // TS narrows currentScreen to "INQUIRY" after the guard above;
    // read it as a plain string to check the post-PF5 state.
    const afterPf5: string = session.currentScreen;
    if (afterPf5 !== "HOLDS") throw new Error("auditor could not reach HOLDS screen");
    const hf = session.screenFields();
    const totalHoldsCents = parseDecimalToCents(hf.TOTAL_HOLDS ?? "0");
    const holds: HoldRead[] = [];
    for (let i = 1; hf[`HOLD${i}_AMT`] !== undefined; i++) {
      holds.push({
        code: hf[`HOLD${i}_CODE`] ?? "",
        amount: hf[`HOLD${i}_AMT`],
        reason: hf[`HOLD${i}_REASON`] ?? "",
      });
    }
    const availableCents = balanceCents - totalHoldsCents;
    return {
      accountId: String(accountId),
      name: session.getField("NAME") ?? "",
      balance: formatCents(balanceCents),
      balanceCents,
      totalHolds: formatCents(totalHoldsCents),
      totalHoldsCents,
      holds,
      available: formatCents(availableCents),
      availableCents,
      screenText: session.screenText(),
    };
  }

  audit(accountId: string, amount: string, firstRead?: RawRecord): Verdict {
    if (amount === null || amount === undefined || String(amount).trim() === "") {
      throw new Error("audit: no amount supplied");
    }
    // parseDecimalToCents throws RangeError on malformed amounts —
    // that explicit failure is intentional, do not swallow it.
    const amountCents = parseDecimalToCents(String(amount));
    if (amountCents < 0n) throw new RangeError(`negative transfer amount: ${amount}`);
    const re = this.reread(accountId);
    const approved = amountCents <= re.availableCents;
    const firstBalanceCents = firstRead ? firstRead.balanceCents : re.balanceCents;
    const conflict = firstBalanceCents !== re.availableCents;
    const reason = approved
      ? `Approved: ${formatMoney(amountCents)} is within the available ${formatMoney(re.availableCents)} (balance ${formatMoney(re.balanceCents)} minus holds ${formatMoney(re.totalHoldsCents)}).`
      : `Refused: ${formatMoney(amountCents)} exceeds the available ${formatMoney(re.availableCents)} (balance ${formatMoney(re.balanceCents)} minus holds ${formatMoney(re.totalHoldsCents)}).`;
    return {
      decision: approved ? "APPROVED" : "REFUSED",
      approved,
      accountId: String(accountId),
      amount: formatCents(amountCents),
      amountCents,
      firstRead: {
        balance: formatCents(firstBalanceCents),
        holdsSeen: null,
        availableImplied: formatCents(firstBalanceCents),
        source: firstRead
          ? "Operator first read of the summary screen"
          : "summary screen (HOLDS not consulted)",
      },
      auditorRead: {
        balance: re.balance,
        totalHolds: re.totalHolds,
        holds: re.holds,
        available: re.available,
        source: "Auditor independent re-read incl. HOLDS screen",
      },
      conflict,
      reason,
    };
  }
}

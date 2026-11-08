// Lazarus 3270 session emulator.
//
// The tn3270 spec models a single wire screen as strings. This module is
// the running terminal that sits next to it: a 24x80 screen buffer with
// named input/output fields, PF-key navigation, and an account dataset.
//
// Screens: MENU -> (type account, ENTER) -> INQUIRY -> (PF5) -> HOLDS.
// The INQUIRY summary deliberately does NOT show holds; holds live only
// on the HOLDS screen. That split is what makes a second, independent
// read necessary — see src/crew/agents.ts (the Auditor).
//
// Money follows the repo rule (steering: cobol-decimal-safety): strings
// at the boundary, BigInt cents inside, never float.

import { parseDecimalToCents, formatCents } from "../legacy-engine/index.js";

export const SCREEN_ROWS = 24;
export const SCREEN_COLS = 80;

export class ScreenBuffer {
  readonly rows = SCREEN_ROWS;
  readonly cols = SCREEN_COLS;
  private cells: string[][];

  constructor() {
    this.cells = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => " ")
    );
  }

  clear(): void {
    for (let r = 0; r < this.rows; r++) this.cells[r].fill(" ");
  }

  /** Writes are clipped: a row can never grow past 80 columns. */
  write(row: number, col: number, text: string): void {
    if (row < 0 || row >= this.rows) return;
    for (let i = 0; i < text.length; i++) {
      const c = col + i;
      if (c < 0) continue;
      if (c >= this.cols) break;
      this.cells[row][c] = text[i];
    }
  }

  readRow(row: number): string {
    return this.cells[row].join("");
  }

  render(): string {
    return this.cells.map((r) => r.join("")).join("\n");
  }
}

export interface FieldDef {
  name: string;
  row: number;
  col: number;
  length: number;
  kind: "input" | "output";
  value: string;
}

export interface Hold {
  code: string;
  amount: string; // decimal string, e.g. "500.00"
  amountCents: bigint;
  reason: string;
}

export interface AccountRecord {
  name: string;
  balance: string; // decimal string
  balanceCents: bigint;
  statusCode: string;
  holds: Hold[];
}

export interface AccountInput {
  name: string;
  balance: string;
  statusCode: string;
  holds: { code: string; amount: string; reason: string }[];
}

export const DEFAULT_ACCOUNTS: Record<string, AccountInput> = {
  "884739201": {
    name: "Marcus Hale",
    balance: "12847.30",
    statusCode: "DORM-04",
    holds: [{ code: "HOLD-H", amount: "500.00", reason: "Court-ordered hold" }],
  },
  "102938475": {
    name: "Elena Ruiz",
    balance: "5230.75",
    statusCode: "ACT-01",
    holds: [],
  },
  "675849302": {
    name: "Kenji Tanaka",
    balance: "22100.00",
    statusCode: "STAT Q",
    holds: [
      { code: "HOLD-H", amount: "1100.00", reason: "Pending cheque clearance" },
      { code: "HOLD-H", amount: "250.00", reason: "Card dispute reserve" },
    ],
  },
};

export class Mainframe {
  readonly accounts: Record<string, AccountRecord>;

  constructor(accounts: Record<string, AccountInput> = DEFAULT_ACCOUNTS) {
    this.accounts = {};
    for (const [id, rec] of Object.entries(accounts)) {
      this.accounts[id] = {
        name: rec.name,
        balance: rec.balance,
        balanceCents: parseDecimalToCents(rec.balance),
        statusCode: rec.statusCode,
        holds: rec.holds.map((h) => ({
          code: h.code,
          amount: h.amount,
          amountCents: parseDecimalToCents(h.amount),
          reason: h.reason,
        })),
      };
    }
  }

  createSession(): Session {
    return new Session(this);
  }
}

export type ScreenName = "MENU" | "INQUIRY" | "HOLDS";

export class Session {
  readonly buffer = new ScreenBuffer();
  currentScreen: ScreenName = "MENU";
  currentAccount: string | null = null;
  message = "";
  private fields = new Map<string, FieldDef>();

  constructor(private readonly host: Mainframe) {
    this.render();
  }

  private setFields(defs: FieldDef[]): void {
    this.fields = new Map(defs.map((f) => [f.name, f]));
    for (const f of defs) {
      this.buffer.write(f.row, f.col, f.value.slice(0, f.length));
    }
  }

  getField(name: string): string | undefined {
    return this.fields.get(name)?.value;
  }

  screenFields(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of this.fields) out[k] = v.value;
    return out;
  }

  screenText(): string {
    return this.buffer.render();
  }

  typeField(name: string, value: string): void {
    const f = this.fields.get(name);
    if (!f || f.kind !== "input") {
      throw new Error(`field ${name} is not an input field on ${this.currentScreen}`);
    }
    f.value = String(value).slice(0, f.length);
    this.buffer.write(f.row, f.col, f.value.padEnd(f.length, " "));
  }

  typeAccount(accountId: string): void {
    this.typeField("ACCT", accountId);
  }

  press(key: string): ScreenName {
    const k = key.toUpperCase();
    return k === "ENTER" || k === "" ? this.pressEnter() : this.pressPf(k);
  }

  pressEnter(): ScreenName {
    if (this.currentScreen === "MENU") {
      const acct = (this.getField("ACCT") ?? "").trim();
      if (!acct) this.message = "ERROR: NO ACCOUNT ENTERED";
      else if (!this.host.accounts[acct]) this.message = `ERROR: ACCOUNT ${acct} NOT FOUND`;
      else {
        this.currentAccount = acct;
        this.currentScreen = "INQUIRY";
        this.message = "";
      }
    }
    this.render();
    return this.currentScreen;
  }

  pressPf(key: string): ScreenName {
    const k = key.toUpperCase();
    if (k === "PF5" && this.currentScreen === "INQUIRY") {
      this.currentScreen = "HOLDS";
      this.message = "";
    } else if (k === "PF7" || k === "PF3") {
      if (this.currentScreen === "HOLDS") {
        this.currentScreen = k === "PF7" ? "INQUIRY" : "MENU";
      } else if (this.currentScreen === "INQUIRY") {
        this.currentScreen = "MENU";
      }
      if (this.currentScreen === "MENU") this.currentAccount = null;
      this.message = "";
    } else if (k === "PF1") {
      this.message = "HELP: TYPE ACCOUNT, ENTER=INQUIRE, PF5=HOLDS";
    } else {
      this.message = `KEY ${k} NOT ACTIVE ON ${this.currentScreen}`;
    }
    this.render();
    return this.currentScreen;
  }

  private render(): void {
    this.buffer.clear();
    if (this.currentScreen === "MENU") this.renderMenu();
    else if (this.currentScreen === "INQUIRY") this.renderInquiry();
    else this.renderHolds();
    if (this.message) this.buffer.write(22, 2, this.message);
  }

  private renderMenu(): void {
    this.buffer.write(1, 28, "LAZARUS BANKING SYSTEM");
    this.buffer.write(2, 28, "======================");
    this.buffer.write(4, 10, "ACCOUNT INQUIRY MENU");
    this.buffer.write(6, 10, "ENTER ACCOUNT NUMBER AND PRESS ENTER");
    this.buffer.write(8, 10, "ACCT >");
    this.buffer.write(20, 10, "PF1=HELP   PF3=EXIT   PF7=BACK");
    this.setFields([
      { name: "ACCT", row: 8, col: 17, length: 12, kind: "input", value: "" },
      { name: "MESSAGE", row: 22, col: 2, length: 70, kind: "output", value: this.message },
    ]);
  }

  private renderInquiry(): void {
    const rec = this.host.accounts[this.currentAccount!];
    this.buffer.write(1, 28, "ACCOUNT INQUIRY");
    for (const [label, row] of [["ACCT >", 3], ["NAME >", 4], ["BAL >", 5], ["STAT >", 6]] as const) {
      this.buffer.write(row, 10, label);
    }
    this.setFields([
      { name: "ACCT", row: 3, col: 17, length: 12, kind: "output", value: this.currentAccount! },
      { name: "NAME", row: 4, col: 17, length: 30, kind: "output", value: rec.name },
      { name: "BALANCE", row: 5, col: 17, length: 14, kind: "output", value: formatCents(rec.balanceCents) },
      { name: "STATUS", row: 6, col: 17, length: 10, kind: "output", value: rec.statusCode },
      { name: "MESSAGE", row: 22, col: 2, length: 70, kind: "output", value: this.message },
    ]);
    // NOTE: holds are intentionally NOT on this screen.
    this.buffer.write(20, 10, "PF5=HOLDS   PF7=BACK   PF3=MENU   PF1=HELP");
  }

  private renderHolds(): void {
    const rec = this.host.accounts[this.currentAccount!];
    this.buffer.write(1, 28, "ACCOUNT HOLDS");
    this.buffer.write(3, 10, "ACCT >");
    this.buffer.write(4, 10, "NAME >");
    const fields: FieldDef[] = [
      { name: "ACCT", row: 3, col: 17, length: 12, kind: "output", value: this.currentAccount! },
      { name: "NAME", row: 4, col: 17, length: 30, kind: "output", value: rec.name },
    ];
    let total = 0n;
    let row = 6;
    if (rec.holds.length === 0) {
      fields.push({ name: "NOHOLDS", row, col: 10, length: 30, kind: "output", value: "NO HOLDS ON THIS ACCOUNT" });
      row += 2;
    }
    rec.holds.forEach((h, i) => {
      total += h.amountCents;
      const n = i + 1;
      fields.push({ name: `HOLD${n}_CODE`, row, col: 10, length: 8, kind: "output", value: h.code });
      fields.push({ name: `HOLD${n}_AMT`, row, col: 19, length: 10, kind: "output", value: formatCents(h.amountCents) });
      fields.push({ name: `HOLD${n}_REASON`, row, col: 31, length: 40, kind: "output", value: h.reason });
      row += 1;
    });
    const totalRow = row + 1;
    fields.push({ name: "TOTAL_HOLDS", row: totalRow, col: 19, length: 10, kind: "output", value: formatCents(total) });
    fields.push({ name: "MESSAGE", row: 22, col: 2, length: 70, kind: "output", value: this.message });
    this.buffer.write(totalRow, 10, "TOTAL  >");
    this.setFields(fields);
    this.buffer.write(20, 10, "PF7=BACK   PF3=MENU   PF1=HELP");
  }
}

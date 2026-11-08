import { Mainframe } from "../emulator/index.js";
import { parseDecimalToCents } from "../legacy-engine/index.js";

export interface RawRecord {
  accountId: string;
  name: string;
  balance: string;
  balanceCents: bigint;
  statusCode: string;
  screen: string;
  fields: Record<string, string>;
  screenText: string;
  /** The summary screen shows no holds — this is the blind spot. */
  holdsShown: null;
}

/**
 * The Operator: parses plain-English requests and drives a 3270
 * session — types the account, presses Enter, returns the raw
 * INQUIRY screen fields. It reports what the terminal says and
 * nothing more; interpretation is the Translator's job.
 */
export class Operator {
  static readonly ACCOUNT_RE = /\b(\d{6,12})\b/;

  constructor(private readonly host: Mainframe = new Mainframe()) {}

  parseRequest(text: string): string | null {
    const m = Operator.ACCOUNT_RE.exec(String(text ?? ""));
    return m ? m[1] : null;
  }

  inquire(accountId: string): RawRecord {
    if (!/^\d{6,12}$/.test(String(accountId ?? ""))) {
      throw new Error(`malformed account id: ${JSON.stringify(accountId)} (expected 6-12 digits)`);
    }
    const session = this.host.createSession();
    session.typeAccount(String(accountId));
    session.pressEnter();
    if (session.currentScreen !== "INQUIRY") {
      throw new Error(session.getField("MESSAGE") ?? `account ${accountId} not found`);
    }
    const f = session.screenFields();
    return {
      accountId: String(accountId),
      name: f.NAME ?? "",
      balance: f.BALANCE ?? "0.00",
      balanceCents: parseDecimalToCents(f.BALANCE ?? "0"),
      statusCode: f.STATUS ?? "",
      screen: session.currentScreen,
      fields: f,
      screenText: session.screenText(),
      holdsShown: null,
    };
  }

  inquireByRequest(text: string): RawRecord {
    const id = this.parseRequest(text);
    if (!id) throw new Error(`no account number in request: ${JSON.stringify(text)}`);
    return this.inquire(id);
  }
}

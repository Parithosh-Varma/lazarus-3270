import type { RawRecord } from "./operator.js";
import { formatMoney } from "./format.js";

export const CODE_DICTIONARY: Record<string, string> = {
  "DORM-04": "Dormant account - no activity in 4 years",
  "DORM": "Dormant account",
  "HOLD-H": "A hold is sitting on this account",
  "HOLD": "A hold is sitting on this account",
  "STAT Q": "Queued for review before any transfer",
  "STAT-Q": "Queued for review before any transfer",
  "ACT-01": "Active account in good standing",
  "ACT": "Active account",
  "PF1": "Help key",
  "PF3": "Exit / back to menu key",
  "PF5": "View holds key",
  "PF7": "Go back key",
  "PF9": "Swap / next panel key",
  "PF12": "Cancel key",
};

export interface TranslatedRecord {
  accountId: string;
  name: string;
  balance: string;
  balanceDisplay: string;
  statusCode: string;
  statusPlain: string;
}

/**
 * The Translator: turns mainframe codes into plain English via an
 * explicit dictionary. Unknown codes are reported as unknown —
 * never guessed, never silently dropped.
 */
export class Translator {
  readonly dictionary = CODE_DICTIONARY;

  translateCode(code: string): string {
    if (code === null || code === undefined || String(code).trim() === "") {
      throw new Error("translateCode: no code supplied");
    }
    const key = String(code).trim().toUpperCase();
    return this.dictionary[key] ?? `Unknown code: ${code}`;
  }

  translate(raw: RawRecord): TranslatedRecord {
    return {
      accountId: raw.accountId,
      name: raw.name,
      balance: raw.balance,
      balanceDisplay: formatMoney(raw.balanceCents),
      statusCode: raw.statusCode,
      statusPlain: this.translateCode(raw.statusCode),
    };
  }

  summaryText(raw: RawRecord): string {
    const t = this.translate(raw);
    return `Account ${t.accountId} belongs to ${t.name}. Balance is ${t.balanceDisplay}. Status: ${t.statusPlain} (${t.statusCode}).`;
  }
}

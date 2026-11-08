import { Mainframe } from "../emulator/index.js";
import { Operator } from "./operator.js";
import { Translator } from "./translator.js";
import { Auditor } from "./auditor.js";

/**
 * The full demo flow, in order: Operator reads, Translator explains,
 * Auditor independently re-reads and decides. No step is optional —
 * in particular the transfer is judged on the Auditor's read, never
 * on the Operator's.
 */
export function runTransfer(accountId: string, amount: string, host: Mainframe = new Mainframe()) {
  const operator = new Operator(host);
  const translator = new Translator();
  const auditor = new Auditor(host);
  const raw = operator.inquire(accountId);
  const translation = translator.translate(raw);
  const verdict = auditor.audit(accountId, amount, raw);
  return {
    accountId: String(accountId),
    operatorRead: {
      name: raw.name,
      balance: raw.balance,
      statusCode: raw.statusCode,
      holdsShown: raw.holdsShown,
      screenText: raw.screenText,
    },
    translation,
    translationText: translator.summaryText(raw),
    firstRead: verdict.firstRead,
    auditorRead: verdict.auditorRead,
    decision: verdict.decision,
    approved: verdict.approved,
    conflict: verdict.conflict,
    reason: verdict.reason,
    amount: verdict.amount,
  };
}

/** "Transfer $13,000 from account 884739201" → { accountId, amount: "13000" }. */
export function parseTransferRequest(text: string): { accountId: string; amount: string } | null {
  const acct = Operator.ACCOUNT_RE.exec(String(text ?? ""));
  if (!acct) return null;
  const withoutAccount = String(text ?? "").replace(acct[0], " ");
  const amt = /\$?\s*([\d,]+(?:\.\d{1,2})?)/.exec(withoutAccount);
  if (!amt) return null;
  return { accountId: acct[1], amount: amt[1].replace(/,/g, "") };
}

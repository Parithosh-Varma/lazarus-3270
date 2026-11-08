// Barrel for the demo Crew. The three roles live in their own
// modules — operator.ts, translator.ts, auditor.ts — with the
// end-to-end flow composed in transfer.ts.
export { formatMoney } from "./format.js";
export { Operator } from "./operator.js";
export type { RawRecord } from "./operator.js";
export { Translator, CODE_DICTIONARY } from "./translator.js";
export type { TranslatedRecord } from "./translator.js";
export { Auditor } from "./auditor.js";
export type { HoldRead, AuditorReread, Verdict } from "./auditor.js";
export { runTransfer, parseTransferRequest } from "./transfer.js";

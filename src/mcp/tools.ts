import { runLegacy } from "../legacy-engine/index.js";
import { execute3270Transaction, verifyLedgerParity } from "../modern-engine/index.js";
import { listCartridges, runCartridge } from "../cartridges/index.js";
import { Mainframe } from "../emulator/index.js";
import { Operator } from "../crew/operator.js";
import { Translator } from "../crew/translator.js";
import { runTransfer } from "../crew/transfer.js";

const demoHost = new Mainframe();

export const tools = {
  execute_3270_transaction: ({ balance, amount }: { balance: string; amount: string }) =>
    execute3270Transaction(balance, amount),
  run_legacy_oracle: ({ balance, amount }: { balance: string; amount: string }) =>
    runLegacy({ program: "COREBANK-WIRE", balance, amount }),
  verify_ledger_parity: ({ debits, credits }: { debits: string[]; credits: string[] }) => {
    const toC = (s: string) => BigInt(Math.round(parseFloat(s) * 100));
    return { parity: verifyLedgerParity(debits.map(toC), credits.map(toC)) };
  },
  inquire_3270_account: ({ account }: { account: string }) => {
    const raw = new Operator(demoHost).inquire(account);
    const translator = new Translator();
    return {
      account: raw.accountId,
      name: raw.name,
      balance: raw.balance,
      statusCode: raw.statusCode,
      statusPlain: translator.translateCode(raw.statusCode),
      summary: translator.summaryText(raw),
      screen: raw.screenText,
      holdsShown: raw.holdsShown,
    };
  },
  audited_3270_transfer: ({ account, amount }: { account: string; amount: string }) =>
    runTransfer(account, amount, demoHost),
  list_cartridges: () => ({ cartridges: listCartridges() }),
  run_cartridge: ({ program, args }: { program: string; args?: Record<string, string> }) =>
    runCartridge(program, args ?? {}),
};

export function callTool(name: string, params: any) {
  const fn = (tools as any)[name];
  if (!fn) throw new Error(`unknown tool: ${name}`);
  return fn(params);
}

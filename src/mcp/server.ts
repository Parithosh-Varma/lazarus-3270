import { runLegacy } from "../legacy-engine/index.js";
import { execute3270Transaction, verifyLedgerParity } from "../modern-engine/index.js";

export const tools = {
  execute_3270_transaction: ({ balance, amount }: { balance: string; amount: string }) =>
    execute3270Transaction(balance, amount),
  run_legacy_oracle: ({ balance, amount }: { balance: string; amount: string }) =>
    runLegacy({ program: "COREBANK-WIRE", balance, amount }),
  verify_ledger_parity: ({ debits, credits }: { debits: string[]; credits: string[] }) => {
    const toC = (s: string) => BigInt(Math.round(parseFloat(s) * 100));
    return { parity: verifyLedgerParity(debits.map(toC), credits.map(toC)) };
  },
};

if (process.argv[1]?.endsWith("server.ts")) {
  console.error(JSON.stringify({ name: "lazarus-copybook-inspector", tools: Object.keys(tools) }));
}

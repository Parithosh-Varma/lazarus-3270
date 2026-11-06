import { legacyWireTransfer, legacyInterestCents, parseDecimalToCents, formatCents } from "../legacy-engine/index.js";

export function execute3270Transaction(balance: string, amount: string): { newBalance: string; status: string } {
  const r = legacyWireTransfer(parseDecimalToCents(balance), parseDecimalToCents(amount));
  return { newBalance: formatCents(r.newBalanceCents), status: r.status };
}

export function verifyLedgerParity(debitsCents: bigint[], creditsCents: bigint[]): boolean {
  const d = debitsCents.reduce((a, b) => a + b, 0n);
  const c = creditsCents.reduce((a, b) => a + b, 0n);
  return d === c;
}

export function modernInterest(principal: string, annualRateBps: number, days: number): string {
  const p = parseDecimalToCents(principal);
  const i = legacyInterestCents(p, annualRateBps, days);
  return formatCents(i);
}

export function vibeFloatWire(balance: number, amount: number, fee = 1.5): number {
  return balance + amount - fee;
}

// Honest strawman: same quantized daily rate as COBOL path, float math only.
// Returns { naive, stepped } so judges see float error, not rate-model error.
export function vibeFloatInterest(principalDollars: number, annualRateBps: number, days: number): { naive: number; stepped: number } {
  const daily = Math.round((annualRateBps / 365) * 100) / 1000000;
  let naive = principalDollars;
  for (let d = 0; d < days; d++) naive = naive * (1 + daily);
  let stepped = principalDollars;
  for (let d = 0; d < days; d++) stepped = Math.round(stepped * (1 + daily) * 100) / 100;
  return { naive, stepped };
}

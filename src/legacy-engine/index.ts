export const WIRE_FEE_CENTS = 150n;
export const RATE_SCALE = 1000000n;
export const ROUND_MODE = "NEAREST-EVEN";
export const MAX_COMP3_CENTS = 9999999999999n;

const AMOUNT_RE = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;
export function parseDecimalToCents(s: string): bigint {
  const m = AMOUNT_RE.exec(s.trim());
  if (!m) throw new RangeError(`bad amount: ${s}`);
  const mag = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
  return m[1] === "-" ? -mag : mag;
}

export function formatCents(c: bigint): string {
  const neg = c < 0n;
  const a = neg ? -c : c;
  const d = a / 100n;
  const f = (a % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${d.toString()}.${f}`;
}

export function roundHalfEven(num: bigint, den: bigint): bigint {
  if (den === 0n) throw new RangeError("division by zero");
  if (den < 0n) { num = -num; den = -den; }
  let q = num / den;
  const r = num % den;
  const twice = (r < 0n ? -r : r) * 2n;
  if (twice > den || (twice === den && (q & 1n) === 1n)) q += num < 0n ? -1n : 1n;
  return q;
}

export function assertFitsComp3(c: bigint): void {
  if (c > MAX_COMP3_CENTS || c < -MAX_COMP3_CENTS) throw new RangeError(`SIZE ERROR: ${c} exceeds PIC S9(11)V99`);
}

export interface WireResult {
  newBalanceCents: bigint;
  status: "OK" | "OVERDRAFT" | "SIZE_ERROR";
}

export function legacyWireTransfer(balanceCents: bigint, amountCents: bigint, feeCents = WIRE_FEE_CENTS): WireResult {
  if (amountCents < 0n) throw new RangeError("negative amount: use reversal flow");
  const nb = balanceCents + amountCents - feeCents;
  if (nb > MAX_COMP3_CENTS || nb < -MAX_COMP3_CENTS) return { newBalanceCents: balanceCents, status: "SIZE_ERROR" };
  if (nb < 0n) return { newBalanceCents: balanceCents, status: "OVERDRAFT" };
  return { newBalanceCents: nb, status: "OK" };
}

export function legacyInterestCents(principalCents: bigint, annualRateBps: number, days: number): bigint {
  if (!Number.isInteger(days) || days < 0 || days > 36500) throw new RangeError(`bad days: ${days}`);
  if (!Number.isFinite(annualRateBps) || annualRateBps < 0) throw new RangeError(`bad bps: ${annualRateBps}`);
  assertFitsComp3(principalCents);
  let p = principalCents;
  const daily = BigInt(Math.round((annualRateBps / 365) * 100));
  const num = RATE_SCALE + daily;
  for (let i = 0; i < days; i++) {
    p = roundHalfEven(p * num, RATE_SCALE);
    assertFitsComp3(p);
  }
  return p - principalCents;
}

// cp037. Unmapped -> SUB 0x3F (never silent space-shift).
const EBCDIC_MAP: Record<string, number> = {
  " ": 0x40, ".": 0x4b, ",": 0x6b, "$": 0x5b, "-": 0x60,
  "A": 0xc1, "B": 0xc2, "C": 0xc3, "D": 0xc4, "E": 0xc5,
  "F": 0xc6, "G": 0xc7, "H": 0xc8, "I": 0xc9,
  "J": 0xd1, "K": 0xd2, "L": 0xd3, "M": 0xd4, "N": 0xd5,
  "O": 0xd6, "P": 0xd7, "Q": 0xd8, "R": 0xd9,
  "S": 0xe2, "T": 0xe3, "U": 0xe4, "V": 0xe5, "W": 0xe6,
  "X": 0xe7, "Y": 0xe8, "Z": 0xe9,
  "0": 0xf0, "1": 0xf1, "2": 0xf2, "3": 0xf3, "4": 0xf4,
  "5": 0xf5, "6": 0xf6, "7": 0xf7, "8": 0xf8, "9": 0xf9,
};

const REVERSE = new Map(Object.entries(EBCDIC_MAP).map(([k, v]) => [v, k]));

export function encodeEBCDIC(s: string): number[] {
  return [...s.toUpperCase()].map((ch) => EBCDIC_MAP[ch] ?? 0x3f);
}

export function decodeEBCDIC(bytes: number[]): string {
  return bytes.map((b) => REVERSE.get(b) ?? " ").join("");
}

export interface LegacyTx {
  program: "COREBANK-WIRE";
  balance: string;
  amount: string;
}

export function runLegacy(tx: LegacyTx): { screen: string; newBalance: string; status: string; ebcdic: number[] } {
  const b = parseDecimalToCents(tx.balance);
  const a = parseDecimalToCents(tx.amount);
  const r = legacyWireTransfer(b, a);
  const screen = `COREBANK 3270 READY\nSEND $${formatCents(a)}\nBAL $${formatCents(r.newBalanceCents)} ${r.status}\nAID_ENTER`;
  return {
    screen,
    newBalance: formatCents(r.newBalanceCents),
    status: r.status,
    ebcdic: encodeEBCDIC(screen.slice(0, 64)),
  };
}

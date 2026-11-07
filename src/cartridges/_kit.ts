import {
  encodeEBCDIC,
  formatCents,
  parseDecimalToCents,
  roundHalfEven,
} from "../legacy-engine/index.js";

export { formatCents, parseDecimalToCents, roundHalfEven };

export interface CartridgeInput {
  name: string;
  label: string;
  value: string;
}

export interface CartridgeOutput {
  program: string;
  status: string;
  /** Display values, already formatted. */
  fields: Record<string, string>;
  /** Integer cents / counts, for cross-checking against the COBOL run. */
  probe: Record<string, string>;
  screen: string;
  ebcdic: number[];
}

export interface Cartridge {
  id: string;
  title: string;
  blurb: string;
  inputs: CartridgeInput[];
  run(args: Record<string, string>): CartridgeOutput;
}

export function emit(
  program: string,
  status: string,
  screen: string[],
  fields: Record<string, string>,
  probe: Record<string, string>
): CartridgeOutput {
  const text = screen.join("\n");
  return { program, status, fields, probe, screen: text, ebcdic: encodeEBCDIC(text.slice(0, 64)) };
}

export function intArg(args: Record<string, string>, key: string, label: string): number {
  const raw = (args[key] ?? "").trim();
  if (!/^-?\d+$/.test(raw)) throw new RangeError(`${label} must be a whole number`);
  const n = Number(raw);
  if (!Number.isSafeInteger(n)) throw new RangeError(`${label} is out of range`);
  return n;
}

export function centsArg(args: Record<string, string>, key: string, label: string): bigint {
  const raw = (args[key] ?? "").trim();
  if (!raw) throw new RangeError(`${label} is required`);
  return parseDecimalToCents(raw);
}

export function pct(bps: number, digits = 2): string {
  return (bps / 100).toFixed(digits) + "%";
}

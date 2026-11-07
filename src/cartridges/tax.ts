import { centsArg, emit, formatCents, roundHalfEven } from "./_kit.js";
import type { Cartridge } from "./_kit.js";

// Monthly withholding, four progressive brackets. Each bracket's tax is
// rounded separately, which is where the pennies actually go wrong.
const slice = (gross: bigint, lo: bigint, hi: bigint | null): bigint => {
  if (gross <= lo) return 0n;
  if (hi === null) return gross - lo;
  return gross < hi ? gross - lo : hi - lo;
};

export const taxFor = (gross: bigint): { tax: bigint; b2: bigint; b3: bigint; b4: bigint } => {
  const b2 = slice(gross, 100000n, 500000n);
  const b3 = slice(gross, 500000n, 1000000n);
  const b4 = slice(gross, 1000000n, null);
  const tax = roundHalfEven(b2 * 12n, 100n) + roundHalfEven(b3 * 22n, 100n) + roundHalfEven(b4 * 32n, 100n);
  return { tax, b2, b3, b4 };
};

export const civicTax: Cartridge = {
  id: "CIVICTAX-78",
  title: "Progressive payroll withholding",
  blurb: "Four brackets, each rounded on its own. Ties go to even.",
  inputs: [{ name: "gross", label: "GROSS PAY", value: "12500.00" }],
  run(args) {
    const gross = centsArg(args, "gross", "gross pay");
    if (gross < 0n) throw new RangeError("gross pay cannot be negative");
    const { tax, b2, b3, b4 } = taxFor(gross);

    return emit(
      "CIVICTAX-78",
      "OK",
      [
        "CIVICTAX-78 PAYROLL WITHHOLDING",
        `GROSS $${formatCents(gross)}`,
        `BRACKETS ${formatCents(b2)} 12% · ${formatCents(b3)} 22% · ${formatCents(b4)} 32%`,
        `TAX $${formatCents(tax)}`,
        "AID_ENTER",
      ],
      { gross: formatCents(gross), tax: formatCents(tax) },
      { tax: String(tax), b2: String(b2), b3: String(b3), b4: String(b4) }
    );
  },
};

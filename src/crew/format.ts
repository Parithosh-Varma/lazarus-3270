import { formatCents } from "../legacy-engine/index.js";

/** "$12,847.30" style display for a BigInt cent amount. */
export function formatMoney(cents: bigint): string {
  const raw = formatCents(cents);
  const neg = raw.startsWith("-");
  const [dollars, frac] = (neg ? raw.slice(1) : raw).split(".");
  const grouped = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}$${grouped}.${frac}`;
}

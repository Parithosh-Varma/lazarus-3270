import { civicTax } from "./tax.js";
import { loan } from "./loan.js";
import { meter } from "./meter.js";
import { sabre } from "./sabre.js";
import { telco } from "./telco.js";
import type { Cartridge, CartridgeOutput } from "./_kit.js";

export const cartridges: Record<string, Cartridge> = {
  [sabre.id]: sabre,
  [civicTax.id]: civicTax,
  [loan.id]: loan,
  [telco.id]: telco,
  [meter.id]: meter,
};

export const CARTRIDGE_IDS = Object.keys(cartridges);

export interface CartridgeInfo {
  id: string;
  title: string;
  blurb: string;
  inputs: Cartridge["inputs"];
}

export function listCartridges(): CartridgeInfo[] {
  return CARTRIDGE_IDS.map((id) => {
    const { id: pid, title, blurb, inputs } = cartridges[id];
    return { id: pid, title, blurb, inputs };
  });
}

export function runCartridge(program: string, args: Record<string, string> = {}): CartridgeOutput {
  const cartridge = cartridges[program];
  if (!cartridge) {
    throw new RangeError(`unknown cartridge: ${program} (have ${CARTRIDGE_IDS.join(", ")})`);
  }
  return cartridge.run(args);
}

export type { Cartridge, CartridgeOutput };

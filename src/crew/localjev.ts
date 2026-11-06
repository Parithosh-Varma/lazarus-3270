export const LOCALJEV_URL = "https://brainrot-jev.parithosh.workers.dev";
export const LOCALJEV_MODEL = "localjev-latest";

function apiKey(): string | undefined {
  const k = (globalThis as any).process?.env?.LOCALJEV_API_KEY as string | undefined;
  return k?.trim() ? k.trim() : undefined;
}

export async function localjevGenerate(text: string, maxChars = 2000, seed = 3270): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = apiKey();
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${LOCALJEV_URL}/v1/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, maxChars, seed }),
  });
  if (!res.ok) throw new Error(`localjev ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text: string };
  if (!data.text?.trim()) throw new Error("localjev empty reply");
  return data.text;
}

export async function archaeologistDraft(copybook: string): Promise<string> {
  return localjevGenerate(
    `You are Archaeologist. Read this COBOL copybook and write 5 EARS rules (WHEN/THE SYSTEM SHALL) for CoreBank wire with $1.50 fee, OVERDRAFT keeps old, SIZE_ERROR on overflow, NEAREST-EVEN rounding.\n\n${copybook}`.slice(0, 8000),
    2000,
    3270
  );
}

export async function alchemistDraft(ears: string): Promise<string> {
  return localjevGenerate(
    `You are Alchemist. Given these EARS rules, sketch TypeScript BigInt signatures for legacyWireTransfer + execute3270Transaction. No floats for money.\n\n${ears}`.slice(0, 8000),
    2000,
    3271
  );
}

export async function inquisitorDraft(spec: string): Promise<string> {
  return localjevGenerate(
    `You are Inquisitor. Given this spec, list 10 adversarial fast-check cases: fee boundaries 149/150/151, max COMP-3, overdraft, negative, zero days, 36500 days.\n\n${spec}`.slice(0, 8000),
    2000,
    3272
  );
}

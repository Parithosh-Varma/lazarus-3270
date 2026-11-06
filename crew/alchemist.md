# Alchemist-Agent (Builder) — planned, no LLM calls yet

Role: Read EARS spec + `cobol-decimal-safety.md` steering. Emit TypeScript BigInt services + MCP bindings in `src/modern-engine/`.

Inputs: requirements.md, steering.
Outputs: modern-engine TS, MCP server.ts.
Auth: same 1 shared key as Archaeologist (no separate keys needed).
Status: modern engine currently hand-written deterministic math. LLM emit TODO.

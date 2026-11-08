# Translator-Agent (Voice) — implemented, deterministic code, no LLM

Role: Turn mainframe codes into plain English via the explicit dictionary in `src/crew/translator.ts` (DORM-04, HOLD-H, STAT Q, ACT-01, PF keys) and render a readable summary of a raw record.

Inputs: a raw record from the Operator, or a single code.
Outputs: plain-English status and summary text. Unknown codes are reported as unknown — never guessed; an empty code throws.
Status: implemented in `src/crew/translator.ts`, unit-tested in `tests/unit/demo-flow.test.mjs`.

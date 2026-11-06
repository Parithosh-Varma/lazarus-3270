# Inquisitor-Agent (Breaker) — planned, no LLM calls yet

Role: Read spec + modern code. Write fast-check arbitraries (bigInt, boundaries 149/150/151, max COMP-3, overdraft, leap ranges) to `tests/pbt/`.

Inputs: spec, modern code.
Outputs: *.pbt.mjs files + shrink examples.
Auth: same 1 shared key. 3 roles, 1 credential, different system prompts.
Status: PBT currently hand-written (wire/interest/ebcdic). LLM generation TODO.

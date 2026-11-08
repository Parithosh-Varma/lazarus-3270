# Operator-Agent (Hands) — implemented, deterministic code, no LLM

Role: Parse plain-English requests ("Show me account 884739201"), drive a 3270 session in `src/emulator/` — type the account, press ENTER — and return the raw INQUIRY screen fields, including the honest blind spot: the summary screen shows no holds.

Inputs: request text or an account id.
Outputs: raw record (name, balance string, status code, screen text).
Status: implemented in `src/crew/operator.ts`, unit-tested in `tests/unit/demo-flow.test.mjs`. It never interprets or judges; that is the Translator's and Auditor's work.

# Archaeologist-Agent (Finder) — planned, no LLM calls yet

Role: Read `src/cartridges/*.cpy` via MCP `run_legacy_oracle` + `inspect_ebcdic_memory`. Output EARS rules to `.kiro/specs/*/requirements.md`.

Inputs: .cpy path, sample balances.
Outputs: requirements.md rules + golden traces.
Auth: 1 shared key only (Kiro credits OR ANTHROPIC_API_KEY in .env, never committed). All 3 agents share it, different prompts.
Status: definition in `.kiro/agents/archaeologist-agent.yaml`. Runtime wiring TODO.

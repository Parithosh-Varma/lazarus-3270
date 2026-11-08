# lazarus-resurrection-demo tasks

- [x] 1. Session emulator (`src/emulator/index.ts`): 24×80 buffer, named fields, MENU/INQUIRY/HOLDS, PF keys, dataset incl. 884739201
- [x] 2. Crew modules (`src/crew/operator.ts`, `translator.ts`, `auditor.ts`, `transfer.ts`, `format.ts`)
- [x] 3. Unit tests (`tests/unit/demo-flow.test.mjs`): emulator, each role in isolation, auditor edges (=available, +1 cent, no holds, multi-hold, unknown account, malformed input)
- [x] 4. Property test (`tests/pbt/auditor.pbt.mjs`): real Auditor vs random balances/holds/amounts — approves iff amount ≤ available
- [x] 5. Surfaces: console `/demo` + `/api/account/:id` + `/api/transfer`; MCP `inquire_3270_account` + `audited_3270_transfer`
- [ ] 6. Record the under-3-minute submission video against the live `/demo` page (teammate task, unchanged)

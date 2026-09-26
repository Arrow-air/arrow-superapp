# Connected delivery examples

2026-09-26 · additive example pack `delivery-examples-2026-09-v1`.

## What appears in Spearhead

- **11 additional discussions**, including one source-linked follow-up, an unfinished draft, a rejected idea, a conclusion without design change, and a deferred next-version discussion.
- **6 adopted decision records** (one subsequently replaced), preserving the original wingspan decision and all original open discussions.
- **4 readable subsystem specifications**: avionics, airframe, power and software. Airframe combines two source decisions; avionics has two specification revisions and an explicit replacement decision.
- **10 work packages**: 5 grants, 5 bounties. Stages: 1 draft, 2 open, 3 in progress, 1 in review, 2 completed, 1 cancelled. Budgets, owners, dates, optional milestones, result evidence and activity histories are populated.

All people, engineering outcomes, budgets and payments are fictional. Dates describe a fixed September 2026 sample history, not live project status. Evidence is embedded illustrative text, not fake links to nonexistent engineering files. No money moves.

## Useful walkthroughs

1. **Connector lesson:** Work → Glove-on harness fit check → its follow-up discussion → Physically key incompatible harness interfaces. Read the replaced common-shell decision and the avionics specification’s earlier revision. The test task succeeded by identifying a problem; it did not prove the initial design safe. Revised harness implementation is in progress; its assembly-guide review awaits acceptance.
2. **Review work:** Work → Review the keyed connector assembly guide. As Omar, inspect the submitted evidence, accept its milestone, choose Completed and save a review note. It remains funded, not automatically paid.
3. **A specification from multiple discussions:** Design → airframe. Trace retention requirements and transport support back to their separate conversations. The cradle bounty links both decisions.
4. **Complete is not paid:** Wing retention drawing and inspection pack is accepted but still funded/unpaid. The fit-check bounty separately records a fictional reported payment.
5. **Research before design:** Compare fuel-level sensing approaches has an owner, budget, scope and acceptance criteria, but no adopted decision. Its recorded outcome keeps the unanswered question.
6. **Not everything becomes a specification:** History includes the declined sealed enclosure and confirmation of SI units. Camera vibration has an editable draft; the fleet dashboard is deferred to the next editable version when one exists.

## Existing browsers

Production demo construction opts into the sample pack. The minimal `seedState()` and default test backend remain small deterministic fixtures; sample-mode tests exercise the exact enabled upgrade path.

The first load appends missing, namespaced records and persists a pack marker. It never overwrites existing threads, decisions, grants, persona selection, projects or version states. An existing specification at the same project/version/subsystem wins over the sample document. Later loads do not reinstall examples, so edits and deletions persist. Reset demo data intentionally restores the enriched demo.

Samples go into the earliest discussing/planned Spearhead version; nothing is added to a frozen/building baseline. If every version is locked, the pack is skipped. A deferred example is added only if there is a later editable version. A saved specification collision or edited version state can therefore change the visible counts.

## Verification and delivery

- Typecheck/build and 115 unit tests pass, including 11 new sample integrity and additive-upgrade cases.
- 37 new browser checks cover the populated default, source traceability, all work stages, acceptance, mobile layout, edit persistence and upgrading an existing edited browser store.
- 31 conversation + 53 Design/Work browser regressions pass against their intentionally minimal fixtures in isolated browser contexts. No user browser storage is reset by test setup.
- Screenshots: `/tmp/arrow-samples-review/`; desktop and phone layouts visually inspected.
- Both user addresses, **http://10.3.10.123:4186/** and **http://10.3.10.123:4187/**, serve `dist-samples`. Previous `dist-records` is preserved. Staging uses :4189.
- Build: `npm run build -- --outDir dist-samples`.
- Preview: `node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4186 --strictPort --outDir dist-samples` (same for 4187).
- Logs: `/tmp/arrow-samples-preview-4186.log`, `/tmp/arrow-samples-preview-4187.log`.
- Existing tabs should refresh once. **No reset needed.**

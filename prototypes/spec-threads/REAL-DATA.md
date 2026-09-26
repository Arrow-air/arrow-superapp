# Real Spearhead snapshot

Imported 2026-09-26 for Thomas's local prototype review. This is a **read-only,
source-backed project snapshot**, not a live Discord/GitHub integration. The
interactive fictional sandbox remains independently available, with its original
localStorage key and edits untouched.

## Evidence

- Project repository pinned at `e19da0485eec22891dc9027828713faa40bc6732`
  (main, 2026-07-21); electrical master Rev 0.19 and architecture note Rev 4
  are dated 2026-06-26, not September as-built records.
- Vector's public project wiki read at HEAD
  `9138b7d9ca0c7f6844a2278cb782637566b9a017`.
  September 15/21/22/25 and August 27 sections were used.
- Original Arrow HearHear transcripts corroborate the summaries. Source-message
  links, not expiring attachment URLs, are stored on each imported source.
- Spot-checked original passages: Sep25 tail layout, regulator alternatives,
  separate pusher battery agreement, charging uncertainty, aero-data format;
  Sep22 14S3P/19.5 Ah/~4 kg/AS150U discussion; Sep21 GPS recovery and wing-on
  flight; Aug27 measured connector mismatch.
- Full call transcripts are **not** copied into the app or repository. Personal
  conversation and unrelated project material are excluded.
- Vector was asked for a fresh supplemental packet in Arrow #agent-exchange
  (request message 1553496095257137235). Import updates should be reconciled,
  not automatically promoted to accepted design.
- Atlas was also asked (1553499096344690791). He requires Alperen's approval
  before sharing his private-side information; none is included here.

## Representation

`src/data/spearheadReal.ts` contains the curated snapshot. The schema in
`src/lib/sourcedProject.ts` deliberately does not pretend meeting statements are
app events. Every record has evidence dates, sources, scope, status caveats, and
links to related records.

- **Documented design:** dated repository engineering baseline.
- **Agreed on call:** explicit agreement in a dated call/meeting note, not an
  application approval or a released schematic.
- **Reported direction / in progress / planned:** the source's report, not a
  fabricated assignment or a subsequently verified completion.
- **Proposal / open question:** unresolved discussion.
- **Reported complete:** reported activity/result, not formal acceptance.
- **Historical reference:** older approach or uncertainty, separate from the
  default design view.

PT1 includes the PT1.5 transition-test configuration; PT2 is kept separate.
Project phases are not treated as prototype version numbers. No freeze dates,
votes, token balances, grant budgets, funding, or payment events are invented.
The estimated Longshot mass is explicitly not a measured result. The recovered
Here4 symptom is not confused with a resolved root cause. Payload coverage is
marked partial rather than filled with fictional work.

## Preview modes

Build for the real snapshot:

```sh
VITE_PROJECT_DATA=spearhead npm run build -- --outDir dist-real
node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4186 --strictPort --outDir dist-real
```

- Real data: `http://10.3.10.123:4186/#/p/spearhead`
- Legacy interactive sandbox: `http://10.3.10.123:4186/?dataset=examples#/p/spearhead`
- Same modes on port 4187. Staging port: 4192.
- Existing `arrow-spec-threads-demo-v2` localStorage remains byte-for-byte
  untouched in real-data mode. No destructive migration or reset.
- The real-data mode must not trigger sample installers or backend mutations.
- Without `VITE_PROJECT_DATA=spearhead`, the normal app remains the original
  interactive prototype. Production/Supabase behavior is not switched by this work.

## Verification

```sh
npm run typecheck
npm run test
BASE_URL=http://10.3.10.123:4192/ node e2e/real-data.cjs
BASE_URL='http://10.3.10.123:4192/?dataset=examples' node e2e/briefing.cjs
```

The real-data suite covers source navigation, linked records, conservative status
labels, version/system filters, design history, honest coverage gaps, old
fictional deep links, keyboard activation, responsive layouts, and retention of
saved sandbox state. Run browser checks in isolated contexts, never the user's
tab. Screenshots: `/tmp/spearhead-real-review/`.

## Delivered preview (2026-09-26)

- Both 4186 and 4187 serve `dist-real`; previous `dist-systems` is retained.
- Listener PIDs: 78338 (4186), 78341 (4187); staging 76597 (4192).
- Logs: `/tmp/arrow-real-preview-<port>.log`.
- 124 unit tests, typecheck/build, 50 real-data browser checks, and 46 legacy
  briefing checks pass. Both LAN origins additionally verified by fetching their
  actual HTML/assets and navigating agreement → open charging question in Chrome.
- No remote push, production deployment, or changes to original project sources.
